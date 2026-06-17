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

export async function findActiveSharedList(
    territoryIds: string[],
    congregationId: string
): Promise<{ id: string; shareData: any } | null> {
    try {
        if (!territoryIds.length) return null;
        // Busca listas ativas da congregação que contenham ao menos um dos territórios
        const q = query(
            collection(db, LISTS_TABLE),
            where('congregationId', '==', congregationId),
            where('status', '==', 'active'),
            where('items', 'array-contains', territoryIds[0])
        );
        const snap = await getDocs(q);
        if (snap.empty) return null;

        // Compara localmente conjuntos ordenados para suportar múltiplos territórios exatos
        const targetSorted = [...territoryIds].sort();

        for (const docObj of snap.docs) {
            const data = docObj.data();
            const items = data.items || [];
            if (items.length === targetSorted.length) {
                const itemsSorted = [...items].sort();
                const isExactMatch = itemsSorted.every((id, idx) => id === targetSorted[idx]);
                if (isExactMatch) {
                    return { id: docObj.id, shareData: { id: docObj.id, ...data } };
                }
            }
        }
        return null;
    } catch (error) {
        console.error('[findActiveSharedList] Falha ao consultar link ativo no Firestore:', error);
        return null;
    }
}

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

        const sortedTerritoryIds = [...data.items].sort();
        const businessKey = sortedTerritoryIds.join('_');
        const listRef = doc(db, 'shared_lists', businessKey);

        let resultLink: any = null;
        const recoveryLogs: any[] = [];
        let existingActiveLink = false;

        await runTransaction(db, async (transaction) => {
            // FASE 1: LEITURA ATÔMICA DO DOCUMENTO DE NEGÓCIO DETERMINÍSTICO (V18)
            const listSnap = await transaction.get(listRef);

            // Document Existence is the Lock: se o documento físico já existe no Firestore
            if (listSnap.exists()) {
                const listVal = listSnap.data() as any;
                if (listVal.status === 'active') {
                    existingActiveLink = true;
                    resultLink = { success: true, id: businessKey, shareData: { id: businessKey, ...listVal } };
                    return; // Retorno de idempotência segura
                }
                // Se existe mas não está ativo, aborta a escrita/sobrescrita direta para evitar overwrite concorrente
                throw new Error('DOCUMENT_ALREADY_EXISTS');
            }

            // Leitura dos territórios para validação e auditoria
            const territoryDocs = [];
            if (data.type === 'territory' && data.territories && Array.isArray(data.territories)) {
                for (const t of data.territories) {
                    const terrRef = doc(db, 'territories', t.id);
                    const terrDoc = await transaction.get(terrRef);
                    if (!terrDoc.exists()) {
                        throw new Error(`Território ${t.id} inexistente.`);
                    }
                    territoryDocs.push({ t, terrRef, terrDoc });
                }
            }

            // Inspeciona/valida territórios e coleta inconsistências para logging pós-commit
            for (const { terrDoc } of territoryDocs) {
                const tData = terrDoc.data() as any;

                // Verificação de conflito real: se o território está associado a outro link ativo
                if (tData.activeLinkId && tData.activeLinkId !== businessKey) {
                    const otherListRef = doc(db, 'shared_lists', tData.activeLinkId);
                    const otherListSnap = await transaction.get(otherListRef);
                    if (otherListSnap.exists() && otherListSnap.data()?.status === 'active') {
                        throw new Error('TERRITORY_ALREADY_ASSIGNED');
                    }
                }

                // Recomposição transacional automática (Self-Healing de domínio)
                const isOrphaned = !existingActiveLink;

                if (isOrphaned && (tData.status === 'Emprestado' || tData.activeLinkId)) {
                    recoveryLogs.push({
                        type: 'ORPHAN_RECOVERED',
                        territoryId: terrDoc.id,
                        previousStatus: tData.status,
                        previousActiveLinkId: tData.activeLinkId || null
                    });
                }

                const tState = {
                    id: terrDoc.id,
                    ...tData,
                    status: isOrphaned ? 'Disponível' : tData.status
                };

                // Valida as regras normais de domínio
                const validation = canAssignTerritory(tState, data.assignedTo);
                if (!validation.valid) {
                    throw new Error(validation.message || 'Território não disponível');
                }
            }

            const currentVersion = listSnap.exists() ? (listSnap.data()?.version || 0) : 0;
            const newVersion = currentVersion + 1;

            // FASE 3: ESCRITAS (Commit Único Lógico V19 - CAS Versionado)
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
                version: newVersion,
                assignedAt: serverTimestamp(),
                expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            // 1. Grava a shared_list incrementando a versão física (CAS)
            transaction.set(listRef, listData);

            // 2. Atualiza territórios com o activeLinkId atômico
            for (const { terrRef } of territoryDocs) {
                transaction.update(terrRef, {
                    status: 'Emprestado',
                    assignedTo: data.assignedTo,
                    activeLinkId: businessKey,
                    updatedAt: serverTimestamp()
                });
            }

            // 3. Grava log de reconciliação de concorrência com chave determinística para evitar double-writes nos logs (Idempotência de Log)
            if (recoveryLogs.length > 0) {
                recoveryLogs.forEach((rLog) => {
                    const logDeterministicId = `${businessKey}_${rLog.territoryId}_v${newVersion}`;
                    const logRef = doc(db, 'security_logs', logDeterministicId);
                    transaction.set(logRef, {
                        ...rLog,
                        reconciledToLinkId: businessKey,
                        version: newVersion,
                        createdAt: serverTimestamp()
                    });
                });
            }

            if (data.type === 'territory' && data.territories && Array.isArray(data.territories)) {
                const snapshotsRef = collection(db, SNAPSHOTS_TABLE);
                
                data.territories.forEach((t: any) => {
                    const snapRef = doc(snapshotsRef);
                    transaction.set(snapRef, {
                        sharedListId: businessKey,
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
                        sharedListId: businessKey,
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

            resultLink = { success: true, id: businessKey, shareData: { id: businessKey, ...listData } };
        });

        return resultLink;
    } catch (error: any) {
        console.error('Error creating shared list:', error);

        const isAlreadyAssignedError =
            error.message?.includes('Território já está emprestado') ||
            error.message?.includes('TERRITORY_ALREADY_ASSIGNED');

        if (isAlreadyAssignedError) {
            return {
                success: false,
                error: 'Este território já está emprestado em outra lista ativa. Escolha outro território.',
                code: 'TERRITORY_ALREADY_ASSIGNED'
            };
        }

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
                            activeLinkId: null, // Limpa o lock lógico na devolução
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
                            activeLinkId: id, // Restabelece o ID da shared list ao desfazer devolução
                            updatedAt: serverTimestamp()
                        });
                    } else {
                        transaction.update(terrRef, {
                            status: 'Disponível',
                            assignedTo: null,
                            activeLinkId: null, // Limpa o lock lógico na devolução
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
