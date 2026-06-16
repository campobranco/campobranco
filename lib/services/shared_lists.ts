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
    runTransaction,
    Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { canAssignTerritory, canReturnTerritory } from '../domain/territoryRules';

const LISTS_TABLE = 'shared_lists';
const SNAPSHOTS_TABLE = 'shared_list_snapshots';
const VISITS_TABLE = 'visits';

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

        const listRef = doc(collection(db, LISTS_TABLE));
        const shareId = listRef.id;

        // PRE-FETCH: Lemos dados que não exigem bloqueio (Endereços) fora do retry loop
        let addressesDocs: any[] = [];
        if (data.type === 'territory' && data.territories && Array.isArray(data.territories)) {
            const territoryIds = data.territories.map((t: any) => t.id);
            if (territoryIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < territoryIds.length; i += 30) {
                    chunks.push(territoryIds.slice(i, i + 30));
                }
                for (const chunk of chunks) {
                    const addrQ = query(collection(db, 'addresses'), where('territoryId', 'in', chunk));
                    const addrSnap = await getDocs(addrQ);
                    addressesDocs.push(...addrSnap.docs);
                }
            }
        }

        await runTransaction(db, async (transaction) => {
            // FASE 1: LEITURA ATÔMICA
            const territoryDocs = [];
            if (data.type === 'territory' && data.territories && Array.isArray(data.territories)) {
                for (const t of data.territories) {
                    const terrRef = doc(db, 'territories', t.id);
                    const terrDoc = await transaction.get(terrRef);
                    territoryDocs.push({ t, terrRef, terrDoc });
                }
            }

            // FASE 2: VALIDAÇÃO (Domínio Puro, sem Side Effects)
            for (const { t, terrDoc } of territoryDocs) {
                if (!terrDoc.exists()) {
                    throw new Error(`Território ${t.id} inexistente.`);
                }
                const tState = { id: terrDoc.id, ...terrDoc.data() } as any;
                const validation = canAssignTerritory(tState, data.assignedTo);
                if (!validation.valid) {
                    throw new Error(validation.message || 'Território não disponível');
                }
            }

            // FASE 3: ESCRITAS (Apenas a partir daqui. Sem mais Reads/Awaits)
            for (const { terrRef } of territoryDocs) {
                transaction.update(terrRef, {
                    status: 'Emprestado',
                    assignedTo: data.assignedTo,
                    updatedAt: serverTimestamp()
                });
            }

            transaction.set(listRef, listData);

            if (data.type === 'territory' && data.territories && Array.isArray(data.territories)) {
                const snapshotsRef = collection(db, SNAPSHOTS_TABLE);
                
                data.territories.forEach((t: any) => {
                    const snapRef = doc(snapshotsRef);
                    transaction.set(snapRef, {
                        sharedListId: shareId,
                        congregationId: data.congregationId,
                        itemId: t.id,
                        type: 'territory',
                        data: { ...t, visitStatus: 'none' },
                        createdAt: serverTimestamp()
                    });
                });

                addressesDocs.forEach(d => {
                    const snapRef = doc(snapshotsRef);
                    transaction.set(snapRef, {
                        sharedListId: shareId,
                        congregationId: data.congregationId,
                        itemId: d.id,
                        type: 'address',
                        data: {
                            ...d.data(),
                            visitStatus: d.data().visitStatus === 'doNotVisit' ? 'doNotVisit' : 'none'
                        },
                        createdAt: serverTimestamp()
                    });
                });
            }
        });

        return { success: true, id: shareId, shareData: { id: shareId, ...listData } };
    } catch (error: any) {
        console.error('Error creating shared list:', error);
        return { success: false, error: error.message };
    }
}

export async function getSharedList(id: string) {
    try {
        const docSnap = await getDoc(doc(db, LISTS_TABLE, id));
        if (!docSnap.exists()) throw new Error('Link não encontrado');

        const list = { id: docSnap.id, ...docSnap.data() } as any;

        // Check expiration
        if (list.expiresAt) {
            const expires = list.expiresAt.toDate();
            if (new Date() > expires) {
                return { success: false, error: 'Link expirado', code: 'EXPIRED' };
            }
        }

        return { success: true, data: list };
    } catch (error: any) {
        console.error('Error getting shared list:', error);
        return { success: false, error: error.message };
    }
}

export async function updateSharedListStatus(id: string, status: 'active' | 'completed' | 'archived') {
    try {
        await updateDoc(doc(db, LISTS_TABLE, id), {
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
        await deleteDoc(doc(db, LISTS_TABLE, id));
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
        const docSnap = await getDoc(doc(db, LISTS_TABLE, id));
        if (!docSnap.exists()) {
            return { success: false, error: 'Link não encontrado', status: 404 };
        }

        const list = { id: docSnap.id, ...docSnap.data() } as any;

        // Verifica expiração
        const expiresAt = list.expiresAt;
        if (expiresAt) {
            const now = new Date();
            const expires = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
            if (now > expires) {
                return { success: false, error: 'Link expirado', status: 410 };
            }
        }

        // Busca os snapshots em paralelo
        const snapshotsQuery = query(
            collection(db, SNAPSHOTS_TABLE),
            where('sharedListId', '==', id)
        );
        
        // Busca o histórico de visitas
        const visitsQuery = query(
            collection(db, VISITS_TABLE),
            where('sharedListId', '==', id)
        );

        const [snapshotsSnap, visitsSnap] = await Promise.all([
            getDocs(snapshotsQuery),
            getDocs(visitsQuery)
        ]);

        const items = snapshotsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const visits = visitsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Busca categoria da congregação e normaliza para o tipo usado no App
        let congregationType: 'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE' = 'TRADITIONAL';
        const congregationId = list.congregationId;
        if (congregationId) {
            try {
                const congSnap = await getDoc(doc(db, 'congregations', congregationId));
                if (congSnap.exists()) {
                    const category = ((congSnap.data() as any).category || '').toLowerCase();
                    if (category.includes('sinais')) congregationType = 'SIGN_LANGUAGE';
                    else if (category.includes('estrangeiro')) congregationType = 'FOREIGN_LANGUAGE';
                    else congregationType = 'TRADITIONAL';
                }
            } catch (err: any) {
                console.warn('Could not read congregation for shared list (might be public access):', err.message);
                if (list.congregationType) {
                    congregationType = list.congregationType;
                }
            }
        }

        return {
            success: true,
            list,
            items,
            visits,
            congregationType // Retorna o tipo normalizado
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
        const listRef = doc(db, LISTS_TABLE, id);
        const { territoryId, undo, userId, userName, userCongregationId } = payload;

        // PRE-FETCH: Operações pesadas sem lock
        let snapshotsDocsToUpdate: any[] = [];
        if (action === 'returnTerritory' && territoryId) {
            const snapshotsQuery = query(collection(db, SNAPSHOTS_TABLE), where('sharedListId', '==', id), where('itemId', '==', territoryId));
            const snapshotsSnap = await getDocs(snapshotsQuery);
            snapshotsDocsToUpdate = snapshotsSnap.docs;
        }

        await runTransaction(db, async (transaction) => {
            // FASE 1: LEITURAS
            const listSnap = await transaction.get(listRef);
            if (!listSnap.exists()) throw new Error('Lista não encontrada');
            const listData = listSnap.data() as any;

            const territoryDocs = [];
            if (action === 'returnMap') {
                if (listData.items && Array.isArray(listData.items)) {
                    for (const tId of listData.items) {
                        const terrRef = doc(db, 'territories', tId);
                        const terrDoc = await transaction.get(terrRef);
                        territoryDocs.push({ tId, terrRef, terrDoc });
                    }
                }
            } else if (action === 'returnTerritory' && territoryId) {
                const terrRef = doc(db, 'territories', territoryId);
                const terrDoc = await transaction.get(terrRef);
                territoryDocs.push({ tId: territoryId, terrRef, terrDoc });
            }

            // FASE 2: VALIDAÇÃO (Domínio)
            if (action === 'returnMap') {
                for (const { tId, terrDoc } of territoryDocs) {
                    if (terrDoc.exists()) {
                        const tState = { id: terrDoc.id, ...terrDoc.data() } as any;
                        const val = canReturnTerritory(tState, payload.currentUserRole || null, userId || listData.assignedTo);
                        if (!val.valid) throw new Error(`Falha ao devolver território ${tId}: ${val.message}`);
                    }
                }
            } else if (action === 'returnTerritory' && territoryId) {
                const { terrDoc } = territoryDocs[0];
                if (terrDoc.exists()) {
                    const tState = { id: terrDoc.id, ...terrDoc.data() } as any;
                    if (undo) {
                        const valAssign = canAssignTerritory(tState, userId || listData.assignedTo);
                        if (!valAssign.valid) throw new Error(valAssign.message);
                    } else {
                        const valReturn = canReturnTerritory(tState, payload.currentUserRole || null, userId || listData.assignedTo);
                        if (!valReturn.valid) throw new Error(valReturn.message);
                    }
                }
            }

            // FASE 3: ESCRITAS (Sem leitura daqui pra baixo)
            if (action === 'returnMap') {
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + 24);

                for (const { terrRef, terrDoc } of territoryDocs) {
                    if (terrDoc.exists()) {
                        transaction.update(terrRef, {
                            status: 'Disponível',
                            assignedTo: null,
                            updatedAt: serverTimestamp()
                        });
                    }
                }

                transaction.update(listRef, {
                    status: 'completed',
                    returnedAt: serverTimestamp(),
                    expiresAt: Timestamp.fromDate(expiresAt)
                });

            } else if (action === 'returnTerritory' && territoryId) {
                const newStatus = undo ? 'active' : 'completed';
                const { terrRef, terrDoc } = territoryDocs[0];
                
                if (terrDoc.exists()) {
                    if (undo) {
                        transaction.update(terrRef, {
                            status: 'Emprestado',
                            assignedTo: userId || listData.assignedTo,
                            updatedAt: serverTimestamp()
                        });
                    } else {
                        transaction.update(terrRef, {
                            status: 'Disponível',
                            assignedTo: null,
                            updatedAt: serverTimestamp()
                        });
                    }
                }

                snapshotsDocsToUpdate.forEach(snap => {
                    transaction.update(snap.ref, { 'data.visitStatus': newStatus });
                });

                if (undo && listData?.status === 'completed') {
                    transaction.update(listRef, {
                        status: 'active',
                        returnedAt: null,
                        expiresAt: null
                    });
                }
            }
        });

        if (action === 'returnMap') return { success: true, message: 'Mapa devolvido com sucesso!' };
        if (action === 'returnTerritory') return { success: true, message: undo ? 'Devolução desfeita!' : 'Território devolvido!' };

        // AÇÃO 3: Aceitar responsabilidade pela lista
        if (action === 'acceptResponsibility') {
            if (!userId) {
                throw new Error('Usuário não informado');
            }

            await updateDoc(listRef, {
                assignedTo: userId,
                assignedName: userName || 'Irmão sem Nome',
                status: 'active'
            });

            // Vincula o usuário à congregação da lista se ele ainda não tiver
            if (userCongregationId) {
                const userRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.data() as any;

                if (userData && !userData.congregationId) {
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
