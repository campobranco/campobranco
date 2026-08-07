// lib/utils/formatters.ts
// Utilitários de formatação compartilhados

/**
 * Formata o tempo restante de validade de um cartão/link compartilhado.
 */
export const formatExpirationTime = (expiresAtValue: any): string => {
    if (!expiresAtValue) return "Por tempo indeterminado";
    const expiresAt = typeof expiresAtValue.toDate === 'function' ? expiresAtValue.toDate() : new Date(expiresAtValue);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    if (diffMs <= 0) return "Vencido";
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffHours / 24);
    if (diffDays > 1000) return "Por tempo indeterminado";
    if (diffHours < 1) return "Vence em menos de uma hora";
    if (diffHours < 24) return `Vence em ${Math.floor(diffHours)} horas`;
    return `Faltam ${diffDays} dias`;
};
