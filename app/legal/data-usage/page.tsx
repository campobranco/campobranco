'use client';

import { Shield, Database, Lock, Scale } from 'lucide-react';
import { useTranslation } from '@/app/context/I18nContext';

export default function DataUsagePage() {
    const { t } = useTranslation();

    return (
        <article className="prose prose-slate dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Database className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white m-0 leading-tight">{t('legal.dataUsage.title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 m-0">{t('legal.dataUsage.subtitle')}</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8 not-prose">
                <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700">
                    <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                        <Scale className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('legal.dataUsage.lgpdRolesTitle')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {t('legal.dataUsage.lgpdRolesP1Start')} <strong>{t('legal.dataUsage.lgpdRolesP1Bold')}</strong>{t('legal.dataUsage.lgpdRolesP1End')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {t('legal.dataUsage.lgpdRolesP2Start')} <strong>{t('legal.dataUsage.lgpdRolesP2Bold')}</strong> {t('legal.dataUsage.lgpdRolesP2End')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {t('legal.dataUsage.lgpdRolesP3')}
                    </p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700">
                    <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                        <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('legal.dataUsage.securityTitle')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {t('legal.dataUsage.securityDesc')}
                    </p>
                </div>
            </div>

            <section className="space-y-6 text-gray-600 dark:text-gray-300">

                <h3>{t('legal.dataUsage.s1Title')}</h3>
                <p>{t('legal.dataUsage.s1Lead')}</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-indigo-500">
                    <li>{t('legal.dataUsage.s1Item1')}</li>
                    <li>{t('legal.dataUsage.s1Item2')}</li>
                    <li>{t('legal.dataUsage.s1Item3')}</li>
                </ul>
                <p>{t('legal.dataUsage.s1LegalRef')}</p>
                <p>{t('legal.dataUsage.s1Purpose')}</p>

                <h3>{t('legal.dataUsage.s2Title')}</h3>

                <div className="my-6 space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 mt-0">{t('legal.dataUsage.s2ATitle')}</h4>
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-200 mt-2">{t('legal.dataUsage.s2AResidents')}</p>
                        <ul className="list-disc pl-5 m-0 text-sm text-blue-900 dark:text-blue-200 space-y-1">
                            <li>{t('legal.dataUsage.s2AResidentItem1')}</li>
                            <li>{t('legal.dataUsage.s2AResidentItem2')}</li>
                            <li>{t('legal.dataUsage.s2AResidentItem3')}</li>
                        </ul>

                        <p className="text-sm font-bold text-blue-900 dark:text-blue-200 mt-4">{t('legal.dataUsage.s2AUsers')}</p>
                        <ul className="list-disc pl-5 m-0 text-sm text-blue-900 dark:text-blue-200 space-y-1">
                            <li>{t('legal.dataUsage.s2AUserItem1')}</li>
                            <li>{t('legal.dataUsage.s2AUserItem2')}</li>
                        </ul>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-100 dark:border-red-800">
                        <h4 className="font-bold text-red-800 dark:text-red-300 mb-2 mt-0 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            {t('legal.dataUsage.s2BTitle')}
                        </h4>
                        <p className="text-sm text-red-900 dark:text-red-200 mb-2">
                            {t('legal.dataUsage.s2BDesc')}
                        </p>
                        <ul className="list-disc pl-5 m-0 text-sm text-red-900 dark:text-red-200 space-y-1">
                            <li><strong>{t('legal.dataUsage.s2BItem1Label')}</strong> {t('legal.dataUsage.s2BItem1Desc')}</li>
                            <li><strong>{t('legal.dataUsage.s2BItem2Label')}</strong> {t('legal.dataUsage.s2BItem2Desc')}</li>
                            <li><strong>{t('legal.dataUsage.s2BItem3Label')}</strong> {t('legal.dataUsage.s2BItem3Desc')}</li>
                        </ul>
                    </div>
                </div>

                <h3>{t('legal.dataUsage.s3Title')}</h3>
                <p>{t('legal.dataUsage.s3P1')}</p>
                <p>{t('legal.dataUsage.s3P2')}</p>

                <h3>{t('legal.dataUsage.s4Title')}</h3>
                <p>{t('legal.dataUsage.s4Lead')}</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>{t('legal.dataUsage.s4Item1')}</li>
                    <li>{t('legal.dataUsage.s4Item2')}
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>{t('legal.dataUsage.s4SubItem1')}</li>
                            <li>{t('legal.dataUsage.s4SubItem2')}</li>
                            <li>{t('legal.dataUsage.s4SubItem3')}</li>
                        </ul>
                    </li>
                </ul>
                <p>{t('legal.dataUsage.s4Note')}</p>
                <p>{t('legal.dataUsage.s4Fork')}</p>

                <h3>{t('legal.dataUsage.s5Title')}</h3>
                <ol className="list-decimal pl-5 space-y-4 marker:text-indigo-600 marker:dark:text-indigo-400 marker:font-bold">
                    <li>
                        <strong>{t('legal.dataUsage.s5Item1Label')}</strong> {t('legal.dataUsage.s5Item1Desc')}
                    </li>
                    <li>
                        <strong>{t('legal.dataUsage.s5Item2Label')}</strong> {t('legal.dataUsage.s5Item2Desc')}
                    </li>
                </ol>
                <p>{t('legal.dataUsage.s5Note')}</p>

                <h3>{t('legal.dataUsage.s6Title')}</h3>
                <p>{t('legal.dataUsage.s6P1')}</p>
                <p>{t('legal.dataUsage.s6P2')}</p>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-r-xl mt-8">
                    <h4 className="text-yellow-800 dark:text-yellow-300 font-bold text-sm mb-1 uppercase tracking-wide flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        {t('legal.dataUsage.nonCommercialTitle')}
                    </h4>
                    <p className="text-yellow-700 dark:text-yellow-200 text-sm m-0 mb-2">
                        {t('legal.dataUsage.nonCommercialLead')}
                    </p>
                    <ul className="list-disc pl-5 m-0 text-sm text-yellow-700 dark:text-yellow-200 space-y-1">
                        <li>{t('legal.dataUsage.nonCommercialItem1')}</li>
                        <li>{t('legal.dataUsage.nonCommercialItem2')}</li>
                    </ul>
                </div>
            </section>
        </article>
    );
}
