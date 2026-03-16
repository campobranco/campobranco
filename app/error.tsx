"use client";

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw, Home, Bug as BugIcon } from 'lucide-react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Opcionalmente logar o erro em um serviço externo
        console.error('Erro capturado pelo ErrorBoundary:', error);
    }, [error]);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <div className="relative bg-white dark:bg-slate-900 p-8 rounded-full shadow-2xl border border-red-100 dark:border-red-900/30">
                    <AlertCircle className="w-20 h-20 text-red-500" />
                </div>
            </div>

            <h1 className="text-4xl font-black text-main mb-4 tracking-tight">
                Ops! Algo deu errado.
            </h1>

            <p className="text-muted text-lg max-w-md mx-auto mb-10 leading-relaxed">
                Ocorreu um erro inesperado no sistema. Não se preocupe, seus dados estão seguros, mas a página precisou ser interrompida.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-md mx-auto">
                <button
                    onClick={() => reset()}
                    className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <RefreshCcw className="w-5 h-5" />
                    Tentar Novamente
                </button>

                <Link
                    href="/dashboard"
                    className="flex-1 bg-surface border border-surface-border text-main font-bold py-4 px-8 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <Home className="w-5 h-5" />
                    Ir para o Início
                </Link>
            </div>

            <div className="mt-20 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20 max-w-sm mx-auto">
                <p className="text-[10px] font-mono text-red-600 dark:text-red-400 break-all opacity-80">
                    ID do Erro: {error.digest || 'n/a'}
                </p>
                <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-widest">
                    Erro crítico de Runtime
                </p>
            </div>
        </div>
    );
}
