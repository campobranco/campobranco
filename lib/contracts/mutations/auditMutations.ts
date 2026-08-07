import { logActivity, getSystemLogs, SystemLog, LogLevel, LogCategory, GetSystemLogsOptions, GetSystemLogsResult } from '@/lib/services/audit_logs';

export type { SystemLog, LogLevel, LogCategory };

export interface LogActivityInput {
    level?: LogLevel;
    category: LogCategory;
    action: string;
    message: string;
    user?: string;
    userId?: string;
    role?: string;
    congregationId?: string;
    correlationId?: string;
    userAgent?: string;
    details?: string;
}

/**
 * Contrato de Mutações e Consultas para Logs de Auditoria
 */
export async function logActivityMutation(input: Parameters<typeof logActivity>[0]) {
    return await logActivity(input);
}

export async function getSystemLogsQuery(options: GetSystemLogsOptions | number = {}): Promise<GetSystemLogsResult> {
    return await getSystemLogs(options);
}

export async function logPermissionDeniedMutation(action: string, category: LogCategory = 'AUTH', details?: string) {
    const { logPermissionDenied } = await import('@/lib/services/audit_logs');
    return await logPermissionDenied(action, category, details);
}
