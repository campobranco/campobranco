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
    limit 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

        const teSnap = await getDocs(q);
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
            const addrSnap = await getDocs(addrQ);

            addrSnap.docs.forEach(doc => {
                const addr = doc.data();
                if (!statsMap[addr.territoryId]) {
                    statsMap[addr.territoryId] = { count: 0, men: 0, women: 0, couples: 0 };
                }
                statsMap[addr.territoryId].count++;
                if (addr.gender === 'HOMEM') statsMap[addr.territoryId].men++;
                else if (addr.gender === 'MULHER') statsMap[addr.territoryId].women++;
                else if (addr.gender === 'CASAL') statsMap[addr.territoryId].couples++;
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
        const docRef = await addDoc(collection(db, TABLE), {
            ...data,
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return { success: true, id: docRef.id };
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
        return { success: true };
    } catch (error: any) {
        console.error('Error updating territory:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteTerritory(id: string) {
    try {
        await deleteDoc(doc(db, TABLE, id));
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
            where('congregation_id', '==', congregationId),
            where('items', 'array-contains', territoryId),
            orderBy('created_at', 'desc')
        );

        const snapshot = await getDocs(listsQuery);
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return { success: true, data };
    } catch (error: any) {
        console.error("Error fetching territory history:", error);
        return { success: false, error: error.message };
    }
}

