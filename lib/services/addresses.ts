import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    serverTimestamp,
    writeBatch,
    increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logActivity } from '@/lib/services/audit_logs';

const TABLE = 'addresses';

export async function getAddresses(congregationId: string, cityId?: string | null, territoryId?: string | null) {
    try {
        let q = query(
            collection(db, TABLE),
            where('congregationId', '==', congregationId)
        );

        if (cityId) {
            q = query(q, where('cityId', '==', cityId));
        }

        if (territoryId) {
            q = query(q, where('territoryId', '==', territoryId));
        }

        const snapshot = await getDocs(q);
        const addresses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        return { success: true, addresses };
    } catch (error: any) {
        console.error('Error fetching addresses:', error);
        return { success: false, error: error.message };
    }
}

export const VALID_VISIT_STATUSES = ['none', 'contacted', 'partial', 'notContacted', 'moved', 'doNotVisit', 'contested'] as const;

export async function saveAddress(id: string | null, data: any) {
    try {
        if (!data.street || !data.street.trim()) {
            throw new Error('street (Logradouro/Rua) do endereço é obrigatório.');
        }
        if (data.number === undefined || data.number === null) {
            throw new Error('number (Número) do endereço é obrigatório.');
        }
        if (!data.congregationId || !data.congregationId.trim()) {
            throw new Error('congregationId é obrigatório para o endereço.');
        }
        if (data.visitStatus && !VALID_VISIT_STATUSES.includes(data.visitStatus as any)) {
            throw new Error(`visitStatus inválido: "${data.visitStatus}". Use: ${VALID_VISIT_STATUSES.join(', ')}`);
        }

        if (id) {
            // 1. Edição: busca o registro atual para detectar mudança em isActive
            const oldSnap = await getDoc(doc(db, TABLE, id));
            if (!oldSnap.exists()) {
                throw new Error('Endereço não encontrado');
            }
            const oldData = oldSnap.data();
            const wasActive = oldData.isActive !== false;
            const isActive = data.isActive !== false;

            const batch = writeBatch(db);
            const addressRef = doc(db, TABLE, id);

            batch.update(addressRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });

            // Se o status de atividade mudou, ajusta a contagem de endereços ativos no bairro
            if (wasActive !== isActive && data.cityId) {
                const cityRef = doc(db, 'cities', data.cityId);
                batch.set(cityRef, {
                    stats: {
                        totalAddresses: increment(isActive ? 1 : -1)
                    }
                }, { merge: true });
            }

            const changes: string[] = [];
            Object.keys(data).forEach(key => {
                if (key === 'updatedAt') return;
                let oldVal = oldData[key];
                let newVal = data[key];

                // Se for campo de data (inactivatedAt/createdAt), converte ambos para string formatada pt-BR
                if (key === 'inactivatedAt') {
                    const formatVal = (v: any) => {
                        if (v === null || v === undefined || v === '') return '';
                        if (v?.toDate && typeof v.toDate === 'function') {
                            return v.toDate().toLocaleString('pt-BR');
                        }
                        if (typeof v === 'string') {
                            const d = new Date(v);
                            return isNaN(d.getTime()) ? v : d.toLocaleString('pt-BR');
                        }
                        if (typeof v === 'number') {
                            return new Date(v).toLocaleString('pt-BR');
                        }
                        return '';
                    };
                    oldVal = formatVal(oldVal);
                    newVal = formatVal(newVal);
                }

                const strOld = oldVal === null || oldVal === undefined ? '' : String(oldVal);
                const strNew = newVal === null || newVal === undefined ? '' : String(newVal);

                if (strOld !== strNew) {
                    changes.push(`${key}: "${strOld || 'Vazio'}" -> "${strNew || 'Vazio'}"`);
                }
            });

            await batch.commit();

            const diffText = changes.length > 0 ? changes.join(' | ') : 'Nenhuma alteração de valor detectada';

            logActivity({
                level: 'SUCCESS',
                category: 'TERRITORY',
                action: 'ADDRESS_UPDATE',
                message: `ADDRESS_UPDATE: Endereço "${data.street || oldData.street || ''}, ${data.number || oldData.number || ''}" atualizado`,
                congregationId: data.congregationId || oldData.congregationId,
                details: `Alterações: [${diffText}] | CityID: ${data.cityId || oldData.cityId || ''}`
            });

            return { success: true, id };
        } else {
            // 2. Criação
            const batch = writeBatch(db);
            const newAddressRef = doc(collection(db, TABLE));

            // Endereço novo é criado ativo por padrão
            batch.set(newAddressRef, {
                ...data,
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Incrementa stats.totalAddresses no bairro
            if (data.cityId) {
                const cityRef = doc(db, 'cities', data.cityId);
                batch.set(cityRef, {
                    stats: {
                        totalAddresses: increment(1)
                    }
                }, { merge: true });
            }

            await batch.commit();

            logActivity({
                level: 'SUCCESS',
                category: 'TERRITORY',
                action: 'ADDRESS_CREATE',
                message: `ADDRESS_CREATE: Adicionado novo endereço "${data.street || ''}, ${data.number || ''}"`,
                congregationId: data.congregationId,
                details: `CityID: ${data.cityId || ''} | Bairro: ${data.neighborhood || ''}`
            });

            return { success: true, id: newAddressRef.id };
        }
    } catch (error: any) {
        console.error('Error saving address:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteAddress(id: string) {
    try {
        // 1. Busca prévia do endereço para obter cityId e status isActive
        const addrSnap = await getDoc(doc(db, TABLE, id));
        if (!addrSnap.exists()) {
            throw new Error('Endereço não encontrado');
        }
        const addrData = addrSnap.data();
        const cityId = addrData.cityId;
        const isActive = addrData.isActive !== false;

        const batch = writeBatch(db);

        // Deleta o documento do endereço
        batch.delete(doc(db, TABLE, id));

        // Se o endereço estava ativo, decrementa o stats.totalAddresses no bairro correspondente
        if (isActive && cityId) {
            const cityRef = doc(db, 'cities', cityId);
            batch.set(cityRef, {
                stats: {
                    totalAddresses: increment(-1)
                }
            }, { merge: true });
        }

        await batch.commit();

        logActivity({
            level: 'WARN',
            category: 'TERRITORY',
            action: 'ADDRESS_DELETE',
            message: `ADDRESS_DELETE: Endereço "${addrData.street || ''}, ${addrData.number || ''}" excluído`,
            congregationId: addrData.congregationId,
            details: `ID: ${id} | CityID: ${cityId || ''}`
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting address:', error);
        return { success: false, error: error.message };
    }
}
