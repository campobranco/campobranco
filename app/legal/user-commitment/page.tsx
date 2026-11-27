'use client';

import { UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/app/context/I18nContext';

export default function UserCommitmentPage() {
    const { t } = useTranslation();

    return (
        <article className="prose prose-slate dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <UserCheck className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white m-0 leading-tight">{t('legal.userCommitment.title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 m-0">{t('legal.userCommitment.subtitle')}</p>
                </div>
            </div>

            <section className="space-y-6 text-gray-600 dark:text-gray-300">
                <p className="text-lg leading-relaxed">
                    {t('legal.userCommitment.introStart')} <strong>{t('legal.userCommitment.introBold')}</strong> {t('legal.userCommitment.introEnd')}
                </p>

                <div className="bg-white dark:bg-slate-800 border-2 border-orange-100 dark:border-orange-900/50 rounded-2xl p-6 md:p-8 my-8 shadow-sm">
                    <h3 className="text-orange-600 dark:text-orange-400 font-bold text-xl mb-4 flex items-center gap-2 mt-0">
                        <AlertTriangle className="w-5 h-5" />
                        {t('legal.userCommitment.cardTitle')}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-6">
                        {t('legal.userCommitment.cardLead')}
                    </p>

                    <ul className="space-y-4 list-none pl-0">
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span>
                                <strong>{t('legal.userCommitment.item1Label')}</strong> {t('legal.userCommitment.item1Desc')}
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span>
                                <strong>{t('legal.userCommitment.item2Label')}</strong> {t('legal.userCommitment.item2Desc')}
                            </span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <span>
                                <strong>{t('legal.userCommitment.item3Label')}</strong> {t('legal.userCommitment.item3Desc')}
                            </span>
                        </li>
                    </ul>
                </div>

                <h3>{t('legal.userCommitment.notesTitle')}</h3>
                <p>
                    {t('legal.userCommitment.notesDesc')}
                </p>

                <h3>{t('legal.userCommitment.deletionTitle')}</h3>
                <p>
                    {t('legal.userCommitment.deletionDesc')}
                </p>

                <hr className="my-8 border-gray-200 dark:border-slate-700" />

                <p className="text-xs text-gray-400 dark:text-gray-400 italic">
                    {t('legal.userCommitment.disclaimer')}
                </p>
            </section>
        </article>
    );
}
