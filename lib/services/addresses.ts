// lib/services/addresses.ts
// Serviço de cliente para gestão de endereços
// Substitui as APIs /api/addresses/* para compatibilidade com plano Spark

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
    writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

        if (snapshot.empty && cityId) {
            // Retrocompatibilidade: busca por city_id/territory_id se os novos campos falharem
             let qLegacy = query(
                collection(db, TABLE),
                where('congregation_id', '==', congregationId)
            );
            if (cityId) qLegacy = query(qLegacy, where('city_id', '==', cityId));
            if (territoryId) qLegacy = query(qLegacy, where('territory_id', '==', territoryId));
            
            const snapLegacy = await getDocs(qLegacy);
            return { 
                success: true, 
                addresses: snapLegacy.docs.map(d => ({ id: d.id, ...d.data() })) 
            };
        }

        return { success: true, addresses };
    } catch (error: any) {
        console.error('Error fetching addresses:', error);
        return { success: false, error: error.message };
    }
}

export async function saveAddress(id: string | null, data: any) {
    try {
        if (id) {
            await updateDoc(doc(db, TABLE, id), {
                ...data,
                updatedAt: serverTimestamp(),
            });
            return { success: true, id };
        } else {
            const docRef = await addDoc(collection(db, TABLE), {
                ...data,
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return { success: true, id: docRef.id };
        }
    } catch (error: any) {
        console.error('Error saving address:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteAddress(id: string) {
    try {
        await deleteDoc(doc(db, TABLE, id));
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting address:', error);
        return { success: false, error: error.message };
    }
}
