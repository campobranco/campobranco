'use client';

import { Lock } from 'lucide-react';
import { useTranslation } from '@/app/context/I18nContext';

export default function PrivacyPage() {
    const { t } = useTranslation();
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco';
    const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL || '';

    return (
        <article className="prose prose-slate dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Lock className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white m-0 leading-tight">{t('legal.privacy.title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 m-0">{t('legal.privacy.lastUpdated')}</p>
                </div>
            </div>

            <section className="space-y-6 text-gray-600 dark:text-gray-300">
                <p>
                    {t('legal.privacy.intro1Start')} <strong>{appName}</strong> {t('legal.privacy.intro1End')}
                </p>
                <p>
                    {t('legal.privacy.intro2', { appName })}
                </p>
                <p>
                    {t('legal.privacy.intro3')}
                </p>

                <h3>{t('legal.privacy.s1Title')}</h3>
                <p><strong>{t('legal.privacy.s1ControllerLabel')}</strong> {t('legal.privacy.s1ControllerDesc')}</p>
                <p>{t('legal.privacy.s1OrgNote')}</p>

                <p><strong>{t('legal.privacy.s1ProcessorLabel')}</strong> {t('legal.privacy.s1ProcessorDesc', { appName })}</p>
                <p>{t('legal.privacy.s1ProcessorNote', { appName })}</p>

                <h3>{t('legal.privacy.s2Title')}</h3>
                <p>{t('legal.privacy.s2Intro')}</p>

                <h4>{t('legal.privacy.s2_1Title')}</h4>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>{t('legal.privacy.s2_1Item1')}</li>
                    <li>{t('legal.privacy.s2_1Item2')}</li>
                    <li>{t('legal.privacy.s2_1Item3')}</li>
                </ul>

                <h4>{t('legal.privacy.s2_2Title')}</h4>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>{t('legal.privacy.s2_2Item1')}</li>
                    <li>{t('legal.privacy.s2_2Item2')}</li>
                    <li>{t('legal.privacy.s2_2Item3')}</li>
                </ul>

                <h3>{t('legal.privacy.s3Title')}</h3>
                <p>{t('legal.privacy.s3Lead1')}</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>{t('legal.privacy.s3LegalItem1')}</li>
                    <li>{t('legal.privacy.s3LegalItem2')}</li>
                    <li>{t('legal.privacy.s3LegalItem3')}</li>
                </ul>
                <p>{t('legal.privacy.s3Lead2')}</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>{t('legal.privacy.s3UseItem1')}</li>
                    <li>{t('legal.privacy.s3UseItem2')}</li>
                    <li>{t('legal.privacy.s3UseItem3')}</li>
                </ul>
                <p>{t('legal.privacy.s3Note')}</p>

                <h3>{t('legal.privacy.s4Title')}</h3>
                <p>
                    {t('legal.privacy.s4Start')} <em>{t('legal.privacy.s4Em')}</em> {t('legal.privacy.s4End')}
                </p>

                <h3>{t('legal.privacy.s5Title')}</h3>
                <h4>{t('legal.privacy.s5_1Title')}</h4>
                <p>{t('legal.privacy.s5_1Desc')}</p>

                <h4>{t('legal.privacy.s5_2Title')}</h4>
                <p>{t('legal.privacy.s5_2Desc', { appName })}</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>{t('legal.privacy.s5_2Item1')}</li>
                    <li>{t('legal.privacy.s5_2Item2')}</li>
                    <li>{t('legal.privacy.s5_2Item3')}</li>
                </ul>

                <h4>{t('legal.privacy.s5_3Title')}</h4>
                <p>{t('legal.privacy.s5_3Desc')}</p>

                <h3>{t('legal.privacy.s6Title')}</h3>
                <p>{t('legal.privacy.s6P1')}</p>
                <p>{t('legal.privacy.s6P2')}</p>

                <h3>{t('legal.privacy.s7Title')}</h3>
                <p>{t('legal.privacy.s7P1')}</p>
                <p>{t('legal.privacy.s7Lead')}</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>{t('legal.privacy.s7Item1')}</li>
                    <li>{t('legal.privacy.s7Item2')}</li>
                    <li>{t('legal.privacy.s7Item3')}</li>
                </ul>
                <p>{t('legal.privacy.s7Note')}</p>

                <h3>{t('legal.privacy.s8Title')}</h3>
                <p>{t('legal.privacy.s8Lead')}</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>{t('legal.privacy.s8Item1')}</li>
                    <li>{t('legal.privacy.s8Item2')}</li>
                    <li>{t('legal.privacy.s8Item3')}</li>
                    <li>{t('legal.privacy.s8Item4')}</li>
                </ul>
                <p>{t('legal.privacy.s8Note')}</p>

                <h3>{t('legal.privacy.s9Title')}</h3>
                <p>{t('legal.privacy.s9Lead')}</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>{t('legal.privacy.s9Item1')}</li>
                    <li>{t('legal.privacy.s9Item2')}</li>
                    <li>{t('legal.privacy.s9Item3')}</li>
                    <li>{t('legal.privacy.s9Item4')}</li>
                </ul>
                <p>{t('legal.privacy.s9Note')}</p>

                <h3>{t('legal.privacy.s10Title')}</h3>
                <p>{t('legal.privacy.s10P1')}</p>
                <p>{t('legal.privacy.s10P2')}</p>

                <h3>{t('legal.privacy.s11Title')}</h3>
                <p>{t('legal.privacy.s11P1')}</p>

                <h4>{t('legal.privacy.s11_1Title')}</h4>
                <p>{t('legal.privacy.s11_1P1')}</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>{t('legal.privacy.s11_1Item1')}</li>
                    <li>{t('legal.privacy.s11_1Item2')}</li>
                    <li>{t('legal.privacy.s11_1Item3')}</li>
                </ul>
                <p>
                    <strong>{t('legal.privacy.s11_1ContactLabel')}</strong>{' '}
                    <a href={`mailto:${supportEmail}`} className="text-emerald-600 dark:text-emerald-400 no-underline hover:underline">
                        {supportEmail}
                    </a>
                </p>

                <h4>{t('legal.privacy.s11_2Title')}</h4>
                <p>{t('legal.privacy.s11_2Lead')}</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>
                        <strong>{t('legal.privacy.s11_2RequestsLabel')}</strong>{' '}
                        <a href={`mailto:${supportEmail}`} className="text-emerald-600 dark:text-emerald-400 no-underline hover:underline">
                            {supportEmail}
                        </a>
                    </li>
                </ul>
            </section>
        </article>
    );
}
