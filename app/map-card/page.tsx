"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { ChevronLeft, Printer, MapPin, Building2, Filter, Loader2, LayoutGrid, FileText, Trash2, ImagePlus, Map as MapIcon, Sliders, Hexagon, Download, FolderDown, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
// eslint-disable-next-line no-restricted-imports
import { getRegistryData } from '@/lib/services/reports';
// eslint-disable-next-line no-restricted-imports
import { updateTerritory } from '@/lib/services/territories';
// eslint-disable-next-line no-restricted-imports
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
    residentName?: string;
}

// Wrapper para auto-escalar a folha A4/A6 proporcionalmente em qualquer tela mobile sem cortar
function ResponsiveSheet({ children, widthMm = 297, heightMm = 210 }: { children: React.ReactNode; widthMm?: number; heightMm?: number }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useLayoutEffect(() => {
        const handleResize = () => {
            if (!containerRef.current) return;
            const containerWidth = containerRef.current.clientWidth;
            // Conversão de mm para px na web (96 DPI): 1mm = 3.7795275591px
            const targetPx = widthMm * 3.7795275591;
            if (containerWidth > 0 && containerWidth < targetPx) {
                setScale(containerWidth / targetPx);
            } else {
                setScale(1);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [widthMm]);

    const targetHeightPx = heightMm * 3.7795275591;
    const marginAdjustment = scale < 1 ? -((1 - scale) * targetHeightPx) : 0;

    return (
        <div ref={containerRef} className="w-full flex justify-center overflow-visible print:w-auto print:block">
            <div
                style={{
                    transform: scale < 1 ? `scale(${scale})` : undefined,
                    transformOrigin: 'top center',
                    marginBottom: scale < 1 ? `${marginAdjustment}px` : undefined,
                }}
                className="shrink-0 transition-transform duration-150 print:transform-none print:mb-0"
            >
                {children}
            </div>
        </div>
    );
}

// Extrai coordenadas numéricas válidas (suportando números e strings) de lat/lng, objeto coordinates ou link do Google Maps
function parseAddressCoords(addr: any): { lat: number; lng: number } | null {
    const lat = typeof addr.lat === 'number' ? addr.lat : parseFloat(addr.lat);
    const lng = typeof addr.lng === 'number' ? addr.lng : parseFloat(addr.lng);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        return { lat, lng };
    }
    if (addr.coordinates) {
        const cLat = typeof addr.coordinates.lat === 'number' ? addr.coordinates.lat : parseFloat(addr.coordinates.lat);
        const cLng = typeof addr.coordinates.lng === 'number' ? addr.coordinates.lng : parseFloat(addr.coordinates.lng);
        if (!isNaN(cLat) && !isNaN(cLng) && cLat !== 0 && cLng !== 0) {
            return { lat: cLat, lng: cLng };
        }
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
            // Alternância direcional (topo, direita, baixo, esquerda) para evitar sobreposição entre cards
            const directions: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];

            pins.forEach((pin, idx) => {
                bounds.extend([pin.lat, pin.lng]);

                const customIcon = L.divIcon({
                    className: 'custom-pin-icon',
                    html: `<div style="background-color: #059669; color: white; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-family: sans-serif;">${idx + 1}</div>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                });

                const resident = pin.residentName?.trim();
                const marker = L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(map);

                // Sem fallbacks: exibe o rótulo APENAS se o nome do morador estiver cadastrado
                if (resident && resident !== '') {
                    const dir = directions[idx % directions.length];
                    const offsetMap: Record<string, [number, number]> = {
                        top: [0, -12],
                        right: [12, 0],
                        bottom: [0, 12],
                        left: [-12, 0]
                    };

                    marker.bindTooltip(resident, {
                        permanent: true,
                        direction: dir,
                        offset: offsetMap[dir],
                        className: 'fixed-address-label'
                    });
                }
            });

            if (pins.length === 1) {
                map.setView([pins[0].lat, pins[0].lng], 16);
            } else {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
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
        <div ref={containerRef} className="w-full flex items-baseline justify-center text-center overflow-visible">
            <span
                ref={spanRef}
                style={{ fontSize: `${maxFontSize}px` }}
                className="font-bold text-black whitespace-nowrap leading-normal"
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
    const [printLayoutMode, setPrintLayoutMode] = useState<'a6' | 'a4-grid'>('a6');
    
    // Modo Ativo Estrito (Modo 1: Imagem Manual | Modo 2: Pinos de Endereços | Modo 3: Polígonos)
    const [cardMode, setCardMode] = useState<MapCardMode>('manual-image');
    const [pageLoading, setPageLoading] = useState(true);

    // Direct Image Upload Ref & State (Ativo APENAS no Modo 1)
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeUploadTerritoryId, setActiveUploadTerritoryId] = useState<string | null>(null);
    const [uploadingTerritoryId, setUploadingTerritoryId] = useState<string | null>(null);

    // Estados de Exportação e Download (PDF / PNGs)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, stepName: '' });

    const fetchData = useCallback(async () => {
        const storedCongId = typeof window !== 'undefined' ? localStorage.getItem('selectedCongregationId') : null;
        const targetCongId = congregationId || storedCongId || null;

        if (!targetCongId) {
            setPageLoading(false);
            return;
        }

        setPageLoading(true);
        try {
            const resData = await getRegistryData(targetCongId);
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

    const loadAddressPins = useCallback(async (congId: string) => {
        try {
            const resAddr = await getAddresses(congId);
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
                            street: addr.street || '',
                            number: addr.number,
                            lat: coords.lat,
                            lng: coords.lng,
                            residentName: addr.residentName ? String(addr.residentName).trim() : ''
                        });
                        pinsMap.set(addr.territoryId, existing);
                    }
                });
                setTerritoryPinsMap(pinsMap);
            }
        } catch (err) {
            console.warn("Erro ao buscar pinos de endereço:", err);
        }
    }, []);

    useEffect(() => {
        if (!authLoading) {
            fetchData();
            if (cardMode === 'address-pins') {
                const storedCongId = typeof window !== 'undefined' ? localStorage.getItem('selectedCongregationId') : null;
                const targetCongId = congregationId || storedCongId || null;
                if (targetCongId) {
                    loadAddressPins(targetCongId);
                }
            }
        }
    }, [authLoading, fetchData, cardMode, congregationId, loadAddressPins]);

    // Troca Estrita de Modo: Desabilita e descarrega os outros modelos quando um modo é selecionado
    const handleSwitchCardMode = (newMode: MapCardMode) => {
        setCardMode(newMode);

        if (newMode === 'manual-image') {
            toast.info("Modo 1 Ativo: Imagem Manual (Modos 2 e 3 desabilitados)");
        } else if (newMode === 'address-pins') {
            toast.info("Modo 2 Ativo: Pinos dos Endereços (Modos 1 e 3 desabilitados)");
            const storedCongId = typeof window !== 'undefined' ? localStorage.getItem('selectedCongregationId') : null;
            const targetCongId = congregationId || storedCongId || null;

            if (targetCongId) {
                loadAddressPins(targetCongId);
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

    const handleNativePrint = () => {
        setIsExportModalOpen(false);
        toast.dismiss();
        const previousTitle = document.title;
        document.title = `S-12-T_Cartoes_de_Mapa_${printLayoutMode.toUpperCase()}`;
        window.print();
        setTimeout(() => {
            document.title = previousTitle;
        }, 500);
    };

    const renderCanvasFromId = async (elementId: string, scale: number = 3) => {
        const element = document.getElementById(elementId);
        if (!element) return null;

        return await html2canvas(element, {
            scale,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: 1920,
            windowHeight: 1080,
            onclone: (_clonedDoc, clonedElement) => {
                clonedElement.style.transform = 'none';
                clonedElement.style.margin = '0';

                // Corrigir tamanho do border-dotted no canvas:
                // html2canvas renderiza borders em pixels de canvas (scale × css-px).
                // Para que a linha pontilhada no export tenha o mesmo peso visual que no browser,
                // dividimos o border-width pelo scale → ao renderizar em 3×, 0.5px × 3 = 1.5px.
                const scaledBorderWidth = `${1.5 / scale}px`;
                clonedElement.querySelectorAll('[data-field-dotted]').forEach((el) => {
                    const node = el as HTMLElement;
                    node.style.borderBottomWidth = scaledBorderWidth;
                    node.style.borderBottomStyle = 'dotted';
                    node.style.borderBottomColor = '#000000';
                    // html2canvas renderiza items-end ~2px acima do browser,
                    // compensamos aumentando o paddingBottom apenas no clone
                    node.style.paddingBottom = '7px';
                    node.style.marginBottom = '0px';
                });

                let p = clonedElement.parentElement;
                while (p && p !== _clonedDoc.body) {
                    p.style.transform = 'none';
                    p.style.margin = '0';
                    p = p.parentElement;
                }
            },
        });
    };

    const exportAllToPdf = async () => {
        setExporting(true);
        try {
            if (printLayoutMode === 'a6') {
                const total = filteredTerritories.length;
                if (total === 0) return;
                setExportProgress({ current: 0, total, stepName: 'Iniciando compilação do PDF A6...' });

                const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [148.5, 105] });

                for (let i = 0; i < total; i++) {
                    const t = filteredTerritories[i];
                    setExportProgress({ current: i + 1, total, stepName: `Processando Território ${formatTerritoryNumber(t.name)}...` });
                    const canvas = await renderCanvasFromId(`card-export-a6-${t.id}`, 2.5);
                    if (canvas) {
                        const imgData = canvas.toDataURL('image/png');
                        if (i > 0) pdf.addPage([148.5, 105], 'landscape');
                        pdf.addImage(imgData, 'PNG', 0, 0, 148.5, 105);
                    }
                }
                pdf.save(`Cartoes_Territorio_A6_Todos_${new Date().toISOString().slice(0, 10)}.pdf`);
                toast.success("PDF A6 baixado com sucesso!");
            } else {
                const total = a4Groups.length;
                if (total === 0) return;
                setExportProgress({ current: 0, total, stepName: 'Iniciando compilação do PDF A4...' });

                const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [297, 210] });

                for (let i = 0; i < total; i++) {
                    setExportProgress({ current: i + 1, total, stepName: `Processando página ${i + 1} de ${total}...` });
                    const canvas = await renderCanvasFromId(`card-export-a4-${i}`, 2.5);
                    if (canvas) {
                        const imgData = canvas.toDataURL('image/png');
                        if (i > 0) pdf.addPage([297, 210], 'landscape');
                        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
                    }
                }
                pdf.save(`Cartoes_Territorio_A4_Todos_${new Date().toISOString().slice(0, 10)}.pdf`);
                toast.success("PDF A4 baixado com sucesso!");
            }
        } catch (err: any) {
            console.error("Erro ao exportar PDF:", err);
            toast.error("Falha ao gerar o arquivo PDF. Tente novamente.");
        } finally {
            setExporting(false);
            setIsExportModalOpen(false);
        }
    };

    const exportIndividualPdfs = async () => {
        setExporting(true);
        try {
            const total = filteredTerritories.length;
            if (total === 0) return;
            setExportProgress({ current: 0, total, stepName: 'Iniciando download de PDFs individuais...' });

            for (let i = 0; i < total; i++) {
                const t = filteredTerritories[i];
                setExportProgress({ current: i + 1, total, stepName: `Gerando PDF do Território ${formatTerritoryNumber(t.name)}...` });
                
                const elementId = printLayoutMode === 'a6' ? `card-export-a6-${t.id}` : `card-export-a4-0`;
                const canvas = await renderCanvasFromId(elementId, 2.5) || await renderCanvasFromId(`card-export-a6-${t.id}`, 2.5);
                
                if (canvas) {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: printLayoutMode === 'a6' ? [148.5, 105] : [297, 210] });
                    pdf.addImage(imgData, 'PNG', 0, 0, printLayoutMode === 'a6' ? 148.5 : 297, printLayoutMode === 'a6' ? 105 : 210);
                    
                    const cleanCity = (t.cityName || '').replace(/[^a-zA-Z0-9]/g, '_');
                    pdf.save(`Cartao_Territorio_${formatTerritoryNumber(t.name)}${cleanCity ? `_${cleanCity}` : ''}.pdf`);
                    await new Promise(r => setTimeout(r, 400));
                }
            }
            toast.success("Todos os arquivos PDF individuais foram baixados!");
        } catch (err: any) {
            console.error("Erro ao exportar PDFs individuais:", err);
            toast.error("Falha ao baixar arquivos PDF individuais.");
        } finally {
            setExporting(false);
            setIsExportModalOpen(false);
        }
    };

    const exportIndividualPngs = async () => {
        setExporting(true);
        try {
            const total = filteredTerritories.length;
            if (total === 0) return;
            setExportProgress({ current: 0, total, stepName: 'Iniciando download de imagens...' });

            for (let i = 0; i < total; i++) {
                const t = filteredTerritories[i];
                setExportProgress({ current: i + 1, total, stepName: `Gerando imagem HD do Território ${formatTerritoryNumber(t.name)}...` });
                
                const canvas = await renderCanvasFromId(`card-export-a6-${t.id}`, 3);
                
                if (canvas) {
                    const link = document.createElement('a');
                    const cleanCity = (t.cityName || '').replace(/[^a-zA-Z0-9]/g, '_');
                    link.download = `Cartao_Territorio_${formatTerritoryNumber(t.name)}${cleanCity ? `_${cleanCity}` : ''}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    await new Promise(r => setTimeout(r, 400));
                }
            }
            toast.success("Todas as imagens individuais foram baixadas!");
        } catch (err: any) {
            console.error("Erro ao exportar imagens:", err);
            toast.error("Falha ao baixar imagens individuais.");
        } finally {
            setExporting(false);
            setIsExportModalOpen(false);
        }
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
                .fixed-address-label {
                    background-color: rgba(255, 255, 255, 0.95) !important;
                    border: 1px solid #059669 !important;
                    color: #065f46 !important;
                    font-weight: bold !important;
                    font-size: 9.5px !important;
                    padding: 2px 6px !important;
                    border-radius: 4px !important;
                    box-shadow: 0 1.5px 4px rgba(0,0,0,0.2) !important;
                    font-family: system-ui, -apple-system, sans-serif !important;
                    white-space: nowrap !important;
                }
                .leaflet-tooltip-top.fixed-address-label::before { border-top-color: #059669 !important; }
                .leaflet-tooltip-bottom.fixed-address-label::before { border-bottom-color: #059669 !important; }
                .leaflet-tooltip-right.fixed-address-label::before { border-right-color: #059669 !important; }
                .leaflet-tooltip-left.fixed-address-label::before { border-left-color: #059669 !important; }
            `}</style>

            {/* Cabeçalho de Ações e Filtros (oculto na impressão) */}
            <header className="bg-surface border-b border-surface-border sticky top-0 z-50 px-3.5 py-3 sm:px-6 sm:py-3.5 flex flex-col gap-3 no-print shadow-md font-sans">
                {/* Linha Superior: Título à esquerda + Modo de Mapa à direita */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-2.5">
                        <button onClick={() => router.back()} className="p-1.5 sm:p-2 hover:bg-background rounded-full transition-colors shrink-0">
                            <ChevronLeft className="w-5 h-5 text-muted" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-xl font-bold text-main flex items-center gap-2 truncate">
                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
                                <span className="truncate">Cartão de Mapa de Território</span>
                            </h1>
                            <p className="text-[11px] sm:text-xs text-muted truncate">Formulário S-12-T 6/72</p>
                        </div>
                    </div>

                    {/* Seletor Estrito de Modo de Exibição do Cartão */}
                    <div className="flex items-center justify-between sm:justify-start bg-background border border-surface-border rounded-xl px-3 py-2 gap-2 text-xs font-semibold shadow-sm w-full sm:w-auto">
                        <div className="flex items-center gap-2 shrink-0">
                            <Sliders className="w-4 h-4 text-amber-500" />
                            <span className="text-muted">Modo:</span>
                        </div>
                        <select
                            value={cardMode}
                            onChange={(e) => handleSwitchCardMode(e.target.value as MapCardMode)}
                            className="bg-transparent text-main font-bold outline-none cursor-pointer flex-1 sm:flex-none text-right sm:text-left"
                        >
                            <option value="manual-image" className="bg-surface text-main">Modo 1: Imagem Manual</option>
                            <option value="address-pins" className="bg-surface text-main">Modo 2: Pinos dos Endereços</option>
                            <option value="polygons" className="bg-surface text-main" disabled>Modo 3: Polígonos (Em Breve)</option>
                        </select>
                    </div>
                </div>

                {/* Linha Inferior: Layouts, Filtros de Cidade/Território e Impressão */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between sm:justify-end gap-2.5 w-full pt-1">
                    {/* Seletor do Formato de Impressão */}
                    <div className="grid grid-cols-2 sm:flex items-center bg-background border border-surface-border rounded-xl p-1 gap-1 w-full sm:w-auto">
                        <button
                            onClick={() => setPrintLayoutMode('a4-grid')}
                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                printLayoutMode === 'a6'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-muted hover:text-main'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Individual (A6)
                        </button>
                    </div>

                    {/* Filtros em Grid em Mobile */}
                    <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                        {/* Filtro de Cidade */}
                        <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-background border border-surface-border rounded-xl px-2.5 py-1.5 text-xs font-semibold min-w-0">
                            <div className="flex items-center gap-1 shrink-0">
                                <Filter className="w-3.5 h-3.5 text-muted" />
                                <span className="text-muted hidden xs:inline">Cidade:</span>
                            </div>
                            <select
                                value={selectedCityId}
                                onChange={(e) => {
                                    setSelectedCityId(e.target.value);
                                    setSelectedTerritoryId('ALL');
                                }}
                                className="bg-transparent text-main font-bold outline-none cursor-pointer truncate max-w-full"
                            >
                                <option value="ALL" className="bg-surface text-main">Todas as Cidades</option>
                                {cities.map(c => (
                                    <option key={c.id} value={c.id} className="bg-surface text-main">{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro de Território */}
                        <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-background border border-surface-border rounded-xl px-2.5 py-1.5 text-xs font-semibold min-w-0">
                            <span className="text-muted shrink-0 hidden xs:inline">Território:</span>
                            <select
                                value={selectedTerritoryId}
                                onChange={(e) => setSelectedTerritoryId(e.target.value)}
                                className="bg-transparent text-main font-bold outline-none cursor-pointer truncate max-w-full"
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
                    </div>

                    <button
                        onClick={() => setIsExportModalOpen(true)}
                        disabled={filteredTerritories.length === 0}
                        className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20 text-xs uppercase tracking-wider disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Imprimir / Baixar
                    </button>
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="w-full max-w-[1250px] mx-auto p-2 sm:p-4 md:p-8 print:p-0 print:max-w-none font-serif overflow-hidden">
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
                    <div className="w-full pb-4 pt-1 flex flex-col items-center gap-10 print:gap-0">
                        {a4Groups.map((group, pageIndex) => (
                            <ResponsiveSheet key={pageIndex} widthMm={297} heightMm={210}>
                                <div
                                    id={`card-export-a4-${pageIndex}`}
                                    className="bg-white text-black border border-gray-300 print:border-none shadow-xl print:shadow-none w-[297mm] h-[210mm] mx-auto grid grid-cols-2 grid-rows-2 break-after-page select-none s12-font box-border overflow-hidden"
                                >
                                {group.map((t) => {
                                    const localidadeText = formatLocalidade(t.description, t.cityName);
                                    const isUploadingThis = uploadingTerritoryId === t.id;
                                    const pins = cardMode === 'address-pins' ? (territoryPinsMap.get(t.id) || []) : [];

                                    return (
                                        <div
                                            key={t.id}
                                            className="w-[148.5mm] h-[105mm] border border-gray-300 print:border-black px-7 py-4 flex flex-col justify-between box-border overflow-hidden bg-white relative group"
                                        >
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h2 className="text-center font-serif text-[21px] font-bold tracking-normal text-black mb-3">
                                                        Cartão de Mapa de Território
                                                    </h2>

                                                    <div className="flex items-baseline justify-between font-serif text-[12px] font-bold text-black mb-2">
                                                        {/* Localidade */}
                                                        <div className="flex items-baseline flex-1 min-w-0 mr-4">
                                                            <span className="shrink-0 font-bold mr-1.5 text-black">Localidade</span>
                                                            <div data-field-dotted className="flex-1 border-b-[1.5px] border-dotted border-black flex items-end justify-center pb-[0px] -mb-[1px]">
                                                                <AutoFitText text={localidadeText} />
                                                            </div>
                                                        </div>

                                                        {/* Terr. N.º */}
                                                        <div className="flex items-baseline shrink-0 w-28 ml-1">
                                                            <span className="shrink-0 font-bold mr-1 text-black">Terr. N.º</span>
                                                            <div data-field-dotted className="flex-1 border-b-[1.5px] border-dotted border-black flex items-end justify-center pb-[0px] -mb-[1px]">
                                                                <span className="font-bold text-black whitespace-nowrap leading-tight">
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
                                                                <p className="font-serif font-bold text-[9.5px] text-black text-center relative z-10 bg-white px-2 py-0.5 mb-0 leading-normal">
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
                        </ResponsiveSheet>
                        ))}
                    </div>
                ) : (
                    /* MODALIDADE: CARTÃO INDIVIDUAL A6 HORIZONTAL (148mm x 105mm) */
                    <div className="w-full pb-4 pt-1 flex flex-col items-center gap-10 print:gap-0">
                        {filteredTerritories.map((t) => {
                            const localidadeText = formatLocalidade(t.description, t.cityName);
                            const isUploadingThis = uploadingTerritoryId === t.id;
                            const pins = cardMode === 'address-pins' ? (territoryPinsMap.get(t.id) || []) : [];

                            return (
                                <ResponsiveSheet key={t.id} widthMm={148.5} heightMm={105}>
                                    <div
                                        id={`card-export-a6-${t.id}`}
                                        className="bg-white text-black border border-gray-300 print:border-black px-7 py-4 shadow-lg print:shadow-none w-[148.5mm] h-[105mm] mx-auto flex flex-col justify-between break-after-page s12-font select-none box-border overflow-hidden group relative"
                                    >
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <h1 className="text-center font-serif text-[21px] font-bold tracking-normal text-black mb-3">
                                                Cartão de Mapa de Território
                                            </h1>

                                            <div className="flex items-baseline justify-between font-serif text-[12px] font-bold text-black mb-2">
                                                {/* Localidade */}
                                                <div className="flex items-baseline flex-1 min-w-0 mr-4">
                                                    <span className="shrink-0 font-bold mr-1.5 text-black">Localidade</span>
                                                    <div data-field-dotted className="flex-1 border-b-[1.5px] border-dotted border-black flex items-end justify-center pb-[0px] -mb-[1px]">
                                                        <AutoFitText text={localidadeText} />
                                                    </div>
                                                </div>

                                                {/* Terr. N.º */}
                                                <div className="flex items-baseline shrink-0 w-28 ml-1">
                                                    <span className="shrink-0 font-bold mr-1 text-black">Terr. N.º</span>
                                                    <div data-field-dotted className="flex-1 border-b-[1.5px] border-dotted border-black flex items-end justify-center pb-[0px] -mb-[1px]">
                                                        <span className="font-bold text-black whitespace-nowrap leading-tight">
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
                                                        <p className="font-serif font-bold text-[9.5px] text-black text-center relative z-10 bg-white px-2 py-0.5 mb-0 leading-normal">
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
                                </ResponsiveSheet>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal de Opções de Exportação e Impressão */}
            {isExportModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
                    <div className="bg-surface border border-surface-border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header do Modal */}
                        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between bg-surface sticky top-0">
                            <div>
                                <h2 className="text-lg font-bold text-main flex items-center gap-2">
                                    <Download className="w-5 h-5 text-primary" />
                                    Opções de Impressão e Download
                                </h2>
                                <p className="text-xs text-muted">
                                    Escolha como deseja salvar ou imprimir os {filteredTerritories.length} cartões
                                </p>
                            </div>
                            <button
                                onClick={() => !exporting && setIsExportModalOpen(false)}
                                disabled={exporting}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-30"
                            >
                                <X className="w-5 h-5 text-muted" />
                            </button>
                        </div>

                        {/* Corpo do Modal */}
                        <div className="p-6 space-y-4 overflow-y-auto font-sans">
                            {exporting ? (
                                <div className="py-8 text-center space-y-4">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                                    <div className="space-y-1">
                                        <p className="font-bold text-main text-sm">{exportProgress.stepName}</p>
                                        <p className="text-xs text-muted">
                                            Progresso: {exportProgress.current} de {exportProgress.total}
                                        </p>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                                        <div
                                            className="bg-primary h-full transition-all duration-300"
                                            style={{ width: `${exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Opção 1: Todos Juntos num único PDF */}
                                    <button
                                        onClick={exportAllToPdf}
                                        className="w-full p-4 rounded-xl border border-surface-border hover:border-primary/50 bg-background text-left transition-all group flex items-start gap-4"
                                    >
                                        <div className="p-3 bg-primary text-white rounded-xl shrink-0 group-hover:scale-105 transition-transform shadow-md">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <h3 className="font-bold text-main text-sm flex items-center gap-2">
                                                Baixar Todos em um Único PDF
                                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Recomendado</span>
                                            </h3>
                                            <p className="text-xs text-muted leading-relaxed">
                                                Gera um único PDF com todos os cartões juntos ({printLayoutMode === 'a6' ? '1 cartão A6 por página' : '4 por folha A4'}).
                                            </p>
                                        </div>
                                    </button>

                                    {/* Opção 2: PDFs Separados por Território */}
                                    <button
                                        onClick={exportIndividualPdfs}
                                        className="w-full p-4 rounded-xl border border-surface-border hover:border-primary/50 bg-background text-left transition-all group flex items-start gap-4"
                                    >
                                        <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <h3 className="font-bold text-main text-sm">
                                                Baixar PDFs Separados (Um PDF por Território)
                                            </h3>
                                            <p className="text-xs text-muted leading-relaxed">
                                                Baixa um arquivo .PDF independente de formato {printLayoutMode.toUpperCase()} para cada cartão de território.
                                            </p>
                                        </div>
                                    </button>

                                    {/* Opção 3: PNGs Separados por Território */}
                                    <button
                                        onClick={exportIndividualPngs}
                                        className="w-full p-4 rounded-xl border border-surface-border hover:border-primary/50 bg-background text-left transition-all group flex items-start gap-4"
                                    >
                                        <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                                            <FolderDown className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <h3 className="font-bold text-main text-sm">
                                                Baixar Imagens PNG Separadas (Uma Imagem por Território)
                                            </h3>
                                            <p className="text-xs text-muted leading-relaxed">
                                                Baixa cada cartão de território como uma imagem HD de alta qualidade (.PNG).
                                            </p>
                                        </div>
                                    </button>

                                    {/* Opção 4: Imprimir nativo */}
                                    <button
                                        onClick={handleNativePrint}
                                        className="w-full p-4 rounded-xl border border-surface-border hover:border-muted/50 bg-background text-left transition-all group flex items-start gap-4 opacity-80 hover:opacity-100"
                                    >
                                        <div className="p-3 bg-gray-100 dark:bg-gray-800 text-muted rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                                            <Printer className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <h3 className="font-bold text-main text-sm">
                                                Imprimir pelo Navegador (Impressora Nativa)
                                            </h3>
                                            <p className="text-xs text-muted leading-relaxed">
                                                Abre a janela de impressão nativa do sistema (recomendado para computadores com impressoras A4 comuns).
                                            </p>
                                        </div>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
