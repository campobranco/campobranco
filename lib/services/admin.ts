import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Busca todas as congregações
 */
export async function getCongregations() {
    try {
        const snapshot = await getDocs(collection(db, 'congregations'));
        const congregations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as any)
        }));
        return { success: true, congregations };
    } catch (error: any) {
        console.error("Error fetching congregations:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Salva ou cria uma congregação
 */
export async function saveCongregation(data: any) {
    try {
        const { id, name, city, category, term_type, customId } = data;
        let finalId = customId || id;
        
        if (!finalId) {
            finalId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }

        const congRef = doc(db, 'congregations', finalId);
        await setDoc(congRef, {
            name,
            city,
            category,
            term_type,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true, id: finalId };
    } catch (error: any) {
        console.error("Error saving congregation:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Deleta uma congregação
 */
export async function deleteCongregation(id: string, force: boolean = false) {
    try {
        if (!force) {
            // Check for relations before deleting
            const collectionsToCheck = ['users', 'territories', 'cities', 'shared_lists'];
            for (const col of collectionsToCheck) {
                const q = query(collection(db, col), where('congregationId', '==', id));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    return { success: false, error: `Não é possível excluir. Existem registros (${snap.size}) em '${col}' vinculados a esta congregação.`, code: 'HAS_RELATIONS' };
                }
            }
        }

        // Se for force, poderíamos apagar tudo, mas no client-side é muito pesado.
        // O ideal é alertar o usuário para migrar os dados ou que a deleção forçada precisará limpar essas coleções manualmente.
        if (force) {
             const collectionsToClean = ['users', 'territories', 'cities', 'shared_lists', 'addresses', 'visits', 'witnessing_points'];
             for (const col of collectionsToClean) {
                 const q = query(collection(db, col), where('congregationId', '==', id));
                 const snap = await getDocs(q);
                 if (!snap.empty) {
                     const batch = writeBatch(db);
                     snap.docs.forEach(d => batch.delete(d.ref));
                     await batch.commit();
                 }
             }
        }

        await deleteDoc(doc(db, 'congregations', id));
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting congregation:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Migra dados de uma congregação antiga para um novo ID
 */
export async function migrateCongregation(oldId: string, newId: string) {
    try {
        if (!oldId || !newId || oldId === newId) throw new Error("IDs inválidos");

        // 1. Fetch old congregation
        const oldCongRef = doc(db, 'congregations', oldId);
        const oldCongSnap = await getDoc(oldCongRef);
        if (!oldCongSnap.exists()) throw new Error("Congregação original não encontrada.");
        
        const originalCong = oldCongSnap.data();

        // 2. Create new congregation
        const newCongRef = doc(db, 'congregations', newId);
        const newCongSnap = await getDoc(newCongRef);
        if (!newCongSnap.exists()) {
            await setDoc(newCongRef, {
                ...originalCong,
                updatedAt: new Date().toISOString()
            });
        }

        // 3. Update related collections
        const collections = ['cities', 'users', 'territories', 'addresses', 'witnessing_points', 'shared_lists', 'visits'];
        for (const collName of collections) {
            const q = query(collection(db, collName), where('congregationId', '==', oldId));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
                let batch = writeBatch(db);
                let count = 0;
                for (const d of snapshot.docs) {
                    batch.update(d.ref, { congregationId: newId });
                    count++;
                    if (count === 400) {
                        await batch.commit();
                        batch = writeBatch(db);
                        count = 0;
                    }
                }
                if (count > 0) {
                    await batch.commit();
                }
            }
        }

        // 4. Delete old congregation
        await deleteDoc(oldCongRef);
        
        return { success: true };
    } catch (error: any) {
        console.error("Migration error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Atualiza um usuário (somente campos permitidos como name, role, congregation_id)
 */
export async function updateUser(userId: string, data: any) {
    try {
        if (!userId) throw new Error("ID do usuário inválido");

        const userRef = doc(db, 'users', userId);
        
        await setDoc(userRef, {
            ...data,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error("Error updating user:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Exclui um usuário e seus rastros de dados das coleções
 */
export async function deleteUser(userId: string) {
    try {
        if (!userId) throw new Error("ID do usuário inválido");

        // 1. Verificar registros vinculados (Visitas e shared_lists criadas ou atribuídas)
        const visitsQuery = query(collection(db, 'visits'), where('created_by', '==', userId));
        const visitsSnap = await getDocs(visitsQuery);
        
        const listsQuery = query(collection(db, 'shared_lists'), where('assigned_to', '==', userId));
        const listsSnap = await getDocs(listsQuery);

        if (!visitsSnap.empty || !listsSnap.empty) {
            return {
                success: false, 
                error: `Este membro possui ${visitsSnap.size} visitas e ${listsSnap.size} listas vinculadas.`,
                code: 'HAS_RELATIONS'
            };
        }

        // 2. Excluir o usuário
        await deleteDoc(doc(db, 'users', userId));

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Repara um registro órfão
 */
export async function repairOrphanData(id: string, type: string, updates: any) {
    try {
        if (!id || !type || !updates) throw new Error("Parâmetros inválidos");

        const collectionName = type === 'address' ? 'addresses' :
            type === 'territory' ? 'territories' :
                type === 'witnessing' ? 'witnessing_points' :
                    type === 'visit' ? 'visits' :
                        type === 'city' ? 'cities' : type;

        const docRef = doc(db, collectionName, id);
        
        await updateDoc(docRef, {
            ...updates,
            updatedAt: new Date().toISOString()
        });

        return { success: true, id };
    } catch (error: any) {
        console.error("Error repairing orphan data:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Exclui em massa registros órfãos
 */
export async function bulkDeleteOrphans(ids: string[], originalCollectionName: string) {
    try {
        if (!ids || ids.length === 0 || !originalCollectionName) {
            throw new Error("IDs e coleção são obrigatórios.");
        }

        let batch = writeBatch(db);
        let count = 0;
        let total = 0;

        for (const id of ids) {
            batch.delete(doc(db, originalCollectionName, id));
            count++;
            total++;

            if (count === 400) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
        }

        return { success: true, count: total };
    } catch (error: any) {
        console.error("Error bulk deleting orphans:", error);
        return { success: false, error: error.message };
    }
}


