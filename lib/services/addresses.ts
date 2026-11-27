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
import { sanitizeUrl } from '@/lib/validation';

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
        if (!id) {
            if (!data.street || !String(data.street).trim()) {
                throw new Error('street (Logradouro/Rua) do endereço é obrigatório.');
            }
            if (!data.congregationId || !String(data.congregationId).trim()) {
                throw new Error('congregationId é obrigatório para o endereço.');
            }
        } else {
            if (data.street !== undefined && !String(data.street).trim()) {
                throw new Error('street (Logradouro/Rua) do endereço é obrigatório.');
            }
            if (data.congregationId !== undefined && !String(data.congregationId).trim()) {
                throw new Error('congregationId é obrigatório para o endereço.');
            }
        }
        if (data.visitStatus && !VALID_VISIT_STATUSES.includes(data.visitStatus as any)) {
            throw new Error(`visitStatus inválido: "${data.visitStatus}". Use: ${VALID_VISIT_STATUSES.join(', ')}`);
        }

        // Sanitização de URLs externas (defesa em profundidade)
        if (data.googleMapsLink) data.googleMapsLink = sanitizeUrl(data.googleMapsLink);
        if (data.wazeLink) data.wazeLink = sanitizeUrl(data.wazeLink);

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
            const effectiveCityId = data.cityId || oldData.cityId;
            if (wasActive !== isActive && effectiveCityId) {
                const cityRef = doc(db, 'cities', effectiveCityId);
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

            // Propaga alterações públicas para snapshots de links compartilhados ativos
            try {
                const snapSyncPayload: Record<string, any> = {};
                const syncFields = ['street', 'lat', 'lng', 'googleMapsLink', 'wazeLink', 'gender', 'observations', 'isActive'] as const;
                syncFields.forEach((field) => {
                    if (data[field] !== undefined) {
                        snapSyncPayload[`data.${field}`] = data[field];
                    }
                });
                if (Object.keys(snapSyncPayload).length > 0) {
                    const snapDocs = await getDocs(
                        query(collection(db, 'shared_list_snapshots'), where('itemId', '==', id))
                    );
                    if (!snapDocs.empty) {
                        const snapBatch = writeBatch(db);
                        snapDocs.docs.forEach((s) => snapBatch.update(s.ref, snapSyncPayload));
                        await snapBatch.commit();
                    }
                }
            } catch (syncErr) {
                console.warn('[saveAddress] Falha ao sincronizar snapshot compartilhado:', syncErr);
            }

            const diffText = changes.length > 0 ? changes.join(' | ') : 'Nenhuma alteração de valor detectada';

            const formattedAddress = [data.street || oldData.street, data.number || oldData.number].filter(Boolean).join(', ');

            logActivity({
                level: 'SUCCESS',
                category: 'TERRITORY',
                action: 'ADDRESS_UPDATE',
                message: `ADDRESS_UPDATE: Endereço "${formattedAddress}" atualizado`,
                congregationId: data.congregationId || oldData.congregationId,
                details: `Alterações: [${diffText}] | CityID: ${effectiveCityId || ''}`
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

            // Propaga alterações públicas para snapshots de links compartilhados ativos
            try {
                const snapSyncPayload: Record<string, any> = {};
                const syncFields = ['street', 'lat', 'lng', 'googleMapsLink', 'wazeLink', 'gender', 'observations', 'isActive'] as const;
                syncFields.forEach((field) => {
                    if (data[field] !== undefined) {
                        snapSyncPayload[`data.${field}`] = data[field];
                    }
                });
                if (Object.keys(snapSyncPayload).length > 0) {
                    const snapDocs = await getDocs(
                        query(collection(db, 'shared_list_snapshots'), where('itemId', '==', id))
                    );
                    if (!snapDocs.empty) {
                        const snapBatch = writeBatch(db);
                        snapDocs.docs.forEach((s) => snapBatch.update(s.ref, snapSyncPayload));
                        await snapBatch.commit();
                    }
                }
            } catch (syncErr) {
                console.warn('[saveAddress] Falha ao sincronizar snapshot compartilhado:', syncErr);
            }

            const formattedAddress = [data.street, data.number].filter(Boolean).join(', ');

            logActivity({
                level: 'SUCCESS',
                category: 'TERRITORY',
                action: 'ADDRESS_CREATE',
                message: `ADDRESS_CREATE: Adicionado novo endereço "${formattedAddress}"`,
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

        const formattedAddress = [addrData.street, addrData.number].filter(Boolean).join(', ');

        logActivity({
            level: 'WARN',
            category: 'TERRITORY',
            action: 'ADDRESS_DELETE',
            message: `ADDRESS_DELETE: Endereço "${formattedAddress}" excluído`,
            congregationId: addrData.congregationId,
            details: `ID: ${id} | CityID: ${cityId || ''}`
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting address:', error);
        return { success: false, error: error.message };
    }
}
