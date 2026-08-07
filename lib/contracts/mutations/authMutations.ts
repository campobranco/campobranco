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

export const VALID_USER_ROLES = ['ADMIN', 'SUPER_ADMIN', 'ANCIAO', 'SERVO', 'PUBLICADOR'] as const;

export async function ensureUserProfileMutation(input: EnsureUserProfileInput): Promise<MutationResult> {
    if (!input.uid) return { success: false, message: 'UID do usuário obrigatório.' };
    if (!input.email || !input.email.trim()) return { success: false, message: 'E-mail do usuário obrigatório.' };
    if (!input.displayName || !input.displayName.trim()) return { success: false, message: 'Nome do usuário obrigatório.' };

    const userEmail = input.email.trim().toLowerCase();
    const masterEmail = (input.masterEmail || '').trim().toLowerCase();
    const isMaster = Boolean(masterEmail && userEmail === masterEmail);
    
    const assignedRole = isMaster ? 'ADMIN' : 'PUBLICADOR';
    if (!VALID_USER_ROLES.includes(assignedRole as any)) {
        throw new Error(`Role de usuário inválida: '${assignedRole}'. Use: ${VALID_USER_ROLES.join(', ')}`);
    }

    const userRef = doc(db, 'users', input.uid);

    try {
        if (input.existingData) {
            if (input.existingData.role && !VALID_USER_ROLES.includes(input.existingData.role as any)) {
                throw new Error(`Role de usuário existente inválida: '${input.existingData.role}'.`);
            }
            // Se usuário já existe, mas é o Master e não está como ADMIN, corrija
            if (isMaster && input.existingData.role !== 'ADMIN') {
                console.log(`[AUTH MUTATION] Corrigindo role do Master para ADMIN`);
                await setDoc(userRef, { role: 'ADMIN', updatedAt: serverTimestamp() }, { merge: true });
            }
        } else {
            // Perfil novo
            console.log(`[AUTH MUTATION] Criando novo perfil. Admin? ${isMaster}`);
            await setDoc(userRef, {
                name: input.displayName.trim(),
                email: userEmail,
                role: assignedRole,
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
