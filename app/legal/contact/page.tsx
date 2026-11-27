'use client';

import { Mail, MessageSquare, Bug } from 'lucide-react';
import { useTranslation } from '@/app/context/I18nContext';

export default function ContactPage() {
    const { t } = useTranslation();
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco';
    const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL || '';

    return (
        <article className="prose prose-slate dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Mail className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white m-0 leading-tight">{t('legal.contact.title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 m-0">{t('legal.contact.subtitle', { appName })}</p>
                </div>
            </div>

            <section className="space-y-8 text-gray-600 dark:text-gray-300">

                <div className="bg-surface dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-surface-border dark:border-slate-700 text-center space-y-2">
                    <h2 className="text-xs font-bold text-muted dark:text-gray-400 uppercase tracking-widest">{t('legal.contact.techSupportLabel')}</h2>
                    <a href={`mailto:${supportEmail}`} className="text-2xl md:text-3xl font-bold text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-primary transition-colors block break-all">
                        {supportEmail}
                    </a>
                    <p className="text-sm text-muted dark:text-gray-400">{t('legal.contact.sysAdmin')}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 not-prose">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                        <div className="flex items-center gap-3 mb-3">
                            <Bug className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <h3 className="font-bold text-indigo-900 dark:text-indigo-100 m-0">{t('legal.contact.reportBugsTitle')}</h3>
                        </div>
                        <p className="text-sm text-indigo-800 dark:text-indigo-200 m-0 leading-relaxed">
                            {t('legal.contact.reportBugsIntro')}
                            <br />{t('legal.contact.reportBugsItem1')}
                            <br />{t('legal.contact.reportBugsItem2')}
                            <br />{t('legal.contact.reportBugsItem3')}
                        </p>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                        <div className="flex items-center gap-3 mb-3">
                            <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <h3 className="font-bold text-emerald-900 dark:text-emerald-100 m-0">{t('legal.contact.suggestionsTitle')}</h3>
                        </div>
                        <p className="text-sm text-emerald-800 dark:text-emerald-200 m-0 leading-relaxed">
                            {t('legal.contact.suggestionsDesc', { appName })}
                        </p>
                    </div>
                </div>

                <hr className="border-gray-100 dark:border-slate-700" />

                <p className="text-center text-sm text-gray-400 dark:text-gray-500">
                    {t('legal.contact.footerNote')}
                </p>
            </section>
        </article>
    );
}
