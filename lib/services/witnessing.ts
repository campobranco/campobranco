// lib/services/witnessing.ts
// Serviço de cliente para gestão de pontos de testemunho público (Carrinhos)
// Substitui as Server Actions de app/actions/witnessing.ts para compatibilidade com export estático

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
    serverTimestamp,
    orderBy 
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

const TABLE = 'witnessing_points';

/**
 * Busca pontos de testemunho de uma cidade
 */
export async function getWitnessingPoints(cityId: string) {
    try {
        const q = query(
            collection(db, TABLE),
            where('cityId', '==', cityId)
        );

        let snapshot = await getDocs(q);

        if (snapshot.empty) {
            // Retrocompatibilidade: busca por city_id se cityId falhar
            const qLegacy = query(
                collection(db, TABLE),
                where('city_id', '==', cityId)
            );
            snapshot = await getDocs(qLegacy);
        }

        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Ordenação manual para evitar necessidade de índices compostos inicialmente
        data.sort((a: any, b: any) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
        });

        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching witnessing points:', error);
        return { success: false, error: error.message || 'Failed to fetch points' };
    }
}

/**
 * Cria um novo ponto de testemunho
 */
export async function createWitnessingPoint(data: {
    name: string;
    address: string;
    cityId: string;
    latitude: number;
    longitude: number;
    schedule: string;
    congregationId: string;
}) {
    try {
        const pointData = {
            name: data.name,
            address: data.address,
            cityId: data.cityId,
            lat: data.latitude,
            lng: data.longitude,
            schedule: data.schedule,
            status: 'AVAILABLE',
            congregationId: data.congregationId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, TABLE), pointData);
        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error('Error creating witnessing point:', error);
        return { success: false, error: error.message || 'Failed to create point' };
    }
}

/**
 * Busca um ponto pelo ID
 */
export async function getWitnessingPointById(id: string) {
    try {
        const docSnap = await getDoc(doc(db, TABLE, id));

        if (!docSnap.exists()) throw new Error('Ponto não encontrado.');

        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } catch (error: any) {
        console.error('Error fetching point:', error);
        return { success: false, error: error.message || 'Failed to fetch point' };
    }
}

/**
 * Atualiza detalhes de localização/nome do ponto
 */
export async function updateWitnessingPointDetails(id: string, data: {
    name: string;
    address: string;
    longitude: number;
    latitude: number;
    schedule: string;
}) {
    try {
        await updateDoc(doc(db, TABLE, id), {
            name: data.name,
            address: data.address,
            lng: data.longitude,
            lat: data.latitude,
            schedule: data.schedule,
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error updating point details:', error);
        return { success: false, error: error.message || 'Failed to update point' };
    }
}

/**
 * Atualiza status (ocupado/vago) e publicadores no carrinho
 */
export async function updateWitnessingPointStatus(id: string, status: string, publishersAsString: string | null) {
    try {
        await updateDoc(doc(db, TABLE, id), {
            status,
            currentPublishers: publishersAsString ? [publishersAsString] : [],
            updatedAt: serverTimestamp()
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error updating witnessing point status:', error);
        return { success: false, error: error.message || 'Failed to update status' };
    }
}

/**
 * Remove um ponto de testemunho
 */
export async function deleteWitnessingPoint(id: string) {
    try {
        await deleteDoc(doc(db, TABLE, id));
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting witnessing point:', error);
        return { success: false, error: error.message || 'Failed to delete point' };
    }
}
/**
 * Registra check-in/out em um ponto de testemunho
 */
export async function checkInWitnessingPoint(id: string, updates: any) {
    try {
        await updateDoc(doc(db, TABLE, id), {
            ...updates,
            updatedAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error check-in witnessing point:', error);
        return { success: false, error: error.message || 'Failed to process check-in' };
    }
}
