"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Github, Scale, GitFork, MessageSquare, Package, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

const LICENSE_TEXTS = {
    MIT: `A permissão é concedida, gratuitamente, a qualquer pessoa que obtenha uma cópia deste software e dos arquivos de documentação associados (o "Software"), para lidar com o Software sem restrições, incluindo, sem limitação, os direitos de usar, copiar, modificar, mesclar, publicar, distribuir, sublicenciar e/ou vender cópias do Software, e permitir que as pessoas a quem o Software é fornecido o façam, sujeito às seguintes condições:

O aviso de direitos autorais acima e este aviso de permissão devem ser incluídos em todas as cópias ou partes substanciais do Software.

O SOFTWARE É FORNECIDO "COMO ESTÁ", SEM GARANTIA DE QUALQUER TIPO, EXPRESSA OU IMPLÍCITA, INCLUINDO, MAS NÃO SE LIMITANDO ÀS GARANTIAS DE COMERCIALIZAÇÃO, ADEQUAÇÃO A UM DETERMINADO FIM E NÃO INFRAÇÃO. EM NENHUM CASO OS AUTORES OU DETENTORES DE DIREITOS AUTORAIS SERÃO RESPONSÁVEIS POR QUALQUER REIVINDICAÇÃO, DANOS OU OUTRA RESPONSABILIDADE, SEJA EM UMA AÇÃO DE CONTRATO, ATO ILÍCITO OU DE OUTRA FORMA, DECORRENTE DE, FORA DE OU EM CONEXÃO COM O SOFTWARE OU O USO OU OUTRAS NEGOCIAÇÕES NO SOFTWARE.`,

    APACHE: `Licenciado sob a Licença Apache, Versão 2.0 (a "Licença");
você não pode usar este arquivo exceto em conformidade com a Licença.
Você pode obter uma cópia da Licença em

    http://www.apache.org/licenses/LICENSE-2.0

A menos que exigido pela lei aplicável ou acordado por escrito, o software
distribuído sob a Licença é distribuído "COMO ESTÁ",
SEM GARANTIAS OU CONDIÇÕES DE QUALQUER TIPO, expressas ou implícitas.
Consulte a Licença para as permissões e limitações específicas que regem o idioma sob a Licença.`,

    ISC: `A permissão para usar, copiar, modificar e/ou distribuir este software para qualquer finalidade com ou sem taxa é concedida, desde que o aviso de direitos autorais acima e este aviso de permissão apareçam em todas as cópias.

O SOFTWARE É FORNECIDO "COMO ESTÁ" E O AUTOR ISENTA-SE DE TODAS AS GARANTIAS COM RELAÇÃO A ESTE SOFTWARE, INCLUINDO TODAS AS GARANTIAS IMPLÍCITAS DE COMERCIALIZAÇÃO E ADEQUAÇÃO. EM NENHUM CASO O AUTOR SERÁ RESPONSÁVEL POR QUAISQUER DANOS ESPECIAIS, DIRETOS, INDIRETOS OU CONSEQUENCIAIS OU QUAISQUER DANOS RESULTANTES DA PERDA DE USO, DADOS OU LUCROS, SEJA EM UMA AÇÃO DE CONTRATO, NEGLIGÊNCIA OU OUTRA AÇÃO ILÍCITA, DECORRENTE DE OU EM CONEXÃO COM O USO OU DESEMPENHO DESTE SOFTWARE.`
};

const DEPENDENCIES = [
    { name: "react", version: "19.0.0", author: "Meta Platforms, Inc.", license: "MIT" },
    { name: "react-dom", version: "19.0.0", author: "Meta Platforms, Inc.", license: "MIT" },
    { name: "next", version: "15.5.9", author: "Vercel, Inc.", license: "MIT" },
    { name: "firebase", version: "12.7.0", author: "Google LLC", license: "Apache 2.0" },
    { name: "firebase-admin", version: "13.6.0", author: "Google LLC", license: "Apache 2.0" },
    { name: "tailwindcss", version: "3.4.17", author: "Tailwind Labs, Inc.", license: "MIT" },
    { name: "lucide-react", version: "0.562.0", author: "Lucide Contributors", license: "ISC" },
    { name: "date-fns", version: "4.1.0", author: "Sasha Koss", license: "MIT" },
    { name: "jose", version: "6.1.3", author: "Filip Skokan", license: "MIT" },
    { name: "@google-cloud/recaptcha-enterprise", version: "6.3.1", author: "Google LLC", license: "Apache 2.0" },
];

function LicenseCard({ dep }: { dep: typeof DEPENDENCIES[0] }) {
    const [isOpen, setIsOpen] = useState(false);
    const licenseText = LICENSE_TEXTS[dep.license.includes('Apache') ? 'APACHE' : dep.license.includes('ISC') ? 'ISC' : 'MIT'];

    return (
        <div className="bg-surface rounded-3xl border border-surface-border shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-lg text-main">{dep.name}</h4>
                        <span className="bg-surface-highlight px-2 py-0.5 rounded text-xs font-mono text-muted border border-surface-border">v{dep.version}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                        <span>{dep.author}</span>
                        <span className="w-1 h-1 rounded-full bg-surface-border"></span>
                        <span className="flex items-center gap-1">
                            <Scale className="w-3 h-3" />
                            {dep.license}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-primary hover:text-primary-dark text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                    {isOpen ? 'Ocultar Licença' : 'Ver Licença'}
                </button>
            </div>

            {isOpen && (
                <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-surface-border p-5 text-xs text-muted-foreground animate-in slide-in-from-top-2 duration-200">
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-xl border border-yellow-200 dark:border-yellow-900/50 text-[10px] font-medium leading-relaxed">
                        ⚠️ <strong>Aviso:</strong> Esta é uma tradução livre para fins informativos. A versão original em inglês é a que possui validade jurídica.
                    </div>
                    <pre className="whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                        {`Copyright (c) ${dep.author}\n\n${licenseText}`}
                    </pre>
                    <div className="mt-4 pt-4 border-t border-surface-border/50 text-[10px] text-muted italic flex justify-between items-center">
                        <span>Este componente é fornecido sob a Licença {dep.license}.</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function OpenSourceLicensePage() {
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
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <span className="w-1.5 h-6 rounded-full bg-primary inline-block"></span>
                        O que significa Open Source?
                    </h2>
                    <div className="text-base leading-relaxed text-muted-foreground">
                        <p className="mb-4">
                            Este projeto é <strong className="text-main">Open Source</strong> (Código Aberto), o que significa que seu código-fonte está disponível para ser estudado, modificado e distribuído por qualquer pessoa, para qualquer finalidade.
                        </p>
                        <p>
                            Acreditamos na colaboração e transparência. Ao abrir o código, permitimos que a comunidade ajude a melhorar a ferramenta, corrigir erros mais rapidamente e garantir que ela continue evoluindo para atender às necessidades de todos.
                        </p>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-xl font-bold text-main px-1">Licença do Projeto (MIT)</h3>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-surface-border space-y-4 text-sm font-mono text-muted-foreground">
                        <div className="mb-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-xl border border-yellow-200 dark:border-yellow-900/50 text-[10px] font-medium leading-relaxed">
                            ⚠️ <strong>Aviso:</strong> Esta é uma tradução livre para fins informativos. A versão original em inglês é a que possui validade jurídica.
                        </div>
                        <p className="font-bold">Copyright (c) 2026 Campo Branco</p>
                        <p>
                            A permissão é concedida, gratuitamente, a qualquer pessoa que obtenha uma cópia deste software e dos arquivos de documentação associados (o &quot;Software&quot;), para lidar com o Software sem restrições, incluindo, sem limitação, os direitos de usar, copiar, modificar, mesclar, publicar, distribuir, sublicenciar e/ou vender cópias do Software, e permitir que as pessoas a quem o Software é fornecido o façam, sujeito às seguintes condições:
                        </p>
                        <p>
                            O aviso de direitos autorais acima e este aviso de permissão devem ser incluídos em todas as cópias ou partes substanciais do Software.
                        </p>
                        <p className="opacity-70">
                            O SOFTWARE É FORNECIDO &quot;COMO ESTÁ&quot;, SEM GARANTIA DE QUALQUER TIPO, EXPRESSA OU IMPLÍCITA, INCLUINDO, MAS NÃO SE LIMITANDO ÀS GARANTIAS DE COMERCIALIZAÇÃO, ADEQUAÇÃO A UM DETERMINADO FIM E NÃO INFRAÇÃO. EM NENHUM CASO OS AUTORES OU DETENTORES DE DIREITOS AUTORAIS SERÃO RESPONSÁVEIS POR QUALQUER REIVINDICAÇÃO, DANOS OU OUTRA RESPONSABILIDADE, SEJA EM UMA AÇÃO DE CONTRATO, ATO ILÍCITO OU DE OUTRA FORMA, DECORRENTE DE, FORA DE OU EM CONEXÃO COM O SOFTWARE OU O USO OU OUTRAS NEGOCIAÇÕES NO SOFTWARE.
                        </p>
                    </div>
                    <p className="text-xs text-muted px-2">
                        De forma simples: Você pode usar este projeto livremente, inclusive para fins comerciais e para qualquer finalidade lícita, desde que mantenha o aviso de copyright e o texto da Licença MIT em todas as cópias ou partes substanciais do software.
                    </p>
                    <p className="text-xs text-muted px-2 mt-2 border-t border-surface-border pt-2">
                        <strong>Nota:</strong> O código-fonte do projeto é licenciado sob a Licença MIT. O uso do aplicativo final é regido pelos <Link prefetch={false} href="/legal/terms" className="underline hover:text-primary">Termos de Uso</Link> disponíveis nesta plataforma.
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
                            href="https://github.com/paulojacomelli/campo-branco"
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
                    {DEPENDENCIES.map((dep, index) => (
                        <LicenseCard key={index} dep={dep} />
                    ))}
                </div>
            </section>
        </div>
    );
}
