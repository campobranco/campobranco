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
    serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logActivity } from '@/lib/services/audit_logs';

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

        const snapshot = await getDocs(q);

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
    googleMapsLink?: string;
    wazeLink?: string;
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
            googleMapsLink: data.googleMapsLink || '',
            wazeLink: data.wazeLink || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, TABLE), pointData);

        logActivity({
            level: 'SUCCESS',
            category: 'WITNESSING',
            action: 'POINT_CREATE',
            message: `POINT_CREATE: Ponto de testemunho "${data.name}" cadastrado`,
            congregationId: data.congregationId,
            details: `ID: ${docRef.id} | Endereço: ${data.address || 'N/A'} | Horário: ${data.schedule || 'N/A'}`
        });

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
    googleMapsLink?: string;
    wazeLink?: string;
}) {
    try {
        const pointRef = doc(db, TABLE, id);
        const oldSnap = await getDoc(pointRef);
        const oldData = oldSnap.exists() ? oldSnap.data() : null;
        const pointName = data.name || oldData?.name || id;

        const changes: string[] = [];
        if (oldData) {
            if (data.name !== undefined && oldData.name !== data.name) changes.push(`nome: "${oldData.name ?? ''}" -> "${data.name}"`);
            if (data.address !== undefined && oldData.address !== data.address) changes.push(`endereço: "${oldData.address ?? ''}" -> "${data.address}"`);
            if (data.schedule !== undefined && oldData.schedule !== data.schedule) changes.push(`horário: "${oldData.schedule ?? ''}" -> "${data.schedule}"`);
            if (data.latitude !== undefined && oldData.lat !== data.latitude) changes.push(`lat: "${oldData.lat ?? ''}" -> "${data.latitude}"`);
            if (data.longitude !== undefined && oldData.lng !== data.longitude) changes.push(`lng: "${oldData.lng ?? ''}" -> "${data.longitude}"`);
            if (data.googleMapsLink !== undefined && oldData.googleMapsLink !== data.googleMapsLink) changes.push(`mapsLink: "${oldData.googleMapsLink ?? ''}" -> "${data.googleMapsLink}"`);
            if (data.wazeLink !== undefined && oldData.wazeLink !== data.wazeLink) changes.push(`wazeLink: "${oldData.wazeLink ?? ''}" -> "${data.wazeLink}"`);
        }

        const updateData: any = {
            name: data.name,
            address: data.address,
            lng: data.longitude,
            lat: data.latitude,
            schedule: data.schedule,
            updatedAt: serverTimestamp(),
        };
        
        if (data.googleMapsLink !== undefined) updateData.googleMapsLink = data.googleMapsLink;
        if (data.wazeLink !== undefined) updateData.wazeLink = data.wazeLink;

        await updateDoc(pointRef, updateData);

        const diffText = changes.length > 0 ? changes.join(' | ') : 'Nenhuma alteração de valor detectada';

        logActivity({
            level: 'SUCCESS',
            category: 'WITNESSING',
            action: 'POINT_UPDATE',
            message: `POINT_UPDATE: Ponto de testemunho "${pointName}" atualizado`,
            congregationId: oldData?.congregationId || '',
            details: `Alterações: [${diffText}] | ID: ${id}`
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error updating point details:', error);
        return { success: false, error: error.message || 'Failed to update point' };
    }
}

/**
 * Remove um ponto de testemunho
 */
export async function deleteWitnessingPoint(id: string) {
    try {
        const pointRef = doc(db, TABLE, id);
        const oldSnap = await getDoc(pointRef);
        const oldData = oldSnap.exists() ? oldSnap.data() : null;
        const pointName = oldData?.name || id;

        await deleteDoc(pointRef);

        logActivity({
            level: 'WARN',
            category: 'WITNESSING',
            action: 'POINT_DELETE',
            message: `POINT_DELETE: Ponto de testemunho "${pointName}" removido`,
            congregationId: oldData?.congregationId || '',
            details: `ID: ${id} | Endereço: ${oldData?.address || 'N/A'}`
        });

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
        const pointRef = doc(db, TABLE, id);
        const oldSnap = await getDoc(pointRef);
        const oldData = oldSnap.exists() ? oldSnap.data() : null;
        const pointName = oldData?.name || id;

        await updateDoc(pointRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });

        logActivity({
            level: 'INFO',
            category: 'WITNESSING',
            action: updates.status === 'OCCUPIED' ? 'POINT_CHECKIN' : 'POINT_CHECKOUT',
            message: `POINT_${updates.status === 'OCCUPIED' ? 'CHECKIN' : 'CHECKOUT'}: Registrado no ponto "${pointName}"`,
            congregationId: oldData?.congregationId || '',
            details: `ID: ${id} | Status: ${updates.status || 'N/A'}`
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error check-in witnessing point:', error);
        return { success: false, error: error.message || 'Failed to process check-in' };
    }
}
