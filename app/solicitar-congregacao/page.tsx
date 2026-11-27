'use client';

import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/app/context/I18nContext';

export default function RequestCongregationPage() {
    const { t } = useTranslation();
    const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL || "";

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans text-main">
            <div className="bg-surface border border-surface-border max-w-md w-full rounded-[2.5rem] p-8 shadow-xl space-y-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-500" />

                <div className="w-24 h-24 bg-blue-50 dark:bg-blue-950/30 rounded-full flex items-center justify-center mx-auto text-blue-500 shadow-sm border border-blue-100 dark:border-blue-900/30">
                    <Mail className="w-10 h-10" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-2xl font-black text-main tracking-tight">{t('requestCongregation.title')}</h1>
                    <p className="text-muted font-medium text-sm leading-relaxed">
                        {t('requestCongregation.subtitle')}
                    </p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-gray-100 dark:border-slate-700/50 space-y-4">
                    <p className="text-sm text-muted">
                        {t('requestCongregation.instructions')}
                    </p>
                    <div className="bg-surface p-4 rounded-xl border border-surface-border shadow-sm">
                        <p className="text-xs text-muted font-bold uppercase tracking-wider mb-1">{t('requestCongregation.contactEmailLabel')}</p>
                        <a href={`mailto:${email}`} className="text-primary dark:text-blue-400 font-bold text-lg hover:underline break-all">
                            {email}
                        </a>
                    </div>
                </div>

                <Link
                    href="/dashboard"
                    className="w-full bg-surface hover:bg-gray-100 dark:hover:bg-slate-800 text-main font-bold py-4 rounded-2xl border border-surface-border transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                >
                    <ArrowLeft className="w-5 h-5" />
                    {t('requestCongregation.backBtn')}
                </Link>
            </div>
        </div>
    );
}
