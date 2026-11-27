"use client";

import Link from 'next/link';
import { useState } from 'react';
import {
    Github,
    Scale,
    GitFork,
    MessageSquare,
    Package,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    ExternalLink,
    Map as MapIcon,
} from 'lucide-react';
import {
    PROJECT_REPO_URL,
    PROJECT_LICENSE_URL,
    PROJECT_COPYRIGHT,
    LICENSE_TEXTS,
    DEPENDENCIES,
    MAP_DATA_CREDITS,
    getLicenseDefinition,
    type ThirdPartyDependency,
} from '@/lib/open-source-licenses';

function LicenseCard({ dep }: { dep: ThirdPartyDependency }) {
    const [isOpen, setIsOpen] = useState(false);
    const [showPortuguese, setShowPortuguese] = useState(false);
    const licenseDef = getLicenseDefinition(dep.licenseId);

    return (
        <div className="bg-surface rounded-3xl border border-surface-border shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-lg text-main">{dep.name}</h4>
                        <span className="bg-surface-highlight px-2 py-0.5 rounded text-xs font-mono text-muted border border-surface-border">
                            v{dep.version}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted flex-wrap">
                        <span>{dep.author}</span>
                        <span className="w-1 h-1 rounded-full bg-surface-border" />
                        <span className="flex items-center gap-1">
                            <Scale className="w-3 h-3" />
                            {licenseDef.label}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-primary hover:text-primary-dark text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors shrink-0"
                >
                    {isOpen ? 'Ocultar Licença' : 'Ver Licença'}
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {isOpen && (
                <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-surface-border p-5 text-xs text-muted space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex rounded-lg border border-surface-border bg-surface p-0.5">
                            <button
                                type="button"
                                onClick={() => setShowPortuguese(false)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${!showPortuguese ? 'bg-primary text-white' : 'text-muted hover:text-main'}`}
                            >
                                Original (Inglês — oficial)
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPortuguese(true)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${showPortuguese ? 'bg-primary text-white' : 'text-muted hover:text-main'}`}
                            >
                                Tradução (Português)
                            </button>
                        </div>

                        <a
                            href={licenseDef.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                        >
                            Texto oficial ({licenseDef.label})
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    {showPortuguese && (
                        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-xl border border-yellow-200 dark:border-yellow-900/50 text-[11px] font-medium leading-relaxed">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                                <strong>Aviso:</strong> Esta é uma tradução livre para fins informativos. A versão original em inglês é a que possui validade jurídica.
                            </span>
                        </div>
                    )}

                    <pre className="whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto text-main/80">
                        {`Copyright (c) ${dep.author}\n\n${showPortuguese ? licenseDef.portuguese : licenseDef.english}`}
                    </pre>

                    <div className="pt-3 border-t border-surface-border/50 text-[11px] text-muted italic">
                        Este componente é fornecido sob a Licença {licenseDef.label}.
                    </div>
                </div>
            )}
        </div>
    );
}

export default function OpenSourceLicensePage() {
    const [showProjectPortuguese, setShowProjectPortuguese] = useState(false);
    const mitLicense = LICENSE_TEXTS.MIT;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary-light/50 dark:bg-primary-dark/30 rounded-xl">
                    <Scale className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-main">Licenças de Código Aberto</h1>
            </div>

            {/* Introduction & Project License */}
            <div className="space-y-8">
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-main">
                        <span className="w-1.5 h-6 rounded-full bg-primary inline-block" />
                        O que significa Open Source?
                    </h2>
                    <div className="text-base leading-relaxed text-muted space-y-4">
                        <p>
                            Este projeto é <strong className="text-main">Open Source</strong> (Código Aberto), o que significa que seu código-fonte está disponível para ser estudado, modificado e distribuído por qualquer pessoa, para qualquer finalidade.
                        </p>
                        <p>
                            Acreditamos na colaboração e transparência. Ao abrir o código, permitimos que a comunidade ajude a melhorar a ferramenta, corrigir erros mais rapidamente e garantir que ela continue evoluindo para atender às necessidades de todos.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <h3 className="text-xl font-bold text-main">Licença do Projeto (MIT)</h3>
                        <a
                            href={PROJECT_LICENSE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                        >
                            Ver arquivo LICENSE no GitHub
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-surface-border space-y-4 text-sm font-mono text-muted">
                        <div className="flex flex-wrap items-center justify-between gap-2 font-sans">
                            <div className="inline-flex rounded-lg border border-surface-border bg-surface p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setShowProjectPortuguese(false)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${!showProjectPortuguese ? 'bg-primary text-white' : 'text-muted hover:text-main'}`}
                                >
                                    Original (Inglês — oficial)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowProjectPortuguese(true)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${showProjectPortuguese ? 'bg-primary text-white' : 'text-muted hover:text-main'}`}
                                >
                                    Tradução (Português)
                                </button>
                            </div>
                        </div>

                        {showProjectPortuguese && (
                            <div className="font-sans flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-xl border border-yellow-200 dark:border-yellow-900/50 text-xs font-medium leading-relaxed">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>
                                    <strong>Aviso:</strong> Esta é uma tradução livre para fins informativos. A versão original em inglês é a que possui validade jurídica.
                                </span>
                            </div>
                        )}

                        <p className="font-bold text-main">{PROJECT_COPYRIGHT}</p>
                        <pre className="whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto text-main/80">
                            {showProjectPortuguese ? mitLicense.portuguese : mitLicense.english}
                        </pre>
                    </div>

                    <p className="text-xs text-muted px-2">
                        De forma simples: você pode usar este projeto livremente, inclusive para fins comerciais e para qualquer finalidade lícita, desde que mantenha o aviso de copyright e o texto da Licença MIT em todas as cópias ou partes substanciais do software.
                    </p>
                    <p className="text-xs text-muted px-2 mt-2 border-t border-surface-border pt-2">
                        <strong>Nota:</strong> O código-fonte do projeto é licenciado sob a Licença MIT. O uso do aplicativo final é regido pelos{' '}
                        <Link prefetch={false} href="/legal/terms" className="underline hover:text-primary">
                            Termos de Uso
                        </Link>{' '}
                        disponíveis nesta plataforma.
                    </p>
                </section>

                <section className="space-y-6">
                    <h3 className="text-xl font-bold text-main px-1">Como Contribuir?</h3>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-5 rounded-3xl border border-surface-border hover:border-primary/30 transition-colors bg-white dark:bg-slate-900">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
                                <GitFork className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-main mb-2">Fork & Pull Request</h4>
                            <p className="text-sm text-muted">
                                Faça uma cópia do projeto (Fork), implemente sua melhoria ou correção e envie um Pull Request para revisão.
                            </p>
                        </div>

                        <div className="p-5 rounded-3xl border border-surface-border hover:border-primary/30 transition-colors bg-white dark:bg-slate-900">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-4">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-main mb-2">Relate Problemas</h4>
                            <p className="text-sm text-muted">
                                Encontrou um bug ou tem uma ideia? Abra uma Issue no nosso repositório para discutirmos.
                            </p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary-light/20 to-surface dark:from-primary-dark/10 dark:to-surface p-8 rounded-[2.5rem] text-center space-y-4 border border-primary-light/30 dark:border-primary-dark/30">
                        <div className="inline-flex p-4 bg-background rounded-full shadow-sm mb-2">
                            <Github className="w-8 h-8 text-main" />
                        </div>
                        <h3 className="text-2xl font-bold text-main">Junte-se a nós no GitHub</h3>
                        <p className="text-muted max-w-md mx-auto">
                            O desenvolvimento acontece lá. Dê uma estrela no projeto para apoiar!
                        </p>
                        <a
                            href={PROJECT_REPO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-primary-light/30 transition-all hover:scale-105 active:scale-95"
                        >
                            <Github className="w-5 h-5" />
                            Acessar Repositório
                        </a>
                    </div>
                </section>
            </div>

            <hr className="border-surface-border" />

            {/* Third Party Licenses */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-primary mb-2">
                    <div className="p-3 bg-primary-light/50 dark:bg-primary-dark/30 rounded-xl">
                        <Package className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-main">Bibliotecas e Créditos</h2>
                        <p className="text-sm text-muted font-normal mt-1">
                            Software de terceiros utilizado neste aplicativo.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {DEPENDENCIES.map((dep) => (
                        <LicenseCard key={dep.name} dep={dep} />
                    ))}
                </div>
            </section>

            {/* Map & Geographic Data Credits */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 text-primary">
                    <div className="p-3 bg-primary-light/50 dark:bg-primary-dark/30 rounded-xl">
                        <MapIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold tracking-tight text-main">Dados Geográficos e Mapas</h3>
                        <p className="text-sm text-muted">Atribuições de mapas e geocodificação.</p>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    {MAP_DATA_CREDITS.map((credit) => (
                        <a
                            key={credit.name}
                            href={credit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-surface rounded-2xl border border-surface-border p-4 hover:border-primary/40 transition-colors flex flex-col justify-between gap-2"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="font-bold text-main">{credit.name}</h4>
                                    <ExternalLink className="w-3.5 h-3.5 text-muted shrink-0" />
                                </div>
                                <p className="text-xs text-muted mt-1">{credit.role}</p>
                            </div>
                            <span className="text-[11px] font-bold text-primary">{credit.license}</span>
                        </a>
                    ))}
                </div>
            </section>
        </div>
    );
}
