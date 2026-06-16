import { reportVisit, deleteVisitByAddressAndShare } from '@/lib/services/visits';
import { MutationResult } from './types';

export interface ReportVisitInput {
    sharedListId: string;
    congregationId: string;
    territoryId: string;
    addressId: string;
    status: 'none' | 'completed' | 'doNotVisit';
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
        await reportVisit(input.sharedListId, input.congregationId, input.territoryId, input.addressId, input.status);
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
