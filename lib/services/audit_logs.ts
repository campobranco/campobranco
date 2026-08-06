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
export type LogCategory = 'TERRITORY' | 'CONGREGATION' | 'MEMBERS' | 'ASSIGNMENTS' | 'WITNESSING' | 'REPORTS' | 'AUTH';

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

        const payload = {
            level: params.level || 'INFO',
            category: params.category,
            action: params.action,
            message: params.message,
            user: actorName,
            userId: actorUid,
            role: actorRole,
            congregationId: params.congregationId || '',
            correlationId: cid,
            userAgent: ua,
            timestampMs: nowMs,
            details: params.details || '',
            timestamp: serverTimestamp()
        };

        await addDoc(collection(db, COLLECTION), payload);
    } catch (error) {
        console.error('Falha ao gravar log de atividade:', error);
    }
}

/**
 * Busca logs do sistema ordenados do mais recente para o mais antigo.
 */
export async function getSystemLogs(max: number = 100): Promise<{ success: boolean; logs?: SystemLog[]; error?: string }> {
    try {
        const logsRef = collection(db, COLLECTION);
        let q = query(logsRef, orderBy('timestamp', 'desc'), limit(max));

        const snapshot = await getDocs(collection(db, COLLECTION));

        const logs: SystemLog[] = snapshot.docs.map(doc => {
            const data = doc.data();
            let dateStr = 'Data recente';
            
            if (data.timestamp instanceof Timestamp) {
                dateStr = data.timestamp.toDate().toLocaleString('pt-BR');
            } else if (data.timestamp?.toDate) {
                dateStr = data.timestamp.toDate().toLocaleString('pt-BR');
            } else if (typeof data.timestamp === 'string') {
                dateStr = data.timestamp;
            }

            return {
                id: doc.id,
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
                details: data.details || ''
            };
        });

        // Ordenação fallback em memória se necessário
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return { success: true, logs };
    } catch (error: any) {
        console.error('Erro ao carregar logs do Firestore:', error);
        return { success: false, error: error.message };
    }
}
