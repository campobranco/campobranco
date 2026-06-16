import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MutationResult } from './types';

export interface EnsureUserProfileInput {
    uid: string;
    email: string | null;
    displayName: string | null;
    masterEmail: string;
    existingData?: any; // Se null, perfil não existe
}

/**
 * Contrato de Mutações de Autenticação e Perfil
 */

export async function ensureUserProfileMutation(input: EnsureUserProfileInput): Promise<MutationResult> {
    if (!input.uid) return { success: false, message: 'UID do usuário obrigatório.' };

    const userEmail = (input.email || '').trim().toLowerCase();
    const masterEmail = input.masterEmail.trim().toLowerCase();
    const isMaster = masterEmail && userEmail === masterEmail;
    
    const userRef = doc(db, 'users', input.uid);

    try {
        if (input.existingData) {
            // Se usuário já existe, mas é o Master e não está como ADMIN, corrija
            if (isMaster && input.existingData.role !== 'ADMIN') {
                console.log(`[AUTH MUTATION] Corrigindo role do Master para ADMIN`);
                await setDoc(userRef, { role: 'ADMIN', updatedAt: serverTimestamp() }, { merge: true });
            }
        } else {
            // Perfil novo
            console.log(`[AUTH MUTATION] Criando novo perfil. Admin? ${isMaster}`);
            await setDoc(userRef, {
                name: input.displayName || (isMaster ? 'Admin' : 'Membro'),
                email: input.email,
                role: isMaster ? 'ADMIN' : 'PUBLICADOR',
                congregationId: null,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error('[AUTH MUTATION] Erro ao garantir perfil do usuário:', error);
        return { success: false, message: error.message };
    }
}

export interface UpdateUserNotificationsInput {
    uid: string;
    enabled: boolean;
}

export async function updateUserNotificationsMutation(input: UpdateUserNotificationsInput): Promise<MutationResult> {
    if (!input.uid) return { success: false, message: 'UID do usuário obrigatório.' };

    try {
        const userRef = doc(db, 'users', input.uid);
        await setDoc(userRef, { notificationsEnabled: input.enabled }, { merge: true });
        return { success: true };
    } catch (error: any) {
        console.error('[AUTH MUTATION] Erro ao atualizar notificações:', error);
        return { success: false, message: error.message };
    }
}
