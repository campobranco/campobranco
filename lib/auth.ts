// lib/auth.ts
// Funções de autenticação e autorização para uso nas API routes (servidor)
// Usa Firebase Admin SDK para verificar tokens JWT sem expô-los ao cliente

import { adminAuth, adminDb } from './firebase-admin';
import { cookies } from 'next/headers';
import { LRUCache } from 'lru-cache';

export interface AuthorizedUser {
    uid: string;
    email?: string;
    role: string;
    roles: string[];
    congregationId?: string;
    [key: string]: any;
}

// Cache global para perfis de usuário (evita batidas no Firestore em todo request SSR)
// Mantém até 500 usuários por 10 minutos
const userCache = new LRUCache<string, AuthorizedUser>({
    max: 500,
    ttl: 1000 * 60 * 10, // 10 minutos
});

// Verifica o token de autenticação presente nos cookies ou no header Authorization
export async function checkAuth(req?: Request): Promise<AuthorizedUser | null> {
    try {
        let token = '';

        // 1. Tenta pegar do Header (Bearer) primeiro
        if (req) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        // 2. Se não houver header, tenta pegar do Cookie
        if (!token) {
            try {
                const cookieStore = await cookies();
                token = cookieStore.get('__session')?.value || '';
            } catch (e) {
                // Em alguns contextos (Edge/Build) cookies() pode falhar
            }
        }

        if (!token) return null;

        // Verifica e decodifica o token JWT via Firebase Admin
        const decodedToken = await adminAuth.verifyIdToken(token);
        const uid = decodedToken.uid;

        // Tenta buscar do cache primeiro (Velocidade)
        const cachedUser = userCache.get(uid);
        if (cachedUser) return cachedUser;

        // Busca o perfil completo do usuário no Firestore caso não esteja em cache
        const userDoc = await adminDb.collection('users').doc(uid).get();
        const userData = userDoc.data();

        let user: AuthorizedUser;

        if (!userData) {
            user = {
                uid,
                email: decodedToken.email,
                role: 'PUBLICADOR',
                roles: ['PUBLICADOR'],
            };
        } else {
            user = {
                uid,
                email: decodedToken.email,
                role: userData.role || 'PUBLICADOR',
                roles: [userData.role || 'PUBLICADOR'],
                congregationId: userData.congregationId,
                ...userData
            };
        }

        // Salva no cache antes de retornar
        userCache.set(uid, user);
        return user;
    } catch (error: any) {
        // Se o erro for token expirado, falha silenciosamente
        if (error.code === 'auth/id-token-expired') {
            return null;
        }
        console.error('[AUTH] Falha na verificação do token Firebase:', error);
        return null;
    }
}

// Exige autenticação e opcionalmente um conjunto de papéis permitidos
export async function requireAuth(req: Request, allowedRoles?: string[]): Promise<AuthorizedUser> {
    const user = await checkAuth(req);

    if (!user) {
        throw new Error('Unauthorized');
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const hasPermission = allowedRoles.includes(user.role) || user.role === 'ADMIN';
        if (!hasPermission) {
            throw new Error('Forbidden');
        }
    }

    return user;
}

