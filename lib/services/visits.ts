// lib/services/visits.ts
// Serviço de cliente para gestão de visitas (relatórios de campo)
// Substitui as APIs /api/visits/* para compatibilidade com plano Spark

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
    limit,
    writeBatch,
    Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TABLE = 'visits';

export async function reportVisit(shareId: string, visitData: any) {
    try {
        // 1. Verifica se a lista compartilhada existe e não está expirada
        // Nota: Em um ambiente estático, o cliente faz essa verificação.
        // As regras do Firestore devem reforçar isso.
        const listSnap = await getDoc(doc(db, 'shared_lists', shareId));
        
        if (!listSnap.exists()) {
            throw new Error('Link de compartilhamento inválido');
        }

        const list = listSnap.data()!;
        if (list.expiresAt) {
            const expiresDate = list.expiresAt.toDate();
            if (new Date() > expiresDate) {
                throw new Error('Link expirado');
            }
        }

        // 2. Insere a visita vinculada à congregação da lista
        const finalVisitData = {
            ...visitData,
            sharedListId: shareId,
            congregationId: list.congregationId || list.congregation_id,
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, TABLE), finalVisitData);
        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error('Error reporting visit:', error);
        return { success: false, error: error.message };
    }
}

export async function getVisits(shareId: string) {
    try {
        const q = query(
            collection(db, TABLE),
            where('sharedListId', '==', shareId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return { 
            success: true, 
            visits: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) 
        };
    } catch (error: any) {
        console.error('Error fetching visits:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteVisit(id: string) {
    try {
        await deleteDoc(doc(db, TABLE, id));
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting visit:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteVisitByAddressAndShare(addressId: string, shareId: string) {
    try {
        const q = query(
            collection(db, TABLE),
            where('addressId', '==', addressId),
            where('sharedListId', '==', shareId),
            limit(1)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return { success: true }; // Already deleted or not found

        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting visit by address and share:', error);
        return { success: false, error: error.message };
    }
}
