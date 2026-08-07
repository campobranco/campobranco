"use client";

import { useAuth } from '@/app/context/AuthContext';
import { LogOut, Link as LinkIcon, Users, MapPin, Building2, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UnassignedPage() {
    const { user, role, logout, loading, profileName } = useAuth();
    const router = useRouter();

    useEffect(() => {
        router.replace('/sem-congregacao');
    }, [router]);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (role === 'ADMIN') {
                router.push('/dashboard');
            }
        }
    }, [user, loading, role, router]);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans text-main">
            <div className="bg-surface border border-surface-border max-w-md w-full rounded-[2.5rem] p-8 shadow-xl space-y-8 text-center relative overflow-hidden">

                {/* Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500" />

                <div className="w-24 h-24 bg-orange-50 dark:bg-orange-950/30 rounded-full flex items-center justify-center mx-auto text-orange-500 shadow-sm border border-orange-100 dark:border-orange-900/30">
                    <Shield className="w-10 h-10" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-2xl font-black text-main tracking-tight">Acesso Restrito</h1>
                    <p className="text-muted font-medium text-sm leading-relaxed">
                        Olá, <strong>{profileName || 'visitante'}</strong>. Sua conta foi criada, mas você ainda não pertence a nenhuma congregação.
                    </p>
                </div>

                <div className="space-y-4 bg-gray-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-gray-100 dark:border-slate-700/50 text-left">
                    <h3 className="font-bold text-main text-sm uppercase tracking-wide flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary-light/500" />
                        Como liberar meu acesso?
                    </h3>

                    <ul className="space-y-4 text-sm text-muted">

                        <li className="flex gap-3">
                            <div className="bg-surface dark:bg-slate-700 p-2 rounded-lg shadow-sm border border-surface-border h-fit">
                                <LinkIcon className="w-4 h-4 text-primary-light/500" />
                            </div>
                            <div>
                                <span className="font-bold text-main">Peça um Convite</span>
                                <p className="text-xs mt-1">Solicite ao ancião ou servo de territórios o <span className="font-mono bg-primary-light/50 dark:bg-blue-900/40 text-primary dark:text-blue-300 px-1 rounded">Link de Convite</span> da congregação.</p>
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <div className="bg-surface dark:bg-slate-700 p-2 rounded-lg shadow-sm border border-surface-border h-fit">
                                <MapPin className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                                <span className="font-bold text-main">Aceite um Território</span>
                                <p className="text-xs mt-1">Se você abrir um link de território compartilhado e clicar em &quot;Aceitar&quot;, você será vinculado automaticamente.</p>
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <div className="bg-surface dark:bg-slate-700 p-2 rounded-lg shadow-sm border border-surface-border h-fit">
                                <Building2 className="w-4 h-4 text-orange-500" />
                            </div>
                            <div>
                                <span className="font-bold text-main">Administrador?</span>
                                <p className="text-xs mt-1">Se você é o responsável, pode <Link href="/solicitar-congregacao" className="text-orange-600 dark:text-orange-400 font-bold hover:underline">solicitar uma nova congregação</Link> para começar.</p>
                            </div>
                        </li>
                    </ul>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full bg-surface hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 font-bold py-4 rounded-2xl border border-surface-border hover:border-red-200 dark:hover:border-red-900/50 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                >
                    <LogOut className="w-5 h-5" />
                    Sair da Conta
                </button>
            </div>
        </div>
    );
}
