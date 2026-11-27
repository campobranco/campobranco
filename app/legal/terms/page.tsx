'use client';

import { FileText } from 'lucide-react';
import { useTranslation } from '@/app/context/I18nContext';

export default function TermsPage() {
    const { t } = useTranslation();
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "Campo Branco";
    const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL || "";

    return (
        <article className="prose prose-slate dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white m-0 leading-tight">{t('legal.terms.title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 m-0">{t('legal.terms.lastUpdated')}</p>
                </div>
            </div>

            <section className="space-y-6 text-gray-600 dark:text-gray-300">
                <p>
                    {t('legal.terms.intro1')} <strong>{appName}</strong>.{' '}
                    {t('legal.terms.intro2')} <strong>{t('legal.terms.intro2Bold')}</strong> {t('legal.terms.intro2End')} <strong>{t('legal.terms.intro2EndBold')}</strong>.
                </p>

                <h3>{t('legal.terms.s1Title')}</h3>
                <p>
                    {t('legal.terms.s1P1Start') ? `${t('legal.terms.s1P1Start')} ` : ''}<strong>{appName}</strong> {t('legal.terms.s1P1Mid')} <strong>{t('legal.terms.s1P1Bold1')}</strong> {t('legal.terms.s1P1Mid2')} <strong>{t('legal.terms.s1P1Bold2')}</strong> {t('legal.terms.s1P1End')}
                </p>
                <p>
                    {t('legal.terms.s1P2')}
                </p>
                <p>{t('legal.terms.s1ProhibitedLead')} <strong>{t('legal.terms.s1ProhibitedBold')}</strong> {t('legal.terms.s1ProhibitedEnd')}</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                    <li>{t('legal.terms.s1ProhibitedItem1')}</li>
                    <li>{t('legal.terms.s1ProhibitedItem2')}</li>
                    <li>{t('legal.terms.s1ProhibitedItem3')}</li>
                    <li>{t('legal.terms.s1ProhibitedItem4')}</li>
                </ul>
                <p>{t('legal.terms.s1PenaltyStart')} <strong>{t('legal.terms.s1PenaltyBold')}</strong>{t('legal.terms.s1PenaltyEnd')}</p>

                <h3>{t('legal.terms.s2Title')}</h3>
                <p>{t('legal.terms.s2_1')}</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                    <li>{t('legal.terms.s2_1Item1Start')} <strong>{t('legal.terms.s2_1Item1Bold')}</strong> {t('legal.terms.s2_1Item1End')}</li>
                    <li>{t('legal.terms.s2_1Item2')}</li>
                </ul>
                <p>{t('legal.terms.s2_2Start')} <strong>{t('legal.terms.s2_2Bold')}</strong>{t('legal.terms.s2_2End')}</p>

                <h3>{t('legal.terms.s3Title')}</h3>
                <p>{t('legal.terms.s3Lead')}</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                    <li>{t('legal.terms.s3Item1Start')} <strong>{t('legal.terms.s3Item1Bold')}</strong></li>
                    <li>{t('legal.terms.s3Item2Start')} <strong>{t('legal.terms.s3Item2Bold')}</strong></li>
                    <li>{t('legal.terms.s3Item3')}</li>
                    <li>{t('legal.terms.s3Item4Start')} <strong>{t('legal.terms.s3Item4Bold')}</strong>{t('legal.terms.s3Item4End')}</li>
                </ul>

                <h4>{t('legal.terms.s3_1Title')}</h4>
                <p>{t('legal.terms.s3_1Start')} <strong>{t('legal.terms.s3_1Bold')}</strong> {t('legal.terms.s3_1End')}</p>

                <h3>{t('legal.terms.s4Title')}</h3>
                <p>{t('legal.terms.s4_1Start')} <strong>{t('legal.terms.s4_1Bold')}</strong>{t('legal.terms.s4_1End')}</p>
                <p>{t('legal.terms.s4_2Start')} <strong>{t('legal.terms.s4_2Bold')}</strong> {t('legal.terms.s4_2End')}</p>
                <p>{t('legal.terms.s4_3')}</p>
                <p>{t('legal.terms.s4_4')}</p>

                <h3>{t('legal.terms.s5Title')}</h3>
                <p>
                    {t('legal.terms.s5Start')} <strong>{t('legal.terms.s5Bold1')}</strong> {t('legal.terms.s5Mid1')}{' '}
                    <strong>{t('legal.terms.s5Bold2')}</strong>{t('legal.terms.s5Mid2')} <strong>{t('legal.terms.s5Bold3')}</strong>.
                </p>

                <h3>{t('legal.terms.s6Title')}</h3>
                <p>{t('legal.terms.s6_1Start')} <strong>{t('legal.terms.s6_1Bold')}</strong> {t('legal.terms.s6_1End')}</p>
                <p>{t('legal.terms.s6_2')}</p>
                <p>{t('legal.terms.s6_3')}</p>

                <h3>{t('legal.terms.s7Title')}</h3>
                <p>{t('legal.terms.s7P1')}</p>

                <h3>{t('legal.terms.s8Title')}</h3>
                <p>{t('legal.terms.s8_1')}</p>
                <p>{t('legal.terms.s8_2')}</p>

                <p><strong>{t('legal.terms.s8_3Title')}</strong></p>
                <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                    <li>{t('legal.terms.s8_3Item1', { appName })}</li>
                    <li>{t('legal.terms.s8_3Item2')}</li>
                    <li>{t('legal.terms.s8_3Item3')}</li>
                    <li>{t('legal.terms.s8_3Item4')}</li>
                </ul>
                <p>{t('legal.terms.s8_3Note')}</p>

                <p>{t('legal.terms.s8_4', { appName })}</p>
                <p>{t('legal.terms.s8_5')}</p>
                <p>{t('legal.terms.s8_6', { appName })}</p>

                <h3>{t('legal.terms.s9Title')}</h3>
                <p>
                    {t('legal.terms.s9Start', { appName })} <strong>{t('legal.terms.s9Bold')}</strong>.
                </p>

                <h3>{t('legal.terms.s10Title')}</h3>
                <p>{t('legal.terms.s10P1')}</p>

                <h3>{t('legal.terms.s11Title')}</h3>
                <p>
                    {t('legal.terms.s11Start')} <strong>{t('legal.terms.s11Bold')}</strong> {t('legal.terms.s11End')}
                </p>

                <h3>{t('legal.terms.s12Title')}</h3>
                <p>
                    {t('legal.terms.s12Start')} <strong>{supportEmail}</strong>.
                </p>

                <h3>{t('legal.terms.s13Title')}</h3>
                <p>{t('legal.terms.s13P1')}</p>
            </section>
        </article>
    );
}
