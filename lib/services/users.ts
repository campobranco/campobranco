// lib/services/users.ts
// Serviço de cliente para gestão de usuários

import { 
    collection, 
    getDocs, 
    query, 
    where, 
    doc,
    getDoc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TABLE = 'users';

/**
 * Busca usuários de uma congregação
 */
export async function getCongregationUsers(congregationId: string) {
    try {
        const q = query(
            collection(db, TABLE),
            where('congregationId', '==', congregationId)
        );

        let snapshot = await getDocs(q);

        if (snapshot.empty) {
            // Retrocompatibilidade
            const qLegacy = query(
                collection(db, TABLE),
                where('congregation_id', '==', congregationId)
            );
            snapshot = await getDocs(qLegacy);
        }

        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || data.displayName || 'Sem Nome',
                email: data.email,
                role: data.role || 'PUBLICADOR',
                avatar_url: data.photoURL || null
            };
        });

        // Ordenar alfabeticamente
        users.sort((a, b) => a.name.localeCompare(b.name));

        return { success: true, users };
    } catch (error: any) {
        console.error("Error fetching users:", error);
        return { success: false, error: error.message };
    }
}
