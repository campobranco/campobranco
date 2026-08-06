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
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logActivity } from '@/lib/services/audit_logs';

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
    parentCity?: string | null;
    lat?: number | null;
    lng?: number | null;
}) {
    try {
        const docRef = await addDoc(collection(db, TABLE), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        logActivity({
            level: 'SUCCESS',
            category: 'TERRITORY',
            action: data.parentCity ? 'NEIGHBORHOOD_CREATE' : 'CITY_CREATE',
            message: `${data.parentCity ? 'NEIGHBORHOOD_CREATE' : 'CITY_CREATE'}: ${data.parentCity ? 'Bairro' : 'Cidade'} "${data.name}" cadastrado(a)`,
            congregationId: data.congregationId,
            details: `ID: ${docRef.id} | UF: ${data.uf}`
        });

        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error('Error creating city:', error);
        return { success: false, error: error.message };
    }
}

export async function updateCity(id: string, data: any) {
    try {
        const cityRef = doc(db, TABLE, id);
        const oldSnap = await getDoc(cityRef);
        const oldData = oldSnap.exists() ? oldSnap.data() : null;
        const cityName = data.name || oldData?.name || id;

        const changes: string[] = [];
        if (oldData) {
            Object.keys(data).forEach(key => {
                if (key === 'updatedAt') return;
                const oldVal = oldData[key];
                const newVal = data[key];
                if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                    changes.push(`${key}: "${oldVal ?? ''}" -> "${newVal ?? ''}"`);
                }
            });
        }

        await updateDoc(cityRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });

        const diffText = changes.length > 0 ? changes.join(' | ') : 'Nenhuma alteração de valor detectada';

        logActivity({
            level: 'INFO',
            category: 'TERRITORY',
            action: 'CITY_UPDATE',
            message: `CITY_UPDATE: Cidade/Bairro "${cityName}" atualizado(a)`,
            congregationId: data.congregationId || oldData?.congregationId,
            details: `Alterações: [${diffText}] | ID: ${id}`
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error updating city:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Exclui uma cidade e todos os seus filhos em cascata:
 * Cidade → Territórios → Endereços → Visitas
 *                       → Pontos de Testemunho
 */
export async function deleteCity(id: string) {
    try {
        // 0. Busca prévia da cidade/bairro para pegar o nome
        const citySnap = await getDoc(doc(db, TABLE, id));
        const cityData = citySnap.exists() ? citySnap.data() : null;
        const cityName = cityData?.name || id;
        const isNeighborhood = !!cityData?.parentCity;

        let totalTerritoriesDeleted = 0;
        let totalAddressesDeleted = 0;
        let totalVisitsDeleted = 0;

        // Helper para deletar um array de refs em batches de 499
        const deleteDocs = async (refs: any[]) => {
            let batch = writeBatch(db);
            let ops = 0;
            for (const ref of refs) {
                batch.delete(ref);
                ops++;
                if (ops === 499) {
                    await batch.commit();
                    batch = writeBatch(db);
                    ops = 0;
                }
            }
            if (ops > 0) await batch.commit();
        };

        // 1. Territórios da cidade
        const territoriesSnap = await getDocs(
            query(collection(db, 'territories'), where('cityId', '==', id))
        );
        totalTerritoriesDeleted = territoriesSnap.size;

        for (const terrDoc of territoriesSnap.docs) {
            const territoryId = terrDoc.id;

            // 2. Endereços do território
            const addressesSnap = await getDocs(
                query(collection(db, 'addresses'), where('territoryId', '==', territoryId))
            );
            totalAddressesDeleted += addressesSnap.size;

            // 3. Visitas de cada endereço
            for (const addrDoc of addressesSnap.docs) {
                const visitsSnap = await getDocs(
                    query(collection(db, 'visits'), where('addressId', '==', addrDoc.id))
                );
                totalVisitsDeleted += visitsSnap.size;
                await deleteDocs(visitsSnap.docs.map(d => d.ref));
            }

            // 4. Deletar endereços
            await deleteDocs(addressesSnap.docs.map(d => d.ref));

            // 5. Deletar território
            await deleteDoc(terrDoc.ref);
        }

        // 6. Pontos de testemunho vinculados à cidade
        const pointsSnap = await getDocs(
            query(collection(db, 'witnessing_points'), where('cityId', '==', id))
        );
        await deleteDocs(pointsSnap.docs.map(d => d.ref));

        // 7. Pontos de referência vinculados à cidade
        const refPointsSnap = await getDocs(
            query(collection(db, 'reference_points'), where('cityId', '==', id))
        );
        await deleteDocs(refPointsSnap.docs.map(d => d.ref));

        // 8. Deletar a cidade em si
        await deleteDoc(doc(db, TABLE, id));

        const correlationId = `cascade_del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const actionName = isNeighborhood ? 'NEIGHBORHOOD_DELETE' : 'CITY_DELETE';
        const label = isNeighborhood ? 'Bairro' : 'Cidade';
        const verbGender = isNeighborhood ? 'excluído' : 'excluída';

        logActivity({
            level: 'WARN',
            category: 'TERRITORY',
            action: actionName,
            message: `${actionName}: ${label} "${cityName}" ${verbGender} com limpeza em cascata`,
            congregationId: cityData?.congregationId,
            correlationId,
            details: `Itens Removidos -> Territórios: ${totalTerritoriesDeleted} | Endereços: ${totalAddressesDeleted} | Históricos de Visita: ${totalVisitsDeleted} | Pontos de Testemunho: ${pointsSnap.size} | Pontos de Ref.: ${refPointsSnap.size} | ID: ${id}`
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting city (cascade):', error);
        return { success: false, error: error.message };
    }
}
