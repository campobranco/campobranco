// lib/services/stats.ts
// Serviço de cliente para busca de estatísticas de congregação e cidade
// Substitui a API /api/cities/stats para compatibilidade com plano Spark

import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc,
    setDoc,
    getCountFromServer
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Busca estatísticas de uma cidade dentro de uma congregação
 */
export async function getCityStats(congregationId: string, cityId?: string, startDate?: Date | null, endDate?: Date | null) {
    try {
        if (!congregationId) throw new Error('Parâmetro congregationId é obrigatório.');

        // 1. Define queries
        const territoriesQuery = query(
            collection(db, 'territories'),
            where('congregationId', '==', congregationId)
        );

        // 2. Define shared_lists query - Filter completed status directly in Firestore
        const assignmentsQuery = query(
            collection(db, 'shared_lists'),
            where('congregationId', '==', congregationId),
            where('status', '==', 'completed')
        );

        // 3. Define Addresses query
        const addressesQuery = query(
            collection(db, 'addresses'),
            where('congregationId', '==', congregationId)
        );

        // 4. Fetch all datasets in parallel to optimize latency
        const [territoriesSnapshot, assignmentsSnapshot, addressesSnapshot] = await Promise.all([
            getDocs(territoriesQuery),
            getDocs(assignmentsQuery),
            getDocs(addressesQuery)
        ]);

        const territories = territoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        let history = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        // Filter history by date
        if (startDate || endDate) {
            history = history.filter((item: any) => {
                const dateRaw = item.returnedAt;
                if (!dateRaw) return false;
                const date = dateRaw.toDate ? dateRaw.toDate() : new Date(dateRaw);
                if (isNaN(date.getTime())) return false;
                if (startDate && date < startDate) return false;
                if (endDate && date > endDate) return false;
                return true;
            });
        }

        // 3. Process Addresses
        let addresses = addressesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (startDate || endDate) {
            addresses = addresses.filter((item: any) => {
                const dateRaw = item.lastVisitedAt;
                if (!dateRaw) return false;
                const date = dateRaw.toDate ? dateRaw.toDate() : new Date(dateRaw);
                if (isNaN(date.getTime())) return false;
                if (startDate && date < startDate) return false;
                if (endDate && date > endDate) return false;
                return true;
            });
        }

        return {
            success: true,
            territories,
            history,
            addresses
        };

    } catch (error: any) {
        console.error("Cities Stats Service Error:", error);
        return { 
            success: false, 
            error: error.message || "Failed to fetch stats" 
        };
    }
}

/**
 * Recalcula atomicamente as estatísticas de um bairro/cidade
 */
export async function recalculateCityStats(congregationId: string, cityId: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!congregationId || !cityId) throw new Error('Parâmetros congregationId e cityId são obrigatórios.');

        // 1. Contagem de territórios
        const territoriesQuery = query(
            collection(db, 'territories'),
            where('cityId', '==', cityId),
            where('congregationId', '==', congregationId)
        );
        const territoriesSnap = await getCountFromServer(territoriesQuery);
        const totalTerritories = territoriesSnap.data().count;

        // 2. Contagem de endereços ativos
        const addressesQuery = query(
            collection(db, 'addresses'),
            where('cityId', '==', cityId),
            where('congregationId', '==', congregationId),
            where('isActive', '==', true)
        );
        const addressesSnap = await getCountFromServer(addressesQuery);
        const totalAddresses = addressesSnap.data().count;

        // 3. Atualiza o documento da cidade
        const cityRef = doc(db, 'cities', cityId);
        await setDoc(cityRef, {
            stats: {
                totalTerritories,
                totalAddresses
            }
        }, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error("Error recalculating city stats:", error);
        return { success: false, error: error.message };
    }
}

