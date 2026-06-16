// lib/domain/territoryRules.ts

export interface ValidationResult {
    valid: boolean;
    code?: string;
    message?: string;
}

export interface TerritoryState {
    id: string;
    status?: string | null;
    assignedTo?: string | null;
}

export interface TerritoryDependencies {
    activeAddressesCount: number;
}

/**
 * Regras de Negócio para Designação de Territórios
 */
export function canAssignTerritory(
    territory: TerritoryState, 
    targetUserId?: string | null
): ValidationResult {
    
    // Cenário: Dados corrompidos (apenas null explícito, undefined é considerado legado/disponível)
    if (territory.status === null) {
        return { valid: false, code: "INVALID_TERRITORY_STATE", message: "Estado do território é nulo." };
    }

    // Cenário: Usuário inexistente
    if (!targetUserId || targetUserId.trim() === '') {
        return { valid: false, code: "USER_NOT_FOUND", message: "Usuário alvo não informado ou inexistente." };
    }

    const s = (territory.status || "disponível").toLowerCase();

    // Cenário: Status inválido
    if (s !== "disponível" && s !== "available" && s !== "emprestado" && s !== "assigned") {
        return { valid: false, code: "INVALID_STATUS", message: `Status do território não é reconhecido: ${territory.status}` };
    }

    // Cenário: Território já emprestado (Integridade de Estado)
    if (s === "emprestado" || s === "assigned") {
        return { valid: false, code: "TERRITORY_ALREADY_ASSIGNED", message: "Território já está emprestado." };
    }

    // Cenário: Território disponível + Usuário Válido
    return { valid: true };
}

/**
 * Regras de Negócio para Devolução de Territórios
 */
export function canReturnTerritory(
    territory: TerritoryState, 
    currentUserRole: string | null, 
    currentUserId: string
): ValidationResult {
    
    if (territory.status === null) {
        return { valid: false, code: "INVALID_TERRITORY_STATE", message: "Estado do território é nulo." };
    }

    const s = (territory.status || "disponível").toLowerCase();

    // Cenário: Devolver algo que não está emprestado (Integridade)
    if (s !== "emprestado" && s !== "assigned") {
        return { valid: false, code: "TERRITORY_NOT_ASSIGNED", message: "O território não está emprestado no momento." };
    }

    // Cenário: Admin/Ancião devolvendo território de terceiros
    if (currentUserRole === 'ADMIN' || currentUserRole === 'ANCIAO') {
        return { valid: true };
    }

    // Cenário: Usuário não é o responsável
    if (territory.assignedTo !== currentUserId) {
        return { valid: false, code: "UNAUTHORIZED_RETURN", message: "Apenas o responsável atual pode devolver este território." };
    }

    // Cenário: Usuário é o atual responsável
    return { valid: true };
}

/**
 * Regras de Negócio para Exclusão de Territórios
 */
export function canDeleteTerritory(
    territory: TerritoryState, 
    deps: TerritoryDependencies
): ValidationResult {
    
    // Cenário: Bloquear exclusão se existirem dependências
    if (deps.activeAddressesCount > 0) {
        return { 
            valid: false, 
            code: "HAS_DEPENDENCIES", 
            message: `Não é possível excluir este território. Existem ${deps.activeAddressesCount} endereços vinculados. Remova ou transfira os endereços primeiro.` 
        };
    }

    return { valid: true };
}
