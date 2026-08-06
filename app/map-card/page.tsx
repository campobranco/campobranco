"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { ChevronLeft, Printer, MapPin, Building2, Filter, Loader2, LayoutGrid, FileText, Trash2, ImagePlus, Map as MapIcon, Sliders, Hexagon } from 'lucide-react';
import { getRegistryData } from '@/lib/services/reports';
import { updateTerritory } from '@/lib/services/territories';
import { getAddresses } from '@/lib/services/addresses';
import { toast } from 'sonner';

type MapCardMode = 'manual-image' | 'address-pins' | 'polygons';

interface TerritoryItem {
    id: string;
    name: string;
    description?: string;
    cityId: string;
    cityName?: string;
    imageUrl?: string;
}

interface AddressPinItem {
    id: string;
    territoryId: string;
    street: string;
    number?: string;
    lat: number;
    lng: number;
}

// Extrai coordenadas numéricas válidas de lat/lng, objeto coordinates ou link do Google Maps
function parseAddressCoords(addr: any): { lat: number; lng: number } | null {
    if (typeof addr.lat === 'number' && typeof addr.lng === 'number' && !isNaN(addr.lat) && !isNaN(addr.lng)) {
        return { lat: addr.lat, lng: addr.lng };
    }
    if (addr.coordinates && typeof addr.coordinates.lat === 'number' && typeof addr.coordinates.lng === 'number') {
        return { lat: addr.coordinates.lat, lng: addr.coordinates.lng };
    }
    if (addr.googleMapsLink && typeof addr.googleMapsLink === 'string') {
        const atMatch = addr.googleMapsLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

        const qMatch = addr.googleMapsLink.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }
    return null;
}

// Componente de Mapa por Pinos de Endereço (Modo 2 - Leaflet com auto-fitBounds)
function AddressPinsMap({ pins }: { pins: AddressPinItem[] }) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (!mapContainerRef.current || pins.length === 0) return;
        const L = (window as any).L;
        if (!L) return;

        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        try {
            const map = L.map(mapContainerRef.current, {
                zoomControl: false,
                attributionControl: false,
                dragging: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                touchZoom: false
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(map);

            const bounds = L.latLngBounds([]);

            pins.forEach((pin, idx) => {
                bounds.extend([pin.lat, pin.lng]);

                const customIcon = L.divIcon({
                    className: 'custom-pin-icon',
                    html: `<div style="background-color: #059669; color: white; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-family: sans-serif;">${idx + 1}</div>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                });

                L.marker([pin.lat, pin.lng], { icon: customIcon })
                    .addTo(map)
                    .bindPopup(`<b>${pin.street}${pin.number ? `, ${pin.number}` : ''}</b>`);
            });

            if (pins.length === 1) {
                map.setView([pins[0].lat, pins[0].lng], 16);
            } else {
                map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 });
            }

            mapInstanceRef.current = map;
        } catch (err) {
            console.error("Erro ao inicializar mapa Leaflet:", err);
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [pins]);

    if (pins.length === 0) {
        return (
            <div className="absolute inset-0 bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center p-3 text-center">
                <MapPin className="w-6 h-6 text-amber-500 mb-1 opacity-70" />
                <p className="font-sans font-bold text-[11px] text-slate-700">Nenhum pino de endereço configurado</p>
                <p className="font-sans text-[9.5px] text-slate-500 mt-0.5 max-w-[200px]">
                    Cadastre coordenadas (lat/lng) nos endereços deste território para gerar o mapa automático.
                </p>
            </div>
        );
    }

    return <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />;
}

// Otimização leve (~30KB) compatível com transportes gRPC do Firestore Web Channel
async function processTerritoryMapImage(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxWidth = 650;
                const maxHeight = 450;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("Erro no contexto gráfico do canvas"));

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
                resolve(compressedDataUrl);
            };
            img.onerror = () => reject(new Error("Erro ao carregar arquivo de imagem"));
            img.src = e.target?.result as string;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

function AutoFitText({ text, maxFontSize = 12, minFontSize = 7.5 }: { text: string; maxFontSize?: number; minFontSize?: number }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const spanRef = useRef<HTMLSpanElement>(null);

    const adjustFontSize = useCallback(() => {
        const container = containerRef.current;
        const span = spanRef.current;
        if (!container || !span) return;

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
    const [territoryPinsMap, setTerritoryPinsMap] = useState<Map<string, AddressPinItem[]>>(new Map());
    const [selectedCityId, setSelectedCityId] = useState<string>('ALL');
    const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('ALL');
    const [printLayoutMode, setPrintLayoutMode] = useState<'a6' | 'a4-grid'>('a4-grid');
    
    // Modo Ativo Estrito (Modo 1: Imagem Manual | Modo 2: Pinos de Endereços | Modo 3: Polígonos)
    const [cardMode, setCardMode] = useState<MapCardMode>('manual-image');
    const [pageLoading, setPageLoading] = useState(true);

    // Direct Image Upload Ref & State (Ativo APENAS no Modo 1)
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeUploadTerritoryId, setActiveUploadTerritoryId] = useState<string | null>(null);
    const [uploadingTerritoryId, setUploadingTerritoryId] = useState<string | null>(null);

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

    // Troca Estrita de Modo: Desabilita e descarrega os outros modelos quando um modo é selecionado
    const handleSwitchCardMode = (newMode: MapCardMode) => {
        setCardMode(newMode);

        if (newMode === 'manual-image') {
            toast.info("Modo 1 Ativo: Imagem Manual (Modos 2 e 3 desabilitados)");
        } else if (newMode === 'address-pins') {
            toast.info("Modo 2 Ativo: Pinos dos Endereços (Modos 1 e 3 desabilitados)");
            // Carrega pinos de endereços estritamente sob demanda para o Modo 2
            if (territoryPinsMap.size === 0 && congregationId) {
                getAddresses(congregationId).then(resAddr => {
                    if (resAddr.success && Array.isArray(resAddr.addresses)) {
                        const pinsMap = new Map<string, AddressPinItem[]>();
                        resAddr.addresses.forEach((addr: any) => {
                            if (!addr.territoryId || addr.isActive === false) return;
                            const coords = parseAddressCoords(addr);
                            if (coords) {
                                const existing = pinsMap.get(addr.territoryId) || [];
                                existing.push({
                                    id: addr.id,
                                    territoryId: addr.territoryId,
                                    street: addr.street || 'Endereço',
                                    number: addr.number,
                                    lat: coords.lat,
                                    lng: coords.lng
                                });
                                pinsMap.set(addr.territoryId, existing);
                            }
                        });
                        setTerritoryPinsMap(pinsMap);
                    }
                }).catch(err => console.warn("Erro ao buscar pinos de endereço:", err));
            }
        } else if (newMode === 'polygons') {
            toast.info("Modo 3: Polígonos de Território (Em desenvolvimento)");
        }
    };

    const filteredTerritories = territories.filter(t => {
        if (selectedCityId !== 'ALL' && t.cityId !== selectedCityId) return false;
        if (selectedTerritoryId !== 'ALL' && t.id !== selectedTerritoryId) return false;
        return true;
    });

    const chunkArray = <T,>(arr: T[], chunkSize: number): T[][] => {
        const results: T[][] = [];
        for (let i = 0; i < arr.length; i += chunkSize) {
            results.push(arr.slice(i, i + chunkSize));
        }
        return results;
    };

    const a4Groups = chunkArray(filteredTerritories, 4);

    const handlePrint = () => {
        toast.dismiss();
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

    // Direct Image Upload (Permitido EXCLUSIVAMENTE no Modo 1)
    const handleTriggerImageUpload = (tId: string) => {
        if (cardMode !== 'manual-image') return;
        setActiveUploadTerritoryId(tId);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const tId = activeUploadTerritoryId;

        if (!file || !tId) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Por favor, selecione um arquivo de imagem válido.");
            return;
        }

        setUploadingTerritoryId(tId);

        try {
            const compressedUrl = await processTerritoryMapImage(file);
            
            const res = await updateTerritory(tId, { imageUrl: compressedUrl });
            if (!res.success) throw new Error(res.error || "Erro ao salvar no banco");

            setTerritories(prev => prev.map(t => t.id === tId ? { ...t, imageUrl: compressedUrl } : t));
            toast.success("Imagem do mapa salva com sucesso no banco de dados!");
        } catch (err: any) {
            console.error("Erro ao salvar imagem no banco:", err);
            toast.error(`Erro ao salvar imagem: ${err.message || 'Falha no salvamento'}`);
        } finally {
            setUploadingTerritoryId(null);
            setActiveUploadTerritoryId(null);
            if (e.target) e.target.value = '';
        }
    };

    const handleRemoveImage = (tId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (cardMode !== 'manual-image') return;

        setTerritories(prev => prev.map(t => t.id === tId ? { ...t, imageUrl: '' } : t));
        toast.success("Imagem removida!");

        updateTerritory(tId, { imageUrl: '' }).catch(err => {
            console.error("Erro ao remover imagem no banco:", err);
            toast.error("Erro ao sincronizar remoção de imagem.");
        });
    };

    return (
        <div className="min-h-screen bg-background text-main pb-12 print:bg-white print:text-black print:p-0 print:pb-0 font-serif">
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileSelected}
                className="hidden"
            />

            <style jsx global>{`
                @media print {
                    .no-print, header, nav, aside, [data-sonner-toaster], [data-sonner-toast], .toaster, #toast-container, .toast, [role="status"], [role="alert"] {
                        display: none !important;
                    }
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
            <header className="bg-surface border-b border-surface-border sticky top-0 z-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4 no-print shadow-md font-sans">
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
                    {/* Seletor Estrito de Modo de Exibição do Cartão */}
                    <div className="flex items-center bg-background border border-surface-border rounded-xl px-3 py-1.5 gap-2 text-xs font-semibold">
                        <Sliders className="w-4 h-4 text-amber-500" />
                        <span className="text-muted">Modo de Mapa:</span>
                        <select
                            value={cardMode}
                            onChange={(e) => handleSwitchCardMode(e.target.value as MapCardMode)}
                            className="bg-transparent text-main font-bold outline-none cursor-pointer"
                        >
                            <option value="manual-image" className="bg-surface text-main">Modo 1: Imagem Manual</option>
                            <option value="address-pins" className="bg-surface text-main">Modo 2: Pinos dos Endereços</option>
                            <option value="polygons" className="bg-surface text-main" disabled>Modo 3: Polígonos (Em Breve)</option>
                        </select>
                    </div>

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
                            4 por página (A4)
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
                            Individual (A6)
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
                                    const isUploadingThis = uploadingTerritoryId === t.id;
                                    const pins = cardMode === 'address-pins' ? (territoryPinsMap.get(t.id) || []) : [];

                                    return (
                                        <div
                                            key={t.id}
                                            className="w-[148.5mm] h-[105mm] border border-dashed border-gray-400 print:border-black px-7 py-4 flex flex-col justify-between box-border overflow-hidden bg-white relative group"
                                        >
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h2 className="text-center font-serif text-[21px] font-bold tracking-normal text-black mb-3">
                                                        Cartão de Mapa de Território
                                                    </h2>

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

                                                {/* Área do Mapa Estritamente ISOLADA por Modo */}
                                                <div
                                                    onClick={() => cardMode === 'manual-image' && !isUploadingThis && handleTriggerImageUpload(t.id)}
                                                    className={`relative flex-1 min-h-[36mm] my-1 flex flex-col justify-end items-center overflow-hidden group/map ${
                                                        cardMode === 'manual-image' ? 'cursor-pointer' : 'cursor-default'
                                                    }`}
                                                >
                                                    {cardMode === 'manual-image' ? (
                                                        /* MODO 1: IMAGEM MANUAL EXCLUSIVO */
                                                        isUploadingThis ? (
                                                            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-2 font-sans text-xs font-bold text-primary z-20">
                                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                                                <span>Processando mapa HD...</span>
                                                            </div>
                                                        ) : t.imageUrl ? (
                                                            <>
                                                                <img
                                                                    src={t.imageUrl}
                                                                    alt={`Mapa do Território ${t.name}`}
                                                                    className="absolute inset-0 w-full h-full object-cover object-center"
                                                                />
                                                                <div className="no-print absolute top-1.5 right-1.5 z-20 opacity-0 group-hover/map:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={(e) => handleRemoveImage(t.id, e)}
                                                                        className="bg-rose-600/90 hover:bg-rose-700 text-white p-1.5 rounded-lg shadow-md transition-colors"
                                                                        title="Remover Imagem do Mapa"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="no-print absolute inset-0 flex items-center justify-center pointer-events-none z-10 pb-4">
                                                                    <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover/map:bg-emerald-600 group-hover/map:text-white transition-all shadow-sm">
                                                                        <ImagePlus className="w-5 h-5" />
                                                                    </div>
                                                                </div>
                                                                <p className="font-serif font-bold text-[9px] text-black text-center relative z-10 bg-white px-2 py-0 mb-0">
                                                                    (Cole o mapa acima ou desenhe o território)
                                                                </p>
                                                            </>
                                                        )
                                                    ) : cardMode === 'address-pins' ? (
                                                        /* MODO 2: PINOS DOS ENDEREÇOS EXCLUSIVO */
                                                        <AddressPinsMap pins={pins} />
                                                    ) : (
                                                        /* MODO 3: POLÍGONOS (EM BREVE) */
                                                        <div className="absolute inset-0 bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center p-3 text-center">
                                                            <Hexagon className="w-6 h-6 text-purple-500 mb-1 opacity-70" />
                                                            <p className="font-sans font-bold text-[11px] text-slate-700">Modo 3: Desenho por Polígonos</p>
                                                            <p className="font-sans text-[9.5px] text-slate-500 mt-0.5">Em desenvolvimento futuro.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Rodapé Oficial S-12-T */}
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
                            const isUploadingThis = uploadingTerritoryId === t.id;
                            const pins = cardMode === 'address-pins' ? (territoryPinsMap.get(t.id) || []) : [];

                            return (
                                <div
                                    key={t.id}
                                    className="bg-white text-black border border-black px-7 py-4 shadow-lg print:shadow-none print:border-none w-[148mm] h-[105mm] mx-auto flex flex-col justify-between break-after-page s12-font select-none box-border overflow-hidden group relative"
                                >
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <h1 className="text-center font-serif text-[21px] font-bold tracking-normal text-black mb-3">
                                                Cartão de Mapa de Território
                                            </h1>

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

                                        {/* Área do Mapa Estritamente ISOLADA por Modo */}
                                        <div
                                            onClick={() => cardMode === 'manual-image' && !isUploadingThis && handleTriggerImageUpload(t.id)}
                                            className={`relative flex-1 min-h-[36mm] my-1 flex flex-col justify-end items-center overflow-hidden group/map ${
                                                cardMode === 'manual-image' ? 'cursor-pointer' : 'cursor-default'
                                            }`}
                                        >
                                            {cardMode === 'manual-image' ? (
                                                /* MODO 1: IMAGEM MANUAL EXCLUSIVO */
                                                isUploadingThis ? (
                                                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-2 font-sans text-xs font-bold text-primary z-20">
                                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                                        <span>Processando mapa HD...</span>
                                                    </div>
                                                ) : t.imageUrl ? (
                                                    <>
                                                        <img
                                                            src={t.imageUrl}
                                                            alt={`Mapa do Território ${t.name}`}
                                                            className="absolute inset-0 w-full h-full object-cover object-center"
                                                        />
                                                        <div className="no-print absolute top-1.5 right-1.5 z-20 opacity-0 group-hover/map:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => handleRemoveImage(t.id, e)}
                                                                className="bg-rose-600/90 hover:bg-rose-700 text-white p-1.5 rounded-lg shadow-md transition-colors"
                                                                title="Remover Imagem do Mapa"
                                                                >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="no-print absolute inset-0 flex items-center justify-center pointer-events-none z-10 pb-4">
                                                            <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover/map:bg-emerald-600 group-hover/map:text-white transition-all shadow-sm">
                                                                <ImagePlus className="w-5 h-5" />
                                                            </div>
                                                        </div>
                                                        <p className="font-serif font-bold text-[9px] text-black text-center relative z-10 bg-white px-2 py-0 mb-0">
                                                            (Cole o mapa acima ou desenhe o território)
                                                        </p>
                                                    </>
                                                )
                                            ) : cardMode === 'address-pins' ? (
                                                /* MODO 2: PINOS DOS ENDEREÇOS EXCLUSIVO */
                                                <AddressPinsMap pins={pins} />
                                            ) : (
                                                /* MODO 3: POLÍGONOS (EM BREVE) */
                                                <div className="absolute inset-0 bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center p-3 text-center">
                                                    <Hexagon className="w-6 h-6 text-purple-500 mb-1 opacity-70" />
                                                    <p className="font-sans font-bold text-[11px] text-slate-700">Modo 3: Desenho por Polígonos</p>
                                                    <p className="font-sans text-[9.5px] text-slate-500 mt-0.5">Em desenvolvimento futuro.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rodapé Oficial S-12-T */}
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
