// app/login/LoginClient.tsx
// Página de login usando Firebase Auth com provider Google

"use client";

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

export default function LoginClient() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');

        try {
            // Autenticação via popup do Google (Firebase)
            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            provider.setCustomParameters({ prompt: 'select_account' });

            await signInWithPopup(auth, provider);

            // Após login bem-sucedido, o AuthContext detecta via onAuthStateChanged
            // e faz o redirect automaticamente
            router.push('/dashboard');
        } catch (error: any) {
            console.error("Erro no login com Google:", error);
            // Ignora cancelamento do popup pelo usuário
            if (error.code !== 'auth/popup-closed-by-user') {
                setError("Erro ao conectar com Google. Tente novamente.");
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-primary dark:bg-background flex flex-col items-center justify-center p-6 font-sans transition-colors duration-300 relative z-10">
            <div className="w-full max-w-sm">
                <div className="bg-white dark:bg-surface rounded-2xl p-8 shadow-2xl animate-in slide-in-from-bottom-12 fade-in duration-1000 border border-transparent dark:border-surface-border transition-colors">
                    <div className="text-center mb-8">
                        <div className="w-24 h-24 flex items-center justify-center mx-auto mb-2">
                            <img src="/app-icon.svg" alt="Campo Branco" width={96} height={96} className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-1">Campo Branco</h1>
                        <p className="text-primary dark:text-primary-light text-[10px] font-bold opacity-80 uppercase tracking-widest">Acesso Restrito</p>
                    </div>

                    <div className="mb-8 text-center">
                        <p className="text-gray-500 dark:text-gray-300 text-sm font-medium">Clique no botão abaixo para entrar.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs font-bold rounded-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/30 animate-in shake duration-500">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white font-extrabold py-4 px-6 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/80 hover:border-gray-200 dark:hover:border-gray-600 flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-70 shadow-sm"
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span>{loading ? 'Carregando...' : 'Entrar com Google'}</span>
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-[10px] text-gray-300 dark:text-gray-500 font-bold uppercase tracking-[0.2em]">Exclusivo para membros autorizados</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
