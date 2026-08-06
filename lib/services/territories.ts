// lib/services/territories.ts
// Serviço de cliente para gestão de territórios
// Substitui as APIs /api/territories/* para compatibilidade com plano Spark

import { 
    collection, 
    doc, 
    addDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy,
    serverTimestamp,
    writeBatch,
    increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { canDeleteTerritory } from '../domain/territoryRules';
import { logActivity } from '@/lib/services/audit_logs';

const TABLE = 'territories';

/**
 * Lista territórios de uma cidade com contagem de endereços
 */
export async function getTerritories(congregationId: string, cityId?: string | null) {
    try {
        let q = query(
            collection(db, TABLE),
            where('congregationId', '==', congregationId),
            orderBy('name')
        );

        if (cityId) {
            q = query(
                collection(db, TABLE),
                where('cityId', '==', cityId),
                where('congregationId', '==', congregationId),
                orderBy('name')
            );
        }

        let teSnap = await getDocs(q);
        
        const territories = teSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        if (territories.length === 0) return { success: true, territories: [] };

        // Cálculo de estatísticas de endereços no cliente (mesma lógica da API)
        const statsMap: Record<string, { count: number, men: number, women: number, couples: number }> = {};
        const territoryIds = territories.map((t: any) => t.id);

        // Firestore 'in' limit is 30
        const chunks = [];
        for (let i = 0; i < territoryIds.length; i += 30) {
            chunks.push(territoryIds.slice(i, i + 30));
        }

        for (const chunk of chunks) {
            const addrQ = query(
                collection(db, 'addresses'),
                where('territoryId', 'in', chunk),
                where('isActive', '==', true)
            );
            let addrSnap = await getDocs(addrQ);

            addrSnap.docs.forEach(doc => {
                const addr = doc.data();
                const territoryId = addr.territoryId;
                if (!statsMap[territoryId]) {
                    statsMap[territoryId] = { count: 0, men: 0, women: 0, couples: 0 };
                }
                statsMap[territoryId].count++;
                if (addr.gender === 'HOMEM') statsMap[territoryId].men++;
                else if (addr.gender === 'MULHER') statsMap[territoryId].women++;
                else if (addr.gender === 'CASAL') statsMap[territoryId].couples++;
            });
        }

        const formattedTerritories = territories.map((t: any) => {
            const stats = statsMap[t.id] || { count: 0, men: 0, women: 0, couples: 0 };
            return {
                ...t,
                addressCount: stats.count,
                menCount: stats.men,
                womenCount: stats.women,
                couplesCount: stats.couples
            };
        });

        return { success: true, territories: formattedTerritories };
    } catch (error: any) {
        console.error("Error fetching territories:", error);
        return { success: false, error: error.message };
    }
}

export async function createTerritory(data: {
    name: string;
    cityId: string;
    congregationId: string;
    description?: string;
    type?: string;
}) {
    try {
        const batch = writeBatch(db);
        
        // 1. Cria nova referência do território
        const newTerritoryRef = doc(collection(db, TABLE));
        
        batch.set(newTerritoryRef, {
            ...data,
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // 2. Incrementa o totalTerritories no stats da cidade correspondente
        const cityRef = doc(db, 'cities', data.cityId);
        batch.set(cityRef, {
            stats: {
                totalTerritories: increment(1)
            }
        }, { merge: true });

        await batch.commit();

        logActivity({
            level: 'SUCCESS',
            category: 'TERRITORY',
            action: 'MAP_CARD_CREATE',
            message: `MAP_CARD_CREATE: Cartão/Território "${data.name}" criado`,
            congregationId: data.congregationId,
            details: `ID: ${newTerritoryRef.id} | CityID: ${data.cityId}`
        });

        return { success: true, id: newTerritoryRef.id };
    } catch (error: any) {
        console.error('Error creating territory:', error);
        return { success: false, error: error.message };
    }
}

export async function updateTerritory(id: string, data: any) {
    try {
        await updateDoc(doc(db, TABLE, id), {
            ...data,
            updatedAt: serverTimestamp(),
        });

        // Log de auditoria em background sem bloquear a resposta da UI
        logActivity({
            level: 'INFO',
            category: 'TERRITORY',
            action: 'MAP_CARD_UPDATE',
            message: `MAP_CARD_UPDATE: Território "${data.name || id}" atualizado`,
            congregationId: data.congregationId,
            details: `Campos atualizados: [${Object.keys(data).filter(k => k !== 'updatedAt').join(', ')}] | ID: ${id}`
        }).catch(err => console.warn("Erro ao gravar log de auditoria:", err));

        return { success: true, id };
    } catch (error: any) {
        console.error('Error updating territory:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Exclui um território apenas se não houver dependências (bloqueio de segurança).
 */
export async function deleteTerritory(id: string) {
    try {
        // 0. Busca prévia do território para obter o cityId correspondente
        const terrSnap = await getDoc(doc(db, TABLE, id));
        if (!terrSnap.exists()) {
            throw new Error('Território não encontrado');
        }
        const terrData = terrSnap.data();
        const cityId = terrData.cityId;

        // 1. Busca endereços vinculados ao território para checar dependências
        const addressesSnap = await getDocs(
            query(collection(db, 'addresses'), where('territoryId', '==', id))
        );

        // 2. Validação Comportamental de Domínio (BDD)
        const validation = canDeleteTerritory(
            { id: terrSnap.id, ...terrData },
            { activeAddressesCount: addressesSnap.size }
        );

        if (!validation.valid) {
            return { success: false, error: validation.message, code: validation.code };
        }

        // 3. Executa a deleção do território e atualiza estatísticas
        let batch = writeBatch(db);

        // Deleta o documento do território
        batch.delete(doc(db, TABLE, id));

        // Decrementa as estatísticas de territórios no bairro
        if (cityId) {
            const cityRef = doc(db, 'cities', cityId);
            batch.set(cityRef, {
                stats: {
                    totalTerritories: increment(-1)
                }
            }, { merge: true });
        }

        await batch.commit();

        logActivity({
            level: 'WARN',
            category: 'TERRITORY',
            action: 'MAP_CARD_DELETE',
            message: `MAP_CARD_DELETE: Cartão/Território "${terrData.name || ''}" excluído`,
            congregationId: terrData.congregationId,
            details: `ID: ${id} | CityID: ${cityId}`
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting territory:', error);
        return { success: false, error: error.message };
    }
}

export async function getTerritoryDetails(id: string) {
    try {
        const docSnap = await getDoc(doc(db, TABLE, id));
        if (!docSnap.exists()) throw new Error('Território não encontrado');
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } catch (error: any) {
        console.error('Error fetching territory details:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Busca o contexto de navegação (Congregação, Cidade e Território)
 */
export async function getMapsContext(congregationId: string, cityId?: string | null, territoryId?: string | null) {
    try {
        const [congSnap, citySnap, terrSnap] = await Promise.all([
            congregationId ? getDoc(doc(db, 'congregations', congregationId)) : Promise.resolve(null),
            cityId ? getDoc(doc(db, 'cities', cityId)) : Promise.resolve(null),
            territoryId ? getDoc(doc(db, 'territories', territoryId)) : Promise.resolve(null)
        ]);

        return {
            success: true,
            congregation: congSnap?.exists() ? { id: congSnap.id, ...congSnap.data() } : null,
            city: citySnap?.exists() ? { id: citySnap.id, ...citySnap.data() } : null,
            territory: terrSnap?.exists() ? { id: terrSnap.id, ...terrSnap.data() } : null
        };
    } catch (error: any) {
        console.error('Error fetching maps context:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Busca detalhes de múltiplos territórios (por ID)
 */
export async function getTerritoriesDetails(ids: string[]) {
    try {
        if (!ids || ids.length === 0) return { success: true, territories: [] };

        const territories: any[] = [];
        const promises = ids.map(id => getDoc(doc(db, TABLE, id)));
        const snapshots = await Promise.all(promises);

        snapshots.forEach(snap => {
            if (snap.exists()) {
                territories.push({ id: snap.id, ...snap.data() });
            }
        });

        return { success: true, territories };
    } catch (error: any) {
        console.error('Error fetching territories details:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Busca o histórico de um território
 */
export async function getTerritoryHistory(congregationId: string, territoryId: string) {
    try {
        if (!congregationId || !territoryId) {
            throw new Error("Parâmetros inválidos");
        }

        const listsRef = collection(db, 'shared_lists');
        const listsQuery = query(
            listsRef,
            where('items', 'array-contains', territoryId)
        );

        const snapshot = await getDocs(listsQuery);
        // Filtragem de congregação e ordenação no cliente para máxima compatibilidade e evitar necessidade de índices compostos manuais
        const data = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            } as any))
            .filter(item => item.congregationId === congregationId)
            .sort((a, b) => {
                const dateA = a.createdAt || a.assignedAt || 0;
                const d1 = dateA.toDate ? dateA.toDate().getTime() : new Date(dateA).getTime();
                const dateB = b.createdAt || b.assignedAt || 0;
                const d2 = dateB.toDate ? dateB.toDate().getTime() : new Date(dateB).getTime();
                return d2 - d1;
            });

        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching territory history:", error);
        return { success: false, error: error.message };
    }
}

