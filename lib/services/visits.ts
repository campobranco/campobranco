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
    writeBatch
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
            publisherName: visitData.userName || visitData.publisherName || null,
            sharedListId: shareId,
            congregationId: list.congregationId,
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, TABLE), finalVisitData);

        // Atualiza ativamente o documento do endereço correspondente com o status
        if (visitData.addressId) {
            try {
                await updateDoc(doc(db, 'addresses', visitData.addressId), {
                    visitStatus: visitData.status,
                    lastVisitedAt: new Date().toISOString(),
                    lastVisitedBy: visitData.userId || null,
                    notes: visitData.notes || ''
                });
            } catch (err) {
                console.warn('Silent skip address update (permissions caching or timeout)', err);
            }
        }

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

        // Também reverte o status de visita do endereço
        try {
            batch.update(doc(db, 'addresses', addressId), {
                visitStatus: null,
                lastVisitedAt: null,
                lastVisitedBy: null
            });
        } catch (err) {
            console.warn('Silent skip address reset', err);
        }

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting visit by address and share:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Marca todos os endereços não trabalhados como 'contacted' em lote.
 * Usado quando o usuário confirma "Todas as ruas foram trabalhadas" ao devolver o mapa.
 * 
 * - Busca snapshots de endereço do shared list
 * - Identifica quais ainda não possuem visita 'contacted'
 * - Cria/atualiza visitas em batch (Firestore writeBatch)
 * - Exclui endereços inativos e 'doNotVisit' do batch
 */
export async function markAllAddressesAsWorked(params: {
    shareId: string;
    userId: string;
    userName: string;
    territoryId?: string;
}): Promise<{ success: boolean; count: number; error?: string }> {
    try {
        const { shareId, userId, userName, territoryId } = params;

        // 1. Busca dados do shared list para congregationId
        const listSnap = await getDoc(doc(db, 'shared_lists', shareId));
        if (!listSnap.exists()) throw new Error('Lista não encontrada');
        const listData = listSnap.data()!;

        // 2. Busca snapshots de endereço do shared list
        const snapshotsSnap = await getDocs(
            query(collection(db, 'shared_list_snapshots'), where('sharedListId', '==', shareId))
        );

        const activeAddresses = snapshotsSnap.docs
            .filter(d => {
                const data = d.data();
                if (data.type !== 'address') return false;
                const addrData = data.data || {};
                if (addrData.isActive === false) return false;
                if (addrData.visitStatus === 'doNotVisit') return false;
                if (territoryId && addrData.territoryId !== territoryId) return false;
                return true;
            })
            .map(d => {
                const data = d.data();
                return { id: data.itemId, territoryId: (data.data || {}).territoryId };
            });

        if (activeAddresses.length === 0) return { success: true, count: 0 };

        // 3. Busca visitas existentes para este shared list
        const visitsSnap = await getDocs(
            query(collection(db, TABLE), where('sharedListId', '==', shareId))
        );
        const visitsByAddress = new Map<string, { ref: any; status: string }>();
        visitsSnap.docs.forEach(d => {
            const data = d.data();
            visitsByAddress.set(data.addressId, { ref: d.ref, status: data.status });
        });

        // 4. Filtra endereços que precisam ser marcados
        const toMark = activeAddresses.filter(addr => {
            const existing = visitsByAddress.get(addr.id);
            return !existing || existing.status !== 'contacted';
        });

        if (toMark.length === 0) return { success: true, count: 0 };

        // 5. Batch de operações (limite Firestore: 500 por batch)
        const visitDate = new Date().toISOString();
        const BATCH_LIMIT = 450;

        for (let i = 0; i < toMark.length; i += BATCH_LIMIT) {
            const chunk = toMark.slice(i, i + BATCH_LIMIT);
            const batchOp = writeBatch(db);

            for (const addr of chunk) {
                const existing = visitsByAddress.get(addr.id);

                if (existing) {
                    // Atualiza visita existente (ex: 'partial' → 'contacted')
                    batchOp.update(existing.ref, {
                        status: 'contacted',
                        notes: 'Marcado automaticamente na devolução',
                        updatedAt: serverTimestamp()
                    });
                } else {
                    // Cria nova visita
                    const visitRef = doc(collection(db, TABLE));
                    batchOp.set(visitRef, {
                        addressId: addr.id,
                        territoryId: addr.territoryId || territoryId,
                        userId,
                        userName,
                        publisherName: userName,
                        status: 'contacted',
                        notes: 'Marcado automaticamente na devolução',
                        visitDate,
                        sharedListId: shareId,
                        congregationId: listData.congregationId,
                        createdAt: serverTimestamp(),
                        tagsSnapshot: {
                            isDeaf: false,
                            isMinor: false,
                            isStudent: false,
                            isNeurodivergent: false
                        }
                    });
                }
            }

            await batchOp.commit();
        }

        return { success: true, count: toMark.length };
    } catch (error: any) {
        console.error('Error marking all addresses as worked:', error);
        return { success: false, count: 0, error: error.message };
    }
}

