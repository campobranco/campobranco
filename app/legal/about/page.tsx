'use client';

import { Info, Heart, Code2, Home, Map, Store, BarChart3, Settings } from 'lucide-react';
import { useTranslation } from '@/app/context/I18nContext';

export default function AboutPage() {
    const { t } = useTranslation();

    return (
        <article className="prose prose-slate dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                    <Info className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white m-0 leading-tight">{t('legal.about.title')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 m-0">{t('legal.about.subtitle')}</p>
                </div>
            </div>

            <section className="space-y-6 text-gray-600 dark:text-gray-300">
                <p className="text-lg leading-relaxed">
                    {t('legal.about.introStart') ? `${t('legal.about.introStart')} ` : ''}<strong>Campo Branco</strong> {t('legal.about.introEnd')}
                </p>

                <div className="grid md:grid-cols-2 gap-6 my-8 not-prose">
                    <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700">
                        <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg shadow-sm flex items-center justify-center text-red-500 dark:text-red-400 mb-4">
                            <Heart className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('legal.about.purposeTitle')}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('legal.about.purposeDesc')}
                        </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700">
                        <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg shadow-sm flex items-center justify-center text-slate-700 dark:text-slate-300 mb-4">
                            <Code2 className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('legal.about.transparencyTitle')}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('legal.about.transparencyDesc')}
                        </p>
                    </div>
                </div>

                <h3>{t('legal.about.philosophyTitle')}</h3>
                <p>
                    {t('legal.about.philosophyP1Start')} <em>{t('legal.about.philosophyQuote')}</em>
                </p>
                <p>
                    {t('legal.about.philosophyP2')}
                </p>

                <hr className="my-8 border-gray-200 dark:border-slate-700" />

                <h3>{t('legal.about.importantNoticeTitle')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('legal.about.importantNoticeStart')} <strong>{t('legal.about.importantNoticeBold')}</strong> {t('legal.about.importantNoticeEnd')}
                </p>

                <h3>{t('legal.about.whatYouCanDoTitle')}</h3>

                <div className="not-prose grid gap-6 md:grid-cols-2">
                    {/* Início */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Home className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-white m-0 text-lg">{t('legal.about.homeTitle')}</h4>
                        </div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{t('legal.about.homeSubtitle')}</p>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-blue-400 mt-2"></span>
                                {t('legal.about.homeItem1')}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-blue-400 mt-2"></span>
                                {t('legal.about.homeItem2')}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-blue-400 mt-2"></span>
                                {t('legal.about.homeItem3')}
                            </li>
                        </ul>
                    </div>

                    {/* Mapas */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Map className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-white m-0 text-lg">{t('legal.about.mapsTitle')}</h4>
                        </div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{t('legal.about.mapsSubtitle')}</p>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-2"></span>
                                {t('legal.about.mapsItem1')}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-2"></span>
                                {t('legal.about.mapsItem2')}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-2"></span>
                                {t('legal.about.mapsItem3')}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-2"></span>
                                {t('legal.about.mapsItem4')}
                            </li>
                        </ul>
                    </div>

                    {/* T. Público */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <Store className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-white m-0 text-lg">{t('legal.about.witnessingTitle')}</h4>
                        </div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{t('legal.about.witnessingSubtitle')}</p>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-orange-400 mt-2"></span>
                                {t('legal.about.witnessingItem1')}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-orange-400 mt-2"></span>
                                {t('legal.about.witnessingItem2')}
                            </li>
                        </ul>
                    </div>

                    {/* Relatórios */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-white m-0 text-lg">{t('legal.about.reportsTitle')}</h4>
                        </div>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{t('legal.about.reportsSubtitle')}</p>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-purple-400 mt-2"></span>
                                {t('legal.about.reportsItem1')}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-purple-400 mt-2"></span>
                                {t('legal.about.reportsItem2')}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1 h-1 rounded-full bg-purple-400 mt-2"></span>
                                {t('legal.about.reportsItem3')}
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Configurações (Full Width) */}
                <div className="not-prose bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-gray-50 dark:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-white m-0 text-lg">{t('legal.about.settingsTitle')}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {t('legal.about.settingsDesc')}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-lg text-xs font-bold border border-gray-200 dark:border-slate-600">
                            {t('legal.about.badgePwa')}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 rounded-lg text-xs font-bold border border-gray-200 dark:border-slate-600">
                            {t('legal.about.badgeLgpd')}
                        </span>
                    </div>
                </div>
            </section>
        </article>
    );
}
