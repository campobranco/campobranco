"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { ChevronLeft, Printer, MapPin, Building2, Filter, Loader2, LayoutGrid, FileText } from 'lucide-react';
import { getRegistryData } from '@/lib/services/reports';
import { toast } from 'sonner';

interface TerritoryItem {
    id: string;
    name: string;
    description?: string;
    cityId: string;
    cityName?: string;
    imageUrl?: string;
}

function AutoFitText({ text, maxFontSize = 12, minFontSize = 7.5 }: { text: string; maxFontSize?: number; minFontSize?: number }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const spanRef = useRef<HTMLSpanElement>(null);

    const adjustFontSize = useCallback(() => {
        const container = containerRef.current;
        const span = spanRef.current;
        if (!container || !span) return;

        // Reset text size to max to measure natural scroll width
        span.style.fontSize = `${maxFontSize}px`;
        span.style.letterSpacing = 'normal';

        let currentSize = maxFontSize;
        const availableWidth = container.clientWidth;

        if (availableWidth > 0) {
            while (span.scrollWidth > availableWidth && currentSize > minFontSize) {
                currentSize -= 0.25;
                span.style.fontSize = `${currentSize}px`;
            }
        }
    }, [maxFontSize, minFontSize]);

    useLayoutEffect(() => {
        adjustFontSize();
    }, [text, adjustFontSize]);

    useEffect(() => {
        window.addEventListener('resize', adjustFontSize);
        return () => window.removeEventListener('resize', adjustFontSize);
    }, [adjustFontSize]);

    return (
        <div ref={containerRef} className="relative flex-1 min-w-0 flex items-baseline justify-center text-center overflow-hidden">
            <div className="absolute inset-x-0 bottom-[1px] border-b-[1.5px] border-dotted border-black pointer-events-none z-0"></div>
            <span
                ref={spanRef}
                style={{ fontSize: `${maxFontSize}px` }}
                className="relative z-10 font-bold text-black bg-transparent px-1 whitespace-nowrap"
            >
                {text}
            </span>
        </div>
    );
}

export default function MapCardPage() {
    const { congregationId, loading: authLoading } = useAuth();
    const router = useRouter();

    const [territories, setTerritories] = useState<TerritoryItem[]>([]);
    const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
    const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
    const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('ALL');
    const [printLayoutMode, setPrintLayoutMode] = useState<'a6' | 'a4-grid'>('a4-grid');
    const [pageLoading, setPageLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!congregationId) return;

        setPageLoading(true);
        try {
            const resData = await getRegistryData(congregationId);
            if (!resData.success) throw new Error(resData.error || "Erro ao buscar territórios");

            const cityMap = new Map<string, string>();
            resData.cities?.forEach((c: any) => {
                const formattedCity = c.uf ? `${c.name}, ${c.uf}` : c.name;
                cityMap.set(c.id, formattedCity);
            });
            setCities((resData.cities || []) as { id: string; name: string }[]);

            const terrs: TerritoryItem[] = (resData.territories || []).map((t: any) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                cityId: t.cityId,
                cityName: cityMap.get(t.cityId),
                imageUrl: t.imageUrl
            }));

            // Ordenação numérica pelo número do território
            terrs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setTerritories(terrs);
        } catch (err: any) {
            console.error("Erro ao carregar dados do formulário S-12:", err);
            toast.error("Erro ao carregar cartões de mapa.");
        } finally {
            setPageLoading(false);
        }
    }, [congregationId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredTerritories = territories.filter(t => {
        if (selectedCityId !== 'ALL' && t.cityId !== selectedCityId) return false;
        if (selectedTerritoryId !== 'ALL' && t.id !== selectedTerritoryId) return false;
        return true;
    });

    // Função para agrupar em blocos de 4 para a grade A4 Horizontal (2 colunas x 2 linhas)
    const chunkArray = <T,>(arr: T[], chunkSize: number): T[][] => {
        const results: T[][] = [];
        for (let i = 0; i < arr.length; i += chunkSize) {
            results.push(arr.slice(i, i + chunkSize));
        }
        return results;
    };

    const a4Groups = chunkArray(filteredTerritories, 4);

    const handlePrint = () => {
        const previousTitle = document.title;
        document.title = `S-12-T_Cartoes_de_Mapa_${printLayoutMode.toUpperCase()}`;
        window.print();
        setTimeout(() => {
            document.title = previousTitle;
        }, 500);
    };

    const formatLocalidade = (desc?: string, cityName?: string) => {
        const cleanDesc = desc?.trim() || '';
        const cleanCity = cityName?.trim() || '';
        const rawCityName = cleanCity.split(',')[0].trim();

        const parts = [];
        if (cleanDesc && cleanDesc.toLowerCase() !== rawCityName.toLowerCase()) {
            parts.push(cleanDesc);
        }
        if (cleanCity) {
            parts.push(cleanCity);
        }
        return parts.join(' - ');
    };

    const formatTerritoryNumber = (name: string) => {
        if (!name) return '';
        const trimmed = name.trim();
        if (/^\d+$/.test(trimmed)) {
            return trimmed.padStart(2, '0');
        }
        return trimmed;
    };

    return (
        <div className="min-h-screen bg-background text-main pb-12 print:bg-white print:text-black print:p-0 print:pb-0 font-serif">
            {/* Configuração Estrita de Dimensões para Impressão PDF / Papel */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: ${printLayoutMode === 'a4-grid' ? '297mm 210mm' : '148mm 105mm'};
                        margin: 0;
                    }
                    html, body {
                        width: ${printLayoutMode === 'a4-grid' ? '297mm' : '148mm'} !important;
                        height: ${printLayoutMode === 'a4-grid' ? '210mm' : '105mm'} !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        color: black !important;
                        font-family: 'Times New Roman', Times, serif !important;
                    }
                }
                .s12-font {
                    font-family: 'Times New Roman', Times, Georgia, serif;
                }
            `}</style>

            {/* Cabeçalho de Ações e Filtros (oculto na impressão) */}
            <header className="bg-surface border-b border-surface-border sticky top-0 z-20 px-6 py-4 flex flex-wrap items-center justify-between gap-4 no-print shadow-sm font-sans">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-background rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-muted" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-main flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-amber-500" />
                            Cartão de Mapa de Território
                        </h1>
                        <p className="text-xs text-muted">Formulário S-12-T 6/72 (A6: 148 x 105 mm | A4: 297 x 210 mm)</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Seletor do Formato de Impressão */}
                    <div className="flex items-center bg-background border border-surface-border rounded-xl p-1 gap-1">
                        <button
                            onClick={() => setPrintLayoutMode('a4-grid')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                printLayoutMode === 'a4-grid'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-muted hover:text-main'
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            4 por página (A4: 297x210 mm)
                        </button>
                        <button
                            onClick={() => setPrintLayoutMode('a6')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                printLayoutMode === 'a6'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-muted hover:text-main'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Individual (A6: 148x105 mm)
                        </button>
                    </div>

                    {/* Filtro de Cidade */}
                    <div className="flex items-center gap-2 bg-background border border-surface-border rounded-xl px-3 py-1.5 text-xs font-semibold">
                        <Filter className="w-3.5 h-3.5 text-muted" />
                        <span className="text-muted">Cidade:</span>
                        <select
                            value={selectedCityId}
                            onChange={(e) => {
                                setSelectedCityId(e.target.value);
                                setSelectedTerritoryId('ALL');
                            }}
                            className="bg-transparent text-main font-bold outline-none cursor-pointer"
                        >
                            <option value="ALL" className="bg-surface text-main">Todas as Cidades</option>
                            {cities.map(c => (
                                <option key={c.id} value={c.id} className="bg-surface text-main">{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro de Território */}
                    <div className="flex items-center gap-2 bg-background border border-surface-border rounded-xl px-3 py-1.5 text-xs font-semibold">
                        <span className="text-muted">Território:</span>
                        <select
                            value={selectedTerritoryId}
                            onChange={(e) => setSelectedTerritoryId(e.target.value)}
                            className="bg-transparent text-main font-bold outline-none cursor-pointer"
                        >
                            <option value="ALL" className="bg-surface text-main">Todos ({filteredTerritories.length})</option>
                            {territories
                                .filter(t => selectedCityId === 'ALL' || t.cityId === selectedCityId)
                                .map(t => (
                                    <option key={t.id} value={t.id} className="bg-surface text-main">
                                        Terr. {formatTerritoryNumber(t.name)} {t.cityName ? `(${t.cityName})` : ''}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <button
                        onClick={handlePrint}
                        disabled={filteredTerritories.length === 0}
                        className="bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-primary/20 text-xs uppercase tracking-wider disabled:opacity-50"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimir / PDF
                    </button>
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="max-w-[1250px] mx-auto p-4 md:p-8 print:p-0 print:max-w-none font-serif">
                {pageLoading || authLoading ? (
                    <div className="text-center py-20 flex flex-col items-center gap-4 font-sans">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-muted font-medium text-sm">Carregando cartões de mapa S-12-T...</p>
                    </div>
                ) : filteredTerritories.length === 0 ? (
                    <div className="text-center py-20 bg-surface border border-surface-border rounded-2xl shadow-sm font-sans">
                        <Building2 className="w-10 h-10 text-muted mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-main mb-1">Nenhum território encontrado</h3>
                        <p className="text-muted max-w-xs mx-auto text-xs">
                            Selecione outra cidade ou verifique os territórios cadastrados.
                        </p>
                    </div>
                ) : printLayoutMode === 'a4-grid' ? (
                    /* MODALIDADE: 4 CARTÕES A6 (148.5 x 105 mm) POR FOLHA A4 LANDSCAPE (297 x 210 mm) */
                    <div className="flex flex-col gap-10 print:gap-0">
                        {a4Groups.map((group, pageIndex) => (
                            <div
                                key={pageIndex}
                                className="bg-white text-black border border-black print:border-none shadow-xl print:shadow-none w-[297mm] h-[210mm] mx-auto grid grid-cols-2 grid-rows-2 break-after-page select-none s12-font box-border overflow-hidden"
                            >
                                {group.map((t) => {
                                    const localidadeText = formatLocalidade(t.description, t.cityName);

                                    return (
                                        <div
                                            key={t.id}
                                            className="w-[148.5mm] h-[105mm] border border-dashed border-gray-400 print:border-black px-7 py-4 flex flex-col justify-between box-border overflow-hidden bg-white relative"
                                        >
                                            {/* Bloco Superior (Título + Cabeçalho com Pontilhado Contínuo Sobposto + Área do Mapa) */}
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    {/* Título Oficial S-12-T (Title Case) */}
                                                    <h2 className="text-center font-serif text-[21px] font-bold tracking-normal text-black mb-3">
                                                        Cartão de Mapa de Território
                                                    </h2>

                                                    {/* Linha de Cabeçalho: Localidade ... Terr. N.º ... */}
                                                    <div className="flex items-baseline justify-between font-serif text-[12px] font-bold text-black mb-2">
                                                        <div className="flex items-baseline flex-1 min-w-0 mr-2">
                                                            <span className="shrink-0 font-bold mr-1.5">Localidade</span>
                                                            <AutoFitText text={localidadeText} />
                                                        </div>
                                                        <div className="flex items-baseline shrink-0 w-24 ml-1">
                                                            <span className="shrink-0 font-bold mr-1.5">Terr. N.º</span>
                                                            <div className="relative flex-1 min-w-0 flex items-baseline justify-center text-center">
                                                                <div className="absolute inset-x-0 bottom-[1px] border-b-[1.5px] border-dotted border-black pointer-events-none z-0"></div>
                                                                <span className="relative z-10 font-bold text-black bg-transparent px-1 whitespace-nowrap">
                                                                    {formatTerritoryNumber(t.name)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Área Limpa do Mapa */}
                                                <div className="relative flex-1 min-h-[35mm] flex flex-col justify-end items-center mb-0.5">
                                                    {t.imageUrl ? (
                                                        <img
                                                            src={t.imageUrl}
                                                            alt={`Mapa de ${t.name}`}
                                                            className="absolute inset-0 w-full h-full object-contain p-1"
                                                        />
                                                    ) : null}
                                                    <p className="font-serif font-bold text-[9px] text-black text-center relative z-10 bg-white px-2 py-0 mb-0">
                                                        (Cole o mapa acima ou desenhe o território)
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Rodapé Oficial S-12-T (3 linhas compactas com alinhamento tipográfico perfeito) */}
                                            <div className="w-full font-serif font-bold text-[10.5px] leading-[1.3] text-black mb-1 select-none">
                                                <span className="block text-justify [text-align-last:justify] w-full">
                                                    Guarde este cartão no envelope. Tome cuidado para não o manchar, marcar
                                                </span>
                                                <span className="block text-justify [text-align-last:justify] w-full">
                                                    ou dobrar. Cada vez que o território for coberto, queira informar disso o irmão
                                                </span>
                                                <span className="block text-left w-full">
                                                    que cuida do arquivo de territórios.
                                                </span>

                                                <div className="w-full flex items-center justify-between font-serif text-[9px] font-normal text-black mt-2">
                                                    <span>S-12-T &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 6/72</span>
                                                    <span>Impresso no Brasil</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                ) : (
                    /* MODALIDADE: CARTÃO INDIVIDUAL A6 HORIZONTAL (148mm x 105mm) */
                    <div className="flex flex-col gap-10 print:gap-0">
                        {filteredTerritories.map((t) => {
                            const localidadeText = formatLocalidade(t.description, t.cityName);

                            return (
                                <div
                                    key={t.id}
                                    className="bg-white text-black border border-black px-7 py-4 shadow-lg print:shadow-none print:border-none w-[148mm] h-[105mm] mx-auto flex flex-col justify-between break-after-page s12-font select-none box-border overflow-hidden"
                                >
                                    {/* Bloco Superior (Título + Cabeçalho com Pontilhado Contínuo Sobposto + Área do Mapa) */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            {/* Título Principal S-12-T */}
                                            <h1 className="text-center font-serif text-[21px] font-bold tracking-normal text-black mb-3">
                                                Cartão de Mapa de Território
                                            </h1>

                                            {/* Cabeçalho: Localidade ... Terr. N.º ... */}
                                            <div className="flex items-baseline justify-between font-serif text-[12px] font-bold text-black mb-2">
                                                <div className="flex items-baseline flex-1 min-w-0 mr-2">
                                                    <span className="shrink-0 font-bold mr-1.5">Localidade</span>
                                                    <AutoFitText text={localidadeText} />
                                                </div>
                                                <div className="flex items-baseline shrink-0 w-24 ml-1">
                                                    <span className="shrink-0 font-bold mr-1.5">Terr. N.º</span>
                                                    <div className="relative flex-1 min-w-0 flex items-baseline justify-center text-center">
                                                        <div className="absolute inset-x-0 bottom-[1px] border-b-[1.5px] border-dotted border-black pointer-events-none z-0"></div>
                                                        <span className="relative z-10 font-bold text-black bg-transparent px-1 whitespace-nowrap">
                                                            {formatTerritoryNumber(t.name)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Área Limpa do Mapa */}
                                        <div className="relative flex-1 min-h-[35mm] flex flex-col justify-end items-center mb-0.5">
                                            {t.imageUrl ? (
                                                <img
                                                    src={t.imageUrl}
                                                    alt={`Mapa de ${t.name}`}
                                                    className="absolute inset-0 w-full h-full object-contain p-1"
                                                />
                                            ) : null}
                                            <p className="font-serif font-bold text-[9px] text-black text-center relative z-10 bg-white px-2 py-0 mb-0">
                                                (Cole o mapa acima ou desenhe o território)
                                            </p>
                                        </div>
                                    </div>

                                    {/* Rodapé Oficial S-12-T (3 linhas compactas com alinhamento tipográfico perfeito) */}
                                    <div className="w-full font-serif font-bold text-[10.5px] leading-[1.3] text-black mb-1 select-none">
                                        <span className="block text-justify [text-align-last:justify] w-full">
                                            Guarde este cartão no envelope. Tome cuidado para não o manchar, marcar
                                        </span>
                                        <span className="block text-justify [text-align-last:justify] w-full">
                                            ou dobrar. Cada vez que o território for coberto, queira informar disso o irmão
                                        </span>
                                        <span className="block text-left w-full">
                                            que cuida do arquivo de territórios.
                                        </span>

                                        <div className="w-full flex items-center justify-between font-serif text-[9px] font-normal text-black mt-2">
                                            <span>S-12-T &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 6/72</span>
                                            <span>Impresso no Brasil</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
