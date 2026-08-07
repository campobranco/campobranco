// lib/services/audit_logs.ts
// Serviço centralizado de auditoria e registro de atividades de usuários (System Activity Logs)

import {
    collection,
    doc,
    getDoc,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
export type LogCategory = 'TERRITORY' | 'CONGREGATION' | 'MEMBERS' | 'ASSIGNMENTS' | 'WITNESSING' | 'REPORTS' | 'AUTH' | 'ADMIN';

export interface SystemLog {
    id?: string;
    timestamp: any;
    timestampMs?: number;
    level: LogLevel;
    category: LogCategory;
    action: string;
    message: string;
    user?: string;
    userId?: string;
    role?: string;
    congregationId?: string;
    correlationId?: string;
    userAgent?: string;
    ip?: string;
    details?: string;
    // Campos de auditoria estruturada (opcionais)
    targetId?: string;
    targetUser?: string;
    before?: unknown;
    after?: unknown;
    metadata?: Record<string, unknown>;
}

const COLLECTION = 'system_logs';

/**
 * Registra uma ação de auditoria no Firestore.
 */
export async function logActivity(params: {
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
    // Auditoria estruturada
    targetId?: string;
    targetUser?: string;
    before?: unknown;
    after?: unknown;
    metadata?: Record<string, unknown>;
}) {
    try {
        const currentUser = auth.currentUser;
        const actorName = currentUser?.email || params.user || currentUser?.displayName || 'Sistema';
        const actorUid = params.userId || currentUser?.uid || '';
        
        let actorRole = params.role || '';
        if (!actorRole && currentUser) {
            const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || '').trim().toLowerCase();
            const userEmail = (currentUser.email || '').trim().toLowerCase();

            if (masterEmail && userEmail === masterEmail) {
                actorRole = 'ADMIN';
            } else if (currentUser.uid) {
                try {
                    const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDocSnap.exists() && userDocSnap.data().role) {
                        actorRole = userDocSnap.data().role;
                    } else {
                        actorRole = 'PUBLICADOR';
                    }
                } catch (e) {
                    actorRole = 'PUBLICADOR';
                }
            }
        }
        if (!actorRole) actorRole = 'PUBLICADOR';

        const nowMs = Date.now();
        const ua = params.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconhecido');
        const cid = params.correlationId || `req_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;

        const payload: Record<string, unknown> = {
            level: params.level || 'INFO',
            category: params.category,
            action: params.action,
            message: params.message,
            user: actorName,
            userId: actorUid,
            role: actorRole,
            congregationId: params.congregationId ?? null,
            correlationId: cid,
            userAgent: ua,
            timestampMs: nowMs,
            details: params.details || '',
            timestamp: serverTimestamp()
        };

        // Campos de auditoria estruturada — gravados apenas quando presentes
        if (params.targetId !== undefined) payload.targetId = params.targetId;
        if (params.targetUser !== undefined) payload.targetUser = params.targetUser;
        if (params.before !== undefined) payload.before = params.before;
        if (params.after !== undefined) payload.after = params.after;
        if (params.metadata !== undefined) payload.metadata = params.metadata;

        await addDoc(collection(db, COLLECTION), payload);
    } catch (error) {
        console.error('Falha ao gravar log de atividade:', error);
    }
}

/**
 * Registra falhas de permissão / acesso negado no Firestore.
 */
export async function logPermissionDenied(action: string, category: LogCategory = 'AUTH', details?: string) {
    try {
        await logActivity({
            level: 'WARN',
            category,
            action: 'PERMISSION_DENIED',
            message: `PERMISSAO_NEGADA: Tentativa de executar "${action}" sem privilégios suficientes`,
            details: details || 'Operação bloqueada por falta de permissão ou regra de acesso'
        });
    } catch (e) {
        console.error('Falha ao registrar log de permissão negada:', e);
    }
}

/**
 * Mapeia um documento Firestore para o tipo SystemLog.
 */
function mapDocToLog(docSnap: any): SystemLog {
    const data = docSnap.data();
    let dateStr = 'Data recente';

    if (data.timestamp instanceof Timestamp) {
        dateStr = data.timestamp.toDate().toLocaleString('pt-BR');
    } else if (data.timestamp?.toDate) {
        dateStr = data.timestamp.toDate().toLocaleString('pt-BR');
    } else if (typeof data.timestamp === 'string') {
        dateStr = data.timestamp;
    }

    return {
        id: docSnap.id,
        timestamp: dateStr,
        timestampMs: data.timestampMs || undefined,
        level: data.level || 'INFO',
        category: data.category || 'TERRITORY',
        action: data.action || '',
        message: data.message || '',
        user: data.user || 'Desconhecido',
        userId: data.userId || '',
        role: data.role || undefined,
        congregationId: data.congregationId || '',
        correlationId: data.correlationId || undefined,
        userAgent: data.userAgent || undefined,
        details: data.details || '',
        targetId: data.targetId || undefined,
        targetUser: data.targetUser || undefined,
        before: data.before ?? undefined,
        after: data.after ?? undefined,
        metadata: data.metadata ?? undefined,
    };
}

export interface GetSystemLogsOptions {
    pageSize?: number;
    /** Cursor para paginação — último documento retornado na página anterior */
    startAfterDoc?: any;
    /** Filtro opcional por categoria */
    category?: LogCategory;
    /** Filtro opcional por level */
    level?: LogLevel;
}

export interface GetSystemLogsResult {
    success: boolean;
    logs?: SystemLog[];
    /** Último documento do snapshot, para usar como cursor na próxima página */
    lastDoc?: any;
    hasMore?: boolean;
    error?: string;
}

/**
 * Busca logs do sistema com paginação via cursor (startAfter).
 * Nunca carrega todos os documentos — respeita o limite do Firebase Spark.
 *
 * @param options.pageSize    Documentos por página (padrão 50, máximo 100)
 * @param options.startAfterDoc Cursor da página anterior (último doc retornado)
 * @param options.category    Filtra por categoria diretamente na query
 * @param options.level       Filtra por level diretamente na query
 */
export async function getSystemLogs(options: GetSystemLogsOptions | number = {}): Promise<GetSystemLogsResult> {
    try {
        // Compatibilidade retroativa: aceita número simples como pageSize
        const opts: GetSystemLogsOptions = typeof options === 'number'
            ? { pageSize: options }
            : options;

        const pageSize = Math.min(opts.pageSize ?? 50, 100);
        const logsRef = collection(db, COLLECTION);

        // Constrói a query dinamicamente
        const constraints: any[] = [orderBy('timestamp', 'desc')];

        if (opts.category) {
            constraints.push(where('category', '==', opts.category));
        }
        if (opts.level) {
            constraints.push(where('level', '==', opts.level));
        }

        // Paginação via cursor: busca pageSize + 1 para detectar se há próxima página
        constraints.push(limit(pageSize + 1));

        if (opts.startAfterDoc) {
            // Insere startAfter antes do limit na lista de constraints
            const startAfterConstraint = require('firebase/firestore').startAfter(opts.startAfterDoc);
            // Reordena: orderBy → where... → startAfter → limit
            constraints.splice(constraints.length - 1, 0, startAfterConstraint);
        }

        const q = query(logsRef, ...constraints);
        const snapshot = await getDocs(q);

        const hasMore = snapshot.docs.length > pageSize;
        const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

        const logs: SystemLog[] = docs.map(mapDocToLog);

        return {
            success: true,
            logs,
            lastDoc: docs.length > 0 ? docs[docs.length - 1] : undefined,
            hasMore,
        };
    } catch (error: any) {
        console.error('Erro ao carregar logs do Firestore:', error);
        return { success: false, error: error.message };
    }
}
