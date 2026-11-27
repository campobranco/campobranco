"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Loader2, LogOut } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/app/context/AuthContext';
import { useTranslation } from '@/app/context/I18nContext';
import { toast } from 'sonner';

export default function TermsConsentModal() {
    const { user, loading, termsAccepted, logout } = useAuth();
    const { t } = useTranslation();
    const pathname = usePathname();
    const [saving, setSaving] = useState(false);

    // Não exibir enquanto carrega, se não estiver logado, se já aceitou, ou nas rotas /login e /legal/*
    if (loading || !user || termsAccepted) return null;
    if (pathname?.startsWith('/login') || pathname?.startsWith('/legal')) return null;

    const handleAccept = async () => {
        setSaving(true);
        try {
            await setDoc(
                doc(db, 'users', user.uid),
                { termsAcceptedAt: serverTimestamp() },
                { merge: true }
            );
        } catch (err) {
            console.error('[TermsConsentModal] Erro ao salvar aceite:', err);
            toast.error(t('legalConsent.saveError'));
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error('[TermsConsentModal] Erro ao sair:', err);
        } finally {
            window.location.href = '/login';
        }
    };

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-consent-title"
        >
            <div className="bg-surface border border-surface-border rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-2xl bg-primary-light/40 dark:bg-primary-dark/30 text-primary flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-7 h-7" />
                </div>

                <div className="text-center space-y-2">
                    <h2 id="terms-consent-title" className="text-xl font-black text-main tracking-tight">
                        {t('legalConsent.title')}
                    </h2>
                    <p className="text-sm text-muted leading-relaxed">
                        {t('legalConsent.description')}
                    </p>
                </div>

                <div className="bg-background border border-surface-border rounded-2xl p-4 text-center text-xs font-semibold text-muted">
                    <Link href="/legal/terms" className="text-primary hover:underline">
                        {t('legalConsent.termsLink')}
                    </Link>{' '}
                    {t('legalConsent.andText')}{' '}
                    <Link href="/legal/privacy" className="text-primary hover:underline">
                        {t('legalConsent.privacyLink')}
                    </Link>
                </div>

                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={handleAccept}
                        disabled={saving}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-2xl transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('legalConsent.acceptingBtn')}
                            </>
                        ) : (
                            t('legalConsent.acceptBtn')
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={saving}
                        className="w-full bg-surface hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 font-bold py-3 rounded-2xl border border-surface-border hover:border-red-200 dark:hover:border-red-900/50 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                    >
                        <LogOut className="w-4 h-4" />
                        {t('legalConsent.logoutBtn')}
                    </button>
                </div>
            </div>
        </div>
    );
}
