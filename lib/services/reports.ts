import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export async function getRegistryData(congregationId: string, includeSharedLists: boolean = false) {
    try {
        if (!congregationId) throw new Error("ID da congregação é obrigatório.");

        const terrQuery = query(collection(db, 'territories'), where('congregationId', '==', congregationId));
        const cityQuery = query(collection(db, 'cities'), where('congregationId', '==', congregationId));

        const promises: Promise<any>[] = [
            getDocs(terrQuery),
            getDocs(cityQuery)
        ];

        if (includeSharedLists) {
            const listsQuery = query(collection(db, 'shared_lists'), where('congregationId', '==', congregationId));
            promises.push(getDocs(listsQuery));
        }

        const results = await Promise.all(promises);
        const terrSnap = results[0];
        const citySnap = results[1];
        const listsSnap = includeSharedLists ? results[2] : null;

        const territories = terrSnap.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                description: data.description ?? data.notes ?? '',
            };
        });

        const cities = citySnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        const shared_lists = listsSnap ? listsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) : [];

        return { success: true, territories, cities, shared_lists };
    } catch (error: any) {
        console.error('Error in getRegistryData:', error);
        return { success: false, error: error.message };
    }
}
