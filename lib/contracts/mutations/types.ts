export interface MutationResult<T = void> {
    success: boolean;
    code?: string;
    message?: string;
    error?: string; // Para legacy fallbacks
    data?: T;
}
