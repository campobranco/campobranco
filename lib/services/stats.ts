// lib/services/stats.ts
// Serviço de cliente para busca de estatísticas de congregação e cidade
// Substitui a API /api/cities/stats para compatibilidade com plano Spark

import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Busca estatísticas de uma cidade dentro de uma congregação
 */
export async function getCityStats(congregationId: string, cityId?: string, startDate?: Date | null, endDate?: Date | null) {
    try {
        if (!congregationId) throw new Error('Parâmetro congregationId é obrigatório.');

        // 1. Fetch all territories
        let territoriesQuery = query(
            collection(db, 'territories'),
            where('congregationId', '==', congregationId)
        );
        let territoriesSnapshot = await getDocs(territoriesQuery);

        if (territoriesSnapshot.empty) {
            territoriesQuery = query(
                collection(db, 'territories'),
                where('congregation_id', '==', congregationId)
            );
            territoriesSnapshot = await getDocs(territoriesQuery);
        }

        const territories = territoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // 2. Fetch shared_lists (history)
        let assignmentsQuery = query(
            collection(db, 'shared_lists'),
            where('congregationId', '==', congregationId)
        );
        let assignmentsSnapshot = await getDocs(assignmentsQuery);

        if (assignmentsSnapshot.empty) {
            assignmentsQuery = query(
                collection(db, 'shared_lists'),
                where('congregation_id', '==', congregationId)
            );
            assignmentsSnapshot = await getDocs(assignmentsQuery);
        }

        let history = assignmentsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as any))
            .filter((item: any) => item.status === 'completed');

        // Filter by date
        if (startDate || endDate) {
            history = history.filter((item: any) => {
                const dateRaw = item.returnedAt || item.returned_at;
                if (!dateRaw) return false;
                const date = dateRaw.toDate ? dateRaw.toDate() : new Date(dateRaw);
                if (isNaN(date.getTime())) return false;
                if (startDate && date < startDate) return false;
                if (endDate && date > endDate) return false;
                return true;
            });
        }

        // 3. Fetch Addresses
        let addressesQuery = query(
            collection(db, 'addresses'),
            where('congregationId', '==', congregationId)
        );
        let addressesSnapshot = await getDocs(addressesQuery);

        if (addressesSnapshot.empty) {
            addressesQuery = query(
                collection(db, 'addresses'),
                where('congregation_id', '==', congregationId)
            );
            addressesSnapshot = await getDocs(addressesQuery);
        }

        let addresses = addressesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (startDate || endDate) {
            addresses = addresses.filter((item: any) => {
                const dateRaw = item.lastVisitedAt || item.last_visited_at;
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
