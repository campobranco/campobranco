import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MutationResult } from './types';
import { logActivity } from '@/lib/services/audit_logs';

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

    const userEmail = input.email.trim().toLowerCase();
    const masterEmail = (input.masterEmail || '').trim().toLowerCase();
    const isMaster = Boolean(masterEmail && userEmail === masterEmail);
    
    const userName = (input.displayName && input.displayName.trim()) ? input.displayName.trim() : userEmail.split('@')[0];
    
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
            // Perfil novo: verifica se existe pré-cadastro administrativo com ID temporário/aleatório para o mesmo e-mail
            let preCreatedData: any = null;
            let preCreatedDocId: string | null = null;

            try {
                const usersColl = collection(db, 'users');
                const preQuery = query(usersColl, where('email', '==', userEmail));
                const preSnap = await getDocs(preQuery);

                if (!preSnap.empty) {
                    const preDoc = preSnap.docs.find(d => d.id !== input.uid);
                    if (preDoc) {
                        preCreatedDocId = preDoc.id;
                        preCreatedData = preDoc.data();
                        console.log(`[AUTH MUTATION] Pré-cadastro encontrado em users/${preCreatedDocId} para ${userEmail}`);
                    }
                }
            } catch (searchErr) {
                console.warn(`[AUTH MUTATION] Não foi possível verificar pré-cadastros por e-mail:`, searchErr);
            }

            const finalName = preCreatedData?.name || userName;
            const finalRole = isMaster ? 'ADMIN' : (preCreatedData?.role || assignedRole);
            const finalCongId = preCreatedData?.congregationId || null;
            const finalPermissions = preCreatedData?.permissions || null;

            console.log(`[AUTH MUTATION] Criando/vinculando perfil para users/${input.uid}. Admin? ${isMaster}`);
            await setDoc(userRef, {
                name: finalName,
                email: userEmail,
                role: finalRole,
                congregationId: finalCongId,
                permissions: finalPermissions,
                updatedAt: serverTimestamp(),
                createdAt: preCreatedData?.createdAt || serverTimestamp(),
            });

            // Se existia documento temporário anterior com ID pré-gerado, efetua a limpeza sem duplicar registros
            if (preCreatedDocId) {
                try {
                    console.log(`[AUTH MUTATION] Removendo documento pré-cadastro temporário: users/${preCreatedDocId}`);
                    await deleteDoc(doc(db, 'users', preCreatedDocId));
                } catch (delErr) {
                    console.warn(`[AUTH MUTATION] Erro ao remover pré-cadastro temporário ${preCreatedDocId}:`, delErr);
                }
            }

            logActivity({
                level: 'INFO',
                category: 'MEMBERS',
                action: 'ACCOUNT_CREATED',
                message: `ACCOUNT_CREATED: Perfil gravado e vinculado para "${userEmail}"`,
                targetId: input.uid,
                targetUser: userEmail,
                details: `Cargo: ${finalRole} | Congregação: ${finalCongId || 'N/A'} | Migrado de pré-cadastro? ${Boolean(preCreatedDocId)}`
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
