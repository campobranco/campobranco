import { createSharedList, processSharedListAction, deleteSharedList } from '@/lib/services/shared_lists';
import { MutationResult } from './types';
import { logActivity } from '@/lib/services/audit_logs';

export interface AssignTerritoryInput {
    title: string;
    type: 'territory' | 'LIST_CARDS';
    items: string[];
    congregationId: string;
    assignedTo: string;
    assignedName: string;
    expiresInHours?: number;
    territories?: any[];
}

export interface ReturnTerritoryInput {
    shareId: string;
    territoryId: string;
    userId: string;
    userName: string;
    userCongregationId: string;
    currentUserRole?: string | null;
    undo?: boolean;
}

export interface ReturnMapInput {
    shareId: string;
    userId: string;
    userName: string;
    userCongregationId: string;
    currentUserRole?: string | null;
}

/**
 * Contrato de Mutações de Território.
 * assignedTo é OPCIONAL — Links Abertos são suportados.
 */
export async function assignTerritoryMutation(input: AssignTerritoryInput): Promise<MutationResult<{ id: string, shareData: any }>> {
    // 1. Schema check (presença de dados - Edge Input Guard)
    // assignedTo é OPCIONAL pois suportamos Links Abertos.
    if (!input.congregationId) {
        return { success: false, code: 'MISSING_CONGREGATION', message: 'Faltam dados da congregação.' };
    }
    if (input.type === 'territory' && (!input.territories || input.territories.length === 0)) {
        return { success: false, message: 'Nenhum território selecionado.' };
    }

    // Encaminha para o Executor de Infra (Service puro)
    const result = await createSharedList(input);
    if (!result.success) {
        return { 
            success: false, 
            code: result.code || 'ASSIGN_FAILED',
            message: result.error || 'Falha ao designar.' 
        };
    }

    logActivity({
        level: 'INFO',
        category: 'ASSIGNMENTS',
        action: 'MAP_ASSIGN',
        message: `MAP_ASSIGN: Cartão/Território "${input.title}" designado para ${input.assignedName || 'Publicador'}`,
        congregationId: input.congregationId,
        details: `ShareID: ${result.id} | Tipo: ${input.type}`
    });

    return { 
        success: true, 
        data: { id: result.id!, shareData: result.shareData } 
    };
}

export async function returnTerritoryMutation(input: ReturnTerritoryInput): Promise<MutationResult> {
    if (!input.shareId || !input.territoryId) {
        return { success: false, message: 'Faltam dados de identificação do território ou mapa.' };
    }

    const payload = {
        territoryId: input.territoryId,
        undo: !!input.undo,
        userId: input.userId,
        userName: input.userName,
        userCongregationId: input.userCongregationId,
        currentUserRole: input.currentUserRole
    };

    const result = await processSharedListAction(input.shareId, 'returnTerritory', payload);

    if (result.success) {
        logActivity({
            level: 'INFO',
            category: 'ASSIGNMENTS',
            action: input.undo ? 'MAP_TERRITORY_RETURN_UNDO' : 'MAP_TERRITORY_RETURN',
            message: input.undo
                ? `MAP_TERRITORY_RETURN_UNDO: Devolução de território desfeita por "${input.userName || 'Usuário'}"`
                : `MAP_TERRITORY_RETURN: Território devolvido por "${input.userName || 'Usuário'}"`,
            congregationId: input.userCongregationId,
            targetId: input.territoryId,
            targetUser: input.userName || undefined,
            details: `ShareID: ${input.shareId} | TerritoryID: ${input.territoryId} | Undo: ${!!input.undo}`
        });
    }

    return { success: result.success, message: result.message, error: result.error };
}

export async function returnMapMutation(input: ReturnMapInput): Promise<MutationResult> {
    if (!input.shareId) {
        return { success: false, message: 'ID do mapa não fornecido.' };
    }

    const payload = {
        userId: input.userId,
        userName: input.userName,
        userCongregationId: input.userCongregationId,
        currentUserRole: input.currentUserRole
    };

    const result = await processSharedListAction(input.shareId, 'returnMap', payload);

    if (result.success) {
        logActivity({
            level: 'INFO',
            category: 'ASSIGNMENTS',
            action: 'MAP_RETURN',
            message: `MAP_RETURN: Mapa devolvido por "${input.userName || 'Usuário'}"`,
            congregationId: input.userCongregationId,
            targetId: input.shareId,
            targetUser: input.userName || undefined,
            details: `ShareID: ${input.shareId} | Devolvido por: ${input.userName || input.userId}`
        });
    }

    return { success: result.success, message: result.message, error: result.error };
}

export interface AcceptResponsibilityInput {
    shareId: string;
    userId: string;
    userName: string;
    userCongregationId: string;
}

export async function acceptResponsibilityMutation(input: AcceptResponsibilityInput): Promise<MutationResult> {
    if (!input.shareId || !input.userId) {
        return { success: false, message: 'Faltam dados para aceitar responsabilidade.' };
    }

    const payload = {
        userId: input.userId,
        userName: input.userName,
        userCongregationId: input.userCongregationId
    };

    const result = await processSharedListAction(input.shareId, 'acceptResponsibility', payload);

    if (result.success) {
        logActivity({
            level: 'INFO',
            category: 'ASSIGNMENTS',
            action: 'MAP_ACCEPTED',
            message: `MAP_ACCEPTED: Responsabilidade de mapa aceita por "${input.userName || input.userId}"`,
            congregationId: input.userCongregationId,
            targetId: input.shareId,
            targetUser: input.userName || input.userId,
            details: `ShareID: ${input.shareId} | Aceito por: ${input.userName || input.userId}`
        });
    }

    return { success: result.success, message: result.message, error: result.error };
}

export async function deleteSharedListMutation(id: string): Promise<MutationResult> {
    const result = await deleteSharedList(id);
    return { success: result.success, error: result.error };
}
