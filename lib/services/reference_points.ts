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
    serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logActivity } from '@/lib/services/audit_logs';

const COLLECTION_NAME = 'reference_points';

export interface ReferencePoint {
    id: string;
    name: string;
    observations?: string;
    lat: number;
    lng: number;
    cityId: string;
    congregationId: string;
    createdAt?: any;
    updatedAt?: any;
}

/**
 * Busca os pontos de referência de uma cidade na congregação
 */
export async function getReferencePoints(congregationId: string, cityId: string) {
    try {
        if (!congregationId || !cityId) {
            return { success: true, data: [] };
        }
        
        const q = query(
            collection(db, COLLECTION_NAME),
            where('congregationId', '==', congregationId),
            where('cityId', '==', cityId)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        })) as ReferencePoint[];

        // Ordenação manual por data de criação para evitar necessidade inicial de índices compostos
        data.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateA.getTime() - dateB.getTime();
        });

        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching reference points:', error);
        return { success: false, error: error.message || 'Failed to fetch reference points' };
    }
}

/**
 * Cria um novo ponto de referência
 */
export async function createReferencePoint(data: {
    name: string;
    observations?: string;
    lat: number;
    lng: number;
    cityId: string;
    congregationId: string;
}) {
    try {
        const pointData = {
            name: data.name,
            observations: data.observations || '',
            lat: data.lat,
            lng: data.lng,
            cityId: data.cityId,
            congregationId: data.congregationId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, COLLECTION_NAME), pointData);

        logActivity({
            level: 'SUCCESS',
            category: 'TERRITORY',
            action: 'REFERENCE_POINT_CREATE',
            message: `REFERENCE_POINT_CREATE: Ponto de referência "${data.name}" criado`,
            congregationId: data.congregationId,
            details: `ID: ${docRef.id} | Obs: ${data.observations || 'N/A'}`
        });

        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error('Error creating reference point:', error);
        return { success: false, error: error.message || 'Failed to create reference point' };
    }
}

/**
 * Atualiza um ponto de referência existente
 */
export async function updateReferencePoint(id: string, data: {
    name: string;
    observations?: string;
    lat: number;
    lng: number;
}) {
    try {
        const refPointDoc = doc(db, COLLECTION_NAME, id);
        const oldSnap = await getDoc(refPointDoc);
        const oldData = oldSnap.exists() ? oldSnap.data() : null;
        const refName = data.name || oldData?.name || id;

        const updateData = {
            name: data.name,
            observations: data.observations || '',
            lat: data.lat,
            lng: data.lng,
            updatedAt: serverTimestamp(),
        };

        await updateDoc(refPointDoc, updateData);

        logActivity({
            level: 'INFO',
            category: 'TERRITORY',
            action: 'REFERENCE_POINT_UPDATE',
            message: `REFERENCE_POINT_UPDATE: Ponto de referência "${refName}" atualizado`,
            congregationId: oldData?.congregationId || '',
            details: `ID: ${id}`
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error updating reference point:', error);
        return { success: false, error: error.message || 'Failed to update reference point' };
    }
}

/**
 * Exclui um ponto de referência
 */
export async function deleteReferencePoint(id: string) {
    try {
        const refPointDoc = doc(db, COLLECTION_NAME, id);
        const oldSnap = await getDoc(refPointDoc);
        const oldData = oldSnap.exists() ? oldSnap.data() : null;
        const refName = oldData?.name || id;

        await deleteDoc(refPointDoc);

        logActivity({
            level: 'WARN',
            category: 'TERRITORY',
            action: 'REFERENCE_POINT_DELETE',
            message: `REFERENCE_POINT_DELETE: Ponto de referência "${refName}" removido`,
            congregationId: oldData?.congregationId || '',
            details: `ID: ${id}`
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting reference point:', error);
        return { success: false, error: error.message || 'Failed to delete reference point' };
    }
}
