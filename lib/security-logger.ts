// lib/security-logger.ts
// Sistema centralizado de logs de segurança para auditoria e monitoramento
// Registra eventos críticos como tentativas de login, acessos não autorizados e erros de sistema

import { adminDb } from './firebase-admin';

export interface SecurityLog {
    timestamp: string;
    type: 'AUTH_ATTEMPT' | 'UNAUTHORIZED_ACCESS' | 'SENSITIVE_DATA_ACCESS' | 'SYSTEM_ERROR' | 'RATE_LIMIT_EXCEEDED';
    severity: 'INFO' | 'WARN' | 'CRITICAL';
    uid?: string;
    email?: string;
    resource?: string;
    action?: string;
    success?: boolean;
    ip?: string;
    userAgent?: string;
    details?: any;
}

export class SecurityLogger {
    /**
     * Registra uma tentativa de autenticação
     */
    static async logAuthAttempt(uid: string, email: string, success: boolean, ip?: string, userAgent?: string) {
        return this.log({
            timestamp: new Date().toISOString(),
            type: 'AUTH_ATTEMPT',
            severity: success ? 'INFO' : 'WARN',
            uid,
            email,
            success,
            ip,
            userAgent,
            action: 'LOGIN'
        });
    }

    /**
     * Registra uma tentativa de acesso a um recurso sem as permissões necessárias
     */
    static async logUnauthorizedAccess(uid: string, resource: string, action: string, ip?: string) {
        return this.log({
            timestamp: new Date().toISOString(),
            type: 'UNAUTHORIZED_ACCESS',
            severity: 'CRITICAL',
            uid,
            resource,
            action,
            ip,
            details: 'Acesso negado pelo middleware ou API enforcement'
        });
    }

    /**
     * Registra quando um limite de requisições é excedido
     */
    static async logRateLimitExceeded(ip: string, resource: string) {
        return this.log({
            timestamp: new Date().toISOString(),
            type: 'RATE_LIMIT_EXCEEDED',
            severity: 'WARN',
            ip,
            resource,
            details: 'Bloqueio temporário por excesso de requisições'
        });
    }

    /**
     * Método interno para salvar o log no Firestore
     */
    private static async log(logData: SecurityLog) {
        try {
            // Em desenvolvimento, também logamos no console para facilidade de debug
            if (process.env.NODE_ENV === 'development') {
                console.log(`[SECURITY_${logData.type}]`, logData);
            }

            // Salva na coleção 'security_logs'
            // O Firestore Admin SDK ignora as Security Rules, o que é ideal para logs de auditoria
            await adminDb.collection('security_logs').add({
                ...logData,
                timestamp: new Date() // Adicionado para facilitar consultas por data no Firestore
            });
        } catch (error) {
            // Se falhar ao salvar o log, o app não deve quebrar, mas avisamos no console
            console.error('❌ Erro crítico ao gravar log de segurança:', error);
        }
    }
}
