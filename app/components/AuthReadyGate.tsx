'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AuthReadyGateProps {
    children: React.ReactNode;
    requireAuth?: boolean;
    requireCongregation?: boolean;
    requireRole?: boolean;
    fallback?: React.ReactNode;
}

/**
 * AuthReadyGate
 * 
 * Previne renderização de componentes de UI que dependem de estado asíncrono
 * do contexto de autenticação (como congregationId, role, permissions) 
 * antes que esses dados estejam efetivamente disponíveis na memória.
 * 
 * Também lida com o redirecionamento automático de usuários não autenticados
 * para a tela de login quando requireAuth for verdadeiro.
 */
export function AuthReadyGate({ 
    children, 
    requireAuth = true,
    requireCongregation = true,
    requireRole = true,
    fallback
}: AuthReadyGateProps) {
    const { user, loading, congregationId, role } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (requireAuth && !loading && !user) {
            console.log("[AuthReadyGate] Usuário não autenticado em rota protegida, redirecionando para /login...");
            router.push('/login');
        }
    }, [user, loading, requireAuth, router]);

    if (loading) {
        return fallback ? <>{fallback}</> : (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Se não exige autenticação e o usuário está deslogado, renderiza os filhos imediatamente
    if (!requireAuth && !user) {
        return <>{children}</>;
    }

    if (!user) {
        return fallback ? <>{fallback}</> : null;
    }

    // Condições de UI Readiness
    const missingCongregation = requireCongregation && !congregationId;
    const missingRole = requireRole && !role;

    if (missingCongregation || missingRole) {
        // Estado incompleto de hidratação ou perfil não configurado
        return fallback ? <>{fallback}</> : (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-main">Perfil Incompleto</h3>
                    <p className="text-muted max-w-sm mt-2">
                        Seu perfil ainda não está vinculado a uma congregação ou não possui as permissões necessárias carregadas. 
                        Aguarde um momento ou atualize a página.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
