// lib/services/shared_lists.ts
// Serviço de cliente para gestão de listas compartilhadas (designações)
// Substitui as APIs /api/shared_lists/* para compatibilidade com plano Spark

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
    writeBatch,
    Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TABLE = 'shared_lists';

export async function createSharedList(data: {
    title: string;
    type: 'territory' | 'LIST_CARDS';
    items: string[];
    congregationId: string;
    assignedTo: string;
    assignedName: string;
    expiresInHours?: number;
    territories?: any[];
}) {
    try {
        const expiresAt = data.expiresInHours 
            ? new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000)
            : null;

        const listData = {
            title: data.title,
            type: data.type,
            items: data.items,
            congregationId: data.congregationId,
            assignedTo: data.assignedTo,
            assignedName: data.assignedName,
            status: 'active',
            assignedAt: serverTimestamp(),
            expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, TABLE), listData);
        const shareId = docRef.id;

        // 2. Criar snapshots (Territórios + Endereços) se type === 'territory'
        if (data.type === 'territory' && data.territories && Array.isArray(data.territories)) {
            const batch = writeBatch(db);
            const snapshotsRef = collection(db, 'shared_list_snapshots');

            // Snapshot dos Territórios
            data.territories.forEach((t: any) => {
                const snapRef = doc(snapshotsRef);
                batch.set(snapRef, {
                    sharedListId: shareId,
                    congregationId: data.congregationId,
                    itemId: t.id,
                    type: 'territory',
                    data: {
                        ...t,
                        visit_status: 'none'
                    },
                    createdAt: serverTimestamp()
                });
            });

            // Buscar Endereços vinculados para snapshot
            const territoryIds = data.territories.map((t: any) => t.id);
            if (territoryIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < territoryIds.length; i += 30) {
                    chunks.push(territoryIds.slice(i, i + 30));
                }

                for (const chunk of chunks) {
                    const addrQ = query(
                        collection(db, 'addresses'),
                        where('territoryId', 'in', chunk)
                    );
                    const addrSnap = await getDocs(addrQ);

                    addrSnap.docs.forEach(d => {
                        const snapRef = doc(snapshotsRef);
                        batch.set(snapRef, {
                            sharedListId: shareId,
                            congregationId: data.congregationId,
                            itemId: d.id,
                            type: 'address',
                            data: {
                                ...d.data(),
                                visit_status: 'none'
                            },
                            createdAt: serverTimestamp()
                        });
                    });
                }
            }

            await batch.commit();
        }

        return { success: true, id: shareId, shareData: { id: shareId, ...listData } };
    } catch (error: any) {
        console.error('Error creating shared list:', error);
        return { success: false, error: error.message };
    }
}

export async function getSharedList(id: string) {
    try {
        const docSnap = await getDoc(doc(db, TABLE, id));
        if (!docSnap.exists()) throw new Error('Link não encontrado');

        const list = { id: docSnap.id, ...docSnap.data() } as any;

        // Check expiration
        if (list.expiresAt) {
            const expires = list.expiresAt.toDate();
            if (new Date() > expires) {
                return { success: false, error: 'Link expirado', code: 'EXPIRED' };
            }
        }

        // Fetch items (territories/cards) - Em arquitetura estática, o cliente busca estes dados
        // baseados nos IDs contidos na lista.
        
        return { success: true, data: list };
    } catch (error: any) {
        console.error('Error getting shared list:', error);
        return { success: false, error: error.message };
    }
}

export async function updateSharedListStatus(id: string, status: 'active' | 'completed' | 'archived') {
    try {
        await updateDoc(doc(db, TABLE, id), {
            status,
            updatedAt: serverTimestamp(),
            ...(status === 'completed' ? { returnedAt: serverTimestamp() } : {})
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error updating shared list status:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteSharedList(id: string) {
    try {
        await deleteDoc(doc(db, TABLE, id));
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting shared list:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Busca os dados completos de uma lista compartilhada, incluindo snapshots e visitas.
 * Substitui /api/shared_lists/get
 */
export async function getSharedListWithData(id: string) {
    try {
        const docSnap = await getDoc(doc(db, TABLE, id));
        if (!docSnap.exists()) {
            return { success: false, error: 'Link não encontrado', status: 404 };
        }

        const list = { id: docSnap.id, ...docSnap.data() } as any;

        // Verifica expiração
        const expiresAt = list.expiresAt || list.expires_at;
        if (expiresAt) {
            const now = new Date();
            const expires = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
            if (now > expires) {
                return { success: false, error: 'Link expirado', status: 410 };
            }
        }

        // Busca os snapshots em paralelo
        const snapshotsQuery = query(
            collection(db, 'shared_list_snapshots'),
            where('sharedListId', '==', id)
        );
        
        // Busca o histórico de visitas
        const visitsQuery = query(
            collection(db, 'visits'),
            where('sharedListId', '==', id)
        );

        const [snapshotsSnap, visitsSnap] = await Promise.all([
            getDocs(snapshotsQuery),
            getDocs(visitsQuery)
        ]);

        const items = snapshotsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const visits = visitsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Busca categoria da congregação
        let congregationCategory = 'TRADITIONAL';
        const congregationId = list.congregationId || list.congregation_id;
        if (congregationId) {
            const congSnap = await getDoc(doc(db, 'congregations', congregationId));
            if (congSnap.exists()) {
                congregationCategory = (congSnap.data() as any).category || 'TRADITIONAL';
            }
        }

        return {
            success: true,
            list,
            items,
            visits,
            congregationCategory
        };

    } catch (error: any) {
        console.error("Error in getSharedListWithData:", error);
        return { success: false, error: error.message, status: 500 };
    }
}

/**
 * Processa ações em listas compartilhadas (devolver mapa, aceitar responsabilidade).
 * Substitui /api/shared_lists/return
 */
export async function processSharedListAction(id: string, action: string, payload: any = {}) {
    try {
        const listRef = doc(db, TABLE, id);
        const { territoryId, undo, userId, userName, userCongregationId } = payload;

        // AÇÃO 1: Devolver o mapa inteiro
        if (action === 'return_map') {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            await updateDoc(listRef, {
                status: 'completed',
                returnedAt: serverTimestamp(),
                expiresAt: Timestamp.fromDate(expiresAt)
            });

            return { success: true, message: 'Mapa devolvido com sucesso!' };
        }

        // AÇÃO 2: Devolver ou desfazer devolução de um território individual
        if (action === 'return_territory' && territoryId) {
            const newStatus = undo ? 'active' : 'completed';

            const snapshotsQuery = query(
                collection(db, 'shared_list_snapshots'),
                where('sharedListId', '==', id),
                where('itemId', '==', territoryId)
            );

            const snapshotsSnap = await getDocs(snapshotsQuery);

            if (!snapshotsSnap.empty) {
                const batch = writeBatch(db);
                snapshotsSnap.docs.forEach(snap => {
                    batch.update(snap.ref, { 'data.visit_status': newStatus });
                });
                await batch.commit();
            }

            // Se estava desfazendo e a lista estava 'completed', reativa
            const listSnap = await getDoc(listRef);
            if (undo && (listSnap.data() as any)?.status === 'completed') {
                await updateDoc(listRef, {
                    status: 'active',
                    returnedAt: null,
                    expiresAt: null
                });
            }

            return {
                success: true,
                message: undo ? 'Devolução desfeita!' : 'Território devolvido!'
            };
        }

        // AÇÃO 3: Aceitar responsabilidade pela lista
        if (action === 'accept_responsibility') {
            if (!userId) {
                throw new Error('Usuário não informado');
            }

            await updateDoc(listRef, {
                assignedTo: userId,
                assignedName: userName || 'Irmão sem Nome'
            });

            // Vincula o usuário à congregação da lista se ele ainda não tiver
            if (userCongregationId) {
                const userRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.data() as any;

                if (userData && !userData.congregationId && !userData.congregation_id) {
                    await updateDoc(userRef, {
                        congregationId: userCongregationId,
                        role: 'PUBLICADOR'
                    });
                    return { success: true, reloadRequired: true };
                }
            }

            return { success: true, reloadRequired: false };
        }

        return { success: false, error: 'Ação inválida' };

    } catch (error: any) {
        console.error('Error in processSharedListAction:', error);
        return { success: false, error: error.message };
    }
}
