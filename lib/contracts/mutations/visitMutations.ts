import { reportVisit, deleteVisitByAddressAndShare, markAllAddressesAsWorked } from '@/lib/services/visits';
import { MutationResult } from './types';

export interface ReportVisitInput {
    sharedListId: string;
    congregationId: string;
    territoryId: string;
    addressId: string;
    status: string;
    notes?: string;
    visitDate?: any;
    tagsSnapshot?: Record<string, boolean>;
    userName?: string;
}

export interface DeleteVisitInput {
    addressId: string;
    sharedListId: string;
}

export async function reportVisitMutation(input: ReportVisitInput): Promise<MutationResult> {
    if (!input.sharedListId || !input.addressId) {
        return { success: false, message: 'Dados inválidos para registrar a visita.' };
    }

    try {
        const { sharedListId, ...visitData } = input;
        await reportVisit(sharedListId, visitData);
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteVisitMutation(input: DeleteVisitInput): Promise<MutationResult> {
    if (!input.addressId || !input.sharedListId) {
        return { success: false, message: 'ID de endereço ou mapa não fornecidos.' };
    }

    try {
        await deleteVisitByAddressAndShare(input.addressId, input.sharedListId);
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// ----------------------------------------------------
// Histórico de Visitas (Dashboard)
// ----------------------------------------------------

import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UpdateVisitHistoryInput {
    visitId: string;
    notes: string;
    status: string;
}

export async function updateVisitHistoryMutation(input: UpdateVisitHistoryInput): Promise<MutationResult> {
    if (!input.visitId) return { success: false, message: 'ID da visita obrigatório.' };

    try {
        const visitRef = doc(db, 'visits', input.visitId);
        await updateDoc(visitRef, {
            notes: input.notes,
            status: input.status,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export interface DeleteVisitHistoryInput {
    visitId: string;
}

export async function deleteVisitHistoryMutation(input: DeleteVisitHistoryInput): Promise<MutationResult> {
    if (!input.visitId) return { success: false, message: 'ID da visita obrigatório.' };

    try {
        const visitRef = doc(db, 'visits', input.visitId);
        await deleteDoc(visitRef);
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// ----------------------------------------------------
// Marcar Todos como Trabalhados (Devolução)
// ----------------------------------------------------

export interface MarkAllAsWorkedInput {
    shareId: string;
    userId: string;
    userName: string;
    territoryId?: string;
}

export async function markAllAsWorkedMutation(input: MarkAllAsWorkedInput): Promise<MutationResult> {
    if (!input.shareId || !input.userId) {
        return { success: false, message: 'Dados insuficientes para marcar endereços.' };
    }

    try {
        const result = await markAllAddressesAsWorked(input);
        if (!result.success) throw new Error(result.error || 'Erro ao marcar endereços');
        return { success: true, message: `${result.count} endereço(s) marcado(s) como trabalhado(s).` };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

