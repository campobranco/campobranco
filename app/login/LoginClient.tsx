"use client";

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { AlertCircle, Mail, Lock } from 'lucide-react';

import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { useAppIcon } from '@/app/context/AppIconContext';
import { logActivityMutation as logActivity } from '@/lib/contracts/mutations/auditMutations';

export default function LoginClient() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showEmailLogin, setShowEmailLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');

        try {
            let res;
            if (Capacitor.isNativePlatform()) {
                // No APK nativo Android/iOS, usa o login nativo do Firebase via Capacitor Plugin
                res = await FirebaseAuthentication.signInWithGoogle();
            } else {
                // No navegador Web/PWA, usa o signInWithPopup oficial do Firebase SDK
                const provider = new GoogleAuthProvider();
                provider.addScope('email');
                provider.addScope('profile');
                provider.setCustomParameters({ prompt: 'select_account' });

                res = await signInWithPopup(auth, provider);
            }

            logActivity({
                level: 'INFO',
                category: 'AUTH',
                action: 'USER_LOGIN',
                message: `USER_LOGIN: Login efetuado via Google por ${res.user?.email || 'usuário'}`,
                user: res.user?.email || undefined,
                userId: res.user?.uid || undefined,
                details: `Método: Google OAuth | Origem: ${Capacitor.isNativePlatform() ? 'App Nativo' : 'Navegador Web'}`
            });

            router.push('/dashboard');
        } catch (error: any) {
            console.error("Erro no login com Google:", error);
            if (
                error.code !== 'auth/popup-closed-by-user' && 
                error.code !== 'auth/cancelled-popup-request' && 
                error.code !== '12501' && 
                error.message !== 'canceled'
            ) {
                setError("Erro ao conectar com Google. Use o login com e-mail ou tente novamente.");
                setShowEmailLogin(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Por favor, preencha todos os campos.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            
            logActivity({
                level: 'INFO',
                category: 'AUTH',
                action: 'USER_LOGIN',
                message: `USER_LOGIN: Login efetuado via E-mail por ${userCred.user?.email || email}`,
                user: userCred.user?.email || email,
                userId: userCred.user?.uid || undefined,
                details: `Método: E-mail/Senha`
            });

            router.push('/dashboard');
        } catch (error: any) {
            console.error("Erro no login com e-mail:", error);
            switch (error.code) {
                case 'auth/invalid-email':
                    setError("Endereço de e-mail inválido.");
                    break;
                case 'auth/user-disabled':
                    setError("Esta conta foi desativada.");
                    break;
                case 'auth/user-not-found':
                    setError("Usuário não encontrado.");
                    break;
                case 'auth/wrong-password':
                    setError("Senha incorreta.");
                    break;
                case 'auth/invalid-credential':
                    setError("E-mail ou senha incorretos.");
                    break;
                default:
                    setError("Erro ao fazer login com e-mail e senha. Verifique suas credenciais.");
            }
            setLoading(false);
        }
    };

    const { appIconSrc } = useAppIcon();

    return (
        <div className="min-h-[100dvh] bg-primary dark:bg-background flex flex-col items-center justify-center p-6 font-sans transition-colors duration-300 relative z-10">
            <div className="w-full max-w-sm">
                <div className="bg-white dark:bg-surface rounded-2xl p-8 shadow-2xl animate-in slide-in-from-bottom-12 fade-in duration-1000 border border-transparent dark:border-surface-border transition-colors">
                    <div className="text-center mb-8">
                        <div className="w-24 h-24 flex items-center justify-center mx-auto mb-2">
                            <img src={appIconSrc} alt="Campo Branco" width={96} height={96} className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-1">Campo Branco</h1>
                        <p className="text-primary dark:text-primary-light text-[10px] font-bold opacity-80 uppercase tracking-widest">Acesso Restrito</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs font-bold rounded-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/30 animate-in shake duration-500">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span className="break-words flex-1">{error}</span>
                        </div>
                    )}

                    {!showEmailLogin ? (
                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-gray-500 dark:text-gray-300 text-sm font-medium">Escolha uma forma de login para entrar.</p>
                            </div>

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

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
                                <span className="flex-shrink mx-4 text-gray-400 dark:text-gray-505 text-[10px] font-bold uppercase tracking-wider">ou</span>
                                <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowEmailLogin(true);
                                    setError('');
                                }}
                                className="w-full bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light font-bold py-3.5 px-6 rounded-xl border border-gray-100 dark:border-gray-800 transition-all flex items-center justify-center gap-2 text-xs"
                            >
                                <Mail className="w-4 h-4" />
                                Fazer login com email e senha
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleEmailLogin} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">E-mail</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seuemail@exemplo.com"
                                        className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-medium rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-medium rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold py-4 px-6 rounded-xl transition-all active:scale-95 disabled:opacity-70 shadow-md flex items-center justify-center gap-2 mt-6"
                            >
                                {loading ? 'Carregando...' : 'Entrar'}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowEmailLogin(false);
                                    setError('');
                                }}
                                className="w-full text-center text-xs font-bold text-gray-400 dark:text-gray-550 hover:text-primary dark:hover:text-primary-light transition-colors py-2 mt-2"
                            >
                                Voltar para login principal
                            </button>
                        </form>
                    )}

                    <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-850 pt-6">
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-[0.2em]">Exclusivo para membros autorizados</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

