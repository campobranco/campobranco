"use client";

import { useAuth } from '@/app/context/AuthContext';
import { LogOut, Link as LinkIcon, Users, MapPin, Building2, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NoCongregationPage() {
    const { user, role, logout, loading, profileName } = useAuth();
    const router = useRouter();

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
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
            <div className="bg-white max-w-md w-full rounded-[2.5rem] p-8 shadow-xl shadow-primary-light/500/5 space-y-8 text-center relative overflow-hidden">

                {/* Decoration - Mantido do layout unassigned */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-red-500" />

                <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-500 shadow-sm border border-orange-100">
                    <Shield className="w-10 h-10" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Sem Congregação</h1>
                    <p className="text-gray-500 font-medium text-sm leading-relaxed">
                        Olá, <strong>{profileName || 'visitante'}</strong>. Sua conta foi identificada, mas você ainda não pertence a nenhuma congregação.
                    </p>
                </div>

                <div className="space-y-4 bg-gray-50 p-6 rounded-3xl border border-gray-100 text-left">
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide flex items-center gap-2">
                        <Users className="w-4 h-4 text-orange-500" />
                        Como liberar meu acesso?
                    </h3>

                    <ul className="space-y-4 text-sm text-gray-600">
                        <li className="flex gap-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm h-fit">
                                <LinkIcon className="w-4 h-4 text-orange-500" />
                            </div>
                            <div>
                                <span className="font-bold text-gray-800">Peça um Convite</span>
                                <p className="text-xs mt-1">Solicite ao ancião ou servo de territórios o <span className="font-mono bg-orange-100 text-orange-600 px-1 rounded">Link de Convite</span>.</p>
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm h-fit">
                                <MapPin className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                                <span className="font-bold text-gray-800">Aceite um Território</span>
                                <p className="text-xs mt-1">Se você aceitar um link de território compartilhado, será vinculado automaticamente.</p>
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <div className="bg-white p-2 rounded-lg shadow-sm h-fit">
                                <Building2 className="w-4 h-4 text-orange-500" />
                            </div>
                            <div>
                                <span className="font-bold text-gray-800">Administrador?</span>
                                <p className="text-xs mt-1">Você pode <Link href="/solicitar-congregacao" className="text-orange-600 font-bold hover:underline">solicitar uma nova congregação</Link>.</p>
                            </div>
                        </li>
                    </ul>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full bg-white hover:bg-red-50 text-red-600 font-bold py-4 rounded-2xl border-2 border-transparent hover:border-red-100 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                >
                    <LogOut className="w-5 h-5" />
                    Sair da Conta
                </button>
            </div>
        </div>
    );
}
