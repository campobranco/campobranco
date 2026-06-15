import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    serverTimestamp,
    writeBatch,
    increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TABLE = 'addresses';

export async function getAddresses(congregationId: string, cityId?: string | null, territoryId?: string | null) {
    try {
        let q = query(
            collection(db, TABLE),
            where('congregationId', '==', congregationId)
        );

        if (cityId) {
            q = query(q, where('cityId', '==', cityId));
        }

        if (territoryId) {
            q = query(q, where('territoryId', '==', territoryId));
        }

        const snapshot = await getDocs(q);
        const addresses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        return { success: true, addresses };
    } catch (error: any) {
        console.error('Error fetching addresses:', error);
        return { success: false, error: error.message };
    }
}

export async function saveAddress(id: string | null, data: any) {
    try {
        if (id) {
            // 1. Edição: busca o registro atual para detectar mudança em isActive
            const oldSnap = await getDoc(doc(db, TABLE, id));
            if (!oldSnap.exists()) {
                throw new Error('Endereço não encontrado');
            }
            const oldData = oldSnap.data();
            const wasActive = oldData.isActive !== false;
            const isActive = data.isActive !== false;

            const batch = writeBatch(db);
            const addressRef = doc(db, TABLE, id);

            batch.update(addressRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });

            // Se o status de atividade mudou, ajusta a contagem de endereços ativos no bairro
            if (wasActive !== isActive && data.cityId) {
                const cityRef = doc(db, 'cities', data.cityId);
                batch.set(cityRef, {
                    stats: {
                        totalAddresses: increment(isActive ? 1 : -1)
                    }
                }, { merge: true });
            }

            await batch.commit();
            return { success: true, id };
        } else {
            // 2. Criação
            const batch = writeBatch(db);
            const newAddressRef = doc(collection(db, TABLE));

            // Endereço novo é criado ativo por padrão
            batch.set(newAddressRef, {
                ...data,
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Incrementa stats.totalAddresses no bairro
            if (data.cityId) {
                const cityRef = doc(db, 'cities', data.cityId);
                batch.set(cityRef, {
                    stats: {
                        totalAddresses: increment(1)
                    }
                }, { merge: true });
            }

            await batch.commit();
            return { success: true, id: newAddressRef.id };
        }
    } catch (error: any) {
        console.error('Error saving address:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteAddress(id: string) {
    try {
        // 1. Busca prévia do endereço para obter cityId e status isActive
        const addrSnap = await getDoc(doc(db, TABLE, id));
        if (!addrSnap.exists()) {
            throw new Error('Endereço não encontrado');
        }
        const addrData = addrSnap.data();
        const cityId = addrData.cityId;
        const isActive = addrData.isActive !== false;

        const batch = writeBatch(db);

        // Deleta o documento do endereço
        batch.delete(doc(db, TABLE, id));

        // Se o endereço estava ativo, decrementa o stats.totalAddresses no bairro correspondente
        if (isActive && cityId) {
            const cityRef = doc(db, 'cities', cityId);
            batch.set(cityRef, {
                stats: {
                    totalAddresses: increment(-1)
                }
            }, { merge: true });
        }

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting address:', error);
        return { success: false, error: error.message };
    }
}
