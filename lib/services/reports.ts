import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export async function getRegistryData(congregationId: string) {
    try {
        if (!congregationId) throw new Error("ID da congregação é obrigatório.");

        // Fetch territories
        const terrQuery = query(collection(db, 'territories'), where('congregationId', '==', congregationId));
        const terrSnap = await getDocs(terrQuery);
        const territories = terrSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch cities
        const cityQuery = query(collection(db, 'cities'), where('congregationId', '==', congregationId));
        const citySnap = await getDocs(cityQuery);
        const cities = citySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch shared_lists
        const listsQuery = query(collection(db, 'shared_lists'), where('congregationId', '==', congregationId));
        const listsSnap = await getDocs(listsQuery);
        const shared_lists = listsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return { success: true, territories, cities, shared_lists };
    } catch (error: any) {
        console.error('Error in getRegistryData:', error);
        return { success: false, error: error.message };
    }
}
