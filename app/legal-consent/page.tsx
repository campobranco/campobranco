// app/legal-consent/page.tsx
// Página de consentimento legal para novos usuários
// Migrado de Supabase para Firebase Firestore (Client SDK)

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Shield, Check, Loader2, FileText, Lock, UserCheck, AlertOctagon } from 'lucide-react';
import { toast } from 'sonner';

export default function LegalConsentPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    // Individual checkboxes state
    const [checks, setChecks] = useState({
        terms: false,
        privacy: false,
        data: false,
        commitment: false
    });

    const allChecked = Object.values(checks).every(Boolean);

    // If user is not logged in, redirect to login
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const handleConfirm = async () => {
        if (!user || !allChecked) return;

        setSubmitting(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                termsAcceptedAt: serverTimestamp(),
                // Mantemos suporte ao campo legado se necessário, mas o padrão agora é camelCase
                termsAcceptedAt: new Date().toISOString()
            });

            // Forçar redirecionamento para garantir nova verificação de sessão
            window.location.href = '/dashboard';
        } catch (error) {
            console.error("Error updating consent:", error);
            toast.error("Erro ao salvar confirmação. Tente novamente.");
            setSubmitting(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-slate-800">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-light/20 dark:bg-primary-dark/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary dark:text-primary-light">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Consentimento Legal</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Para continuar utilizando o Campo Branco, precisamos que você leia e concorde com nossos documentos legais e compromissos de segurança.
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    {/* Terms */}
                    <label className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${checks.terms ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : 'bg-gray-50 dark:bg-slate-800 border-transparent hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>
                        <div className="pt-0.5">
                            <input
                                type="checkbox"
                                checked={checks.terms}
                                onChange={(e) => setChecks(prev => ({ ...prev, terms: e.target.checked }))}
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary/25 cursor-pointer"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span className="font-bold text-sm text-gray-900 dark:text-white">Termos de Uso</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                Li e concordo com as regras de utilização da plataforma.
                                <a href="/legal/terms" target="_blank" className="font-bold text-primary hover:underline ml-1">Ler documento</a>
                            </p>
                        </div>
                    </label>

                    {/* Privacy */}
                    <label className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${checks.privacy ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : 'bg-gray-50 dark:bg-slate-800 border-transparent hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>
                        <div className="pt-0.5">
                            <input
                                type="checkbox"
                                checked={checks.privacy}
                                onChange={(e) => setChecks(prev => ({ ...prev, privacy: e.target.checked }))}
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary/25 cursor-pointer"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Lock className="w-4 h-4 text-gray-400" />
                                <span className="font-bold text-sm text-gray-900 dark:text-white">Política de Privacidade</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                Entendo como meus dados são coletados e protegidos.
                                <a href="/legal/privacy" target="_blank" className="font-bold text-primary hover:underline ml-1">Ler documento</a>
                            </p>
                        </div>
                    </label>

                    {/* Data Usage */}
                    <label className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${checks.data ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : 'bg-gray-50 dark:bg-slate-800 border-transparent hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>
                        <div className="pt-0.5">
                            <input
                                type="checkbox"
                                checked={checks.data}
                                onChange={(e) => setChecks(prev => ({ ...prev, data: e.target.checked }))}
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary/25 cursor-pointer"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertOctagon className="w-4 h-4 text-gray-400" />
                                <span className="font-bold text-sm text-gray-900 dark:text-white">Uso de Dados</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                Concordo com as práticas de processamento de dados da congregação.
                                <a href="/legal/data-usage" target="_blank" className="font-bold text-primary hover:underline ml-1">Ler documento</a>
                            </p>
                        </div>
                    </label>

                    {/* Commitment */}
                    <label className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${checks.commitment ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-500' : 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/20'}`}>
                        {/* Destaque Badge */}
                        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                            Importante
                        </div>

                        <div className="pt-0.5">
                            <input
                                type="checkbox"
                                checked={checks.commitment}
                                onChange={(e) => setChecks(prev => ({ ...prev, commitment: e.target.checked }))}
                                className="w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500/25 cursor-pointer"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <UserCheck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                <span className="font-bold text-sm text-gray-900 dark:text-white">Compromisso do Usuário</span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                Comprometo-me a seguir as diretrizes éticas e de segurança.
                                <a href="/legal/user-commitment" target="_blank" className="font-bold text-orange-600 dark:text-orange-400 hover:underline ml-1">Ler documento</a>
                            </p>
                        </div>
                    </label>
                </div>

                <button
                    onClick={handleConfirm}
                    disabled={!allChecked || submitting}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 px-6 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-primary-light/30 flex items-center justify-center gap-2"
                >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    Confirmar e Continuar
                </button>

                <p className="mt-6 text-center text-[10px] text-gray-400 dark:text-gray-600 uppercase tracking-widest font-bold">
                    Segurança e Conformidade
                </p>
            </div>
        </div>
    );
}
