// lib/services/cities.ts
// Serviço de cliente para gestão de cidades/bairros
// Substitui as APIs /api/cities/* para compatibilidade com plano Spark

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

const TABLE = 'cities';

export async function getCities(congregationId: string) {
    try {
        const q = query(
            collection(db, TABLE),
            where('congregationId', '==', congregationId),
            orderBy('name')
        );
        const snapshot = await getDocs(q);
        return { 
            success: true, 
            cities: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) 
        };
    } catch (error: any) {
        console.error('Error fetching cities:', error);
        return { success: false, error: error.message };
    }
}

export async function createCity(data: {
    name: string;
    uf: string;
    congregationId: string;
    parent_city?: string | null;
    lat?: number | null;
    lng?: number | null;
}) {
    try {
        const docRef = await addDoc(collection(db, TABLE), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error('Error creating city:', error);
        return { success: false, error: error.message };
    }
}

export async function updateCity(id: string, data: any) {
    try {
        await updateDoc(doc(db, TABLE, id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error updating city:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteCity(id: string) {
    try {
        await deleteDoc(doc(db, TABLE, id));
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting city:', error);
        return { success: false, error: error.message };
    }
}
