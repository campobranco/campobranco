"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, ThumbsUp, Home, Navigation, Ban, Truck, User, Maximize2, Minimize2, Map as MapIcon, Lock, Unlock } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { geocodeAddress } from '@/lib/services/geocoding';

// Interface defined by user requirements (adapted to match existing usage patterns)
export interface MapItem {
    id: string;
    lat?: number;
    lng?: number;
    title: string;          // Used for Street name or main label (Address usually)
    subtitle?: string;      // Used for extra info
    color?: string;         // Legacy color prop (optional override)
    status?: 'LIVRE' | 'OCUPADO' | 'PENDENTE' | 'NAO_VISITAR' | 'MUDOU' | 'NAO_CONTATADO' | 'AGUARDANDO';
    number?: string;        // visual "displayNumber"
    residentName?: string;  // Name of the resident to display below
    fullAddress?: string;   // Crucial for Geocoding: "Rua X, 123, Cidade-UF"
    googleMapsLink?: string; // Optional: Extract coords from this link if available
    gender?: 'HOMEM' | 'MULHER' | 'CASAL';
    variant?: 'default' | 'city' | 'numbered';
    index?: number;         // Used for numbered variant
    lastVisit?: string;     // Formatted date string
    isDeaf?: boolean;
    isMinor?: boolean;
    isStudent?: boolean;
    isNeurodivergent?: boolean;
}

const STATUS_CONFIG = {
    'OCUPADO': { color: '#22c55e', icon: ThumbsUp, label: 'Contatado' },       // Green-500
    'LIVRE': { color: '#94a3b8', icon: Home, label: 'Aguardando' },            // Slate-400 (Gray/Default)
    'AGUARDANDO': { color: '#94a3b8', icon: Home, label: 'Aguardando' },       // Alias for explicit waiting
    'NAO_CONTATADO': { color: '#f97316', icon: Ban, label: 'Não Encontrado' }, // Orange-500
    'NAO_VISITAR': { color: '#ef4444', icon: Ban, label: 'Não Visitar' },      // Red-500
    'MUDOU': { color: '#3b82f6', icon: Truck, label: 'Mudou-se' },             // Blue-500
    'PENDENTE': { color: '#eab308', icon: MapPin, label: 'Pendente' }          // Yellow-500
};

interface MapViewProps {
    items: MapItem[];
    center?: { lat: number; lng: number };
    zoom?: number;
    onGeocodeSuccess?: (id: string, lat: number, lng: number) => void;
    onMapClick?: (lat: number, lng: number) => void;
    onMarkerDragEnd?: (id: string, lat: number, lng: number) => void;
    onMarkerClick?: (item: MapItem) => void;
    showLegend?: boolean;
    disableGeocoding?: boolean;
    disableInteractionLock?: boolean;
}

const defaultCenter = {
    lat: -23.550520, // São Paulo
    lng: -46.633308
};

// Helper to extract coords from GMap Link
const extractCoordsFromUrl = (url?: string): { lat: number, lng: number } | null => {
    if (!url) return null;
    try {
        // Pattern 1: /@lat,lng
        const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

        // Pattern 2: q=lat,lng
        const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

        // Pattern 3: search/lat,lng
        const searchMatch = url.match(/search\/(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (searchMatch) return { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) };

    } catch (e) {
        console.warn("Error parsing maps link", e);
    }
    return null;
};

export default function MapView({ items, center = defaultCenter, zoom = 15, onGeocodeSuccess, onMapClick, onMarkerDragEnd, onMarkerClick, showLegend = true, disableGeocoding = false, disableInteractionLock = false }: MapViewProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]); // Keep track of Leaflet markers
    const geocodeCache = useRef<Map<string, { lat: number; lng: number; timestamp?: number }>>(new Map());
    const onMapClickRef = useRef(onMapClick);
    const onGeocodeSuccessRef = useRef(onGeocodeSuccess);
    const onMarkerDragEndRef = useRef(onMarkerDragEnd);
    const onMarkerClickRef = useRef(onMarkerClick);

    // Interaction State
    const [isInteractionEnabled, setIsInteractionEnabled] = useState(disableInteractionLock);
    const [showLockHint, setShowLockHint] = useState(false);
    const [isMapReady, setIsMapReady] = useState(false);

    // Sync Leaflet Handlers with Interaction State
    useEffect(() => {
        if (!mapInstanceRef.current) return;
        const map = mapInstanceRef.current;

        if (isInteractionEnabled) {
            map.dragging.enable();
            map.scrollWheelZoom.enable();
            map.doubleClickZoom.enable();
            if (map.touchZoom) map.touchZoom.enable();
        } else {
            map.dragging.disable();
            map.scrollWheelZoom.disable();
            map.doubleClickZoom.disable();
            if (map.touchZoom) map.touchZoom.disable();
        }
    }, [isInteractionEnabled, isMapReady]);

    // Update callback ref
    useEffect(() => {
        onMapClickRef.current = onMapClick;
        onGeocodeSuccessRef.current = onGeocodeSuccess;
        onMarkerDragEndRef.current = onMarkerDragEnd;
        onMarkerClickRef.current = onMarkerClick;
    }, [onMapClick, onGeocodeSuccess, onMarkerDragEnd, onMarkerClick]);

    const [isFullscreen, setIsFullscreen] = useState(false);

    // We maintain a local state of items that have *resolved* coordinates
    const [displayItems, setDisplayItems] = useState<MapItem[]>([]);
    useEffect(() => {
        // Load only items that already have coordinates (from DB or URL)
        const validItems = items.filter(item => {
            if (item.lat && item.lng) return true;

            // Still allow coordinate extraction from Google Maps links if provided
            const urlCoords = extractCoordsFromUrl(item.googleMapsLink);
            if (urlCoords) {
                item.lat = urlCoords.lat;
                item.lng = urlCoords.lng;
                return true;
            }

            return false;
        });

        setDisplayItems(validItems);
    }, [items]);

    // 2. MAP INITIALIZATION (Leaflet)
    useEffect(() => {
        // Wait for Leaflet to load (Next.js SSR handling)
        const init = async () => {
            if (typeof window === 'undefined') return;

            // Dynamic import of Leaflet if not present globally
            if (!(window as any).L) {
                // In a real usage with 'leaflet' npm package we would import it.
            }

            const checkForLeaflet = setInterval(() => {
                if ((window as any).L && mapContainerRef.current && !mapInstanceRef.current) {
                    clearInterval(checkForLeaflet);
                    const L = (window as any).L;

                    // Determine start center
                    const startLat = center.lat;
                    const startLng = center.lng;

                    const map = L.map(mapContainerRef.current, {
                        zoomControl: false,
                        dragging: false,
                        scrollWheelZoom: false,
                        doubleClickZoom: false,
                        touchZoom: false
                    }).setView([startLat, startLng], zoom);

                    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                        subdomains: 'abcd',
                        maxZoom: 20
                    }).addTo(map);

                    L.control.zoom({ position: 'topright' }).addTo(map);

                    // Click Listener
                    map.on('click', (e: any) => {
                        if (onMapClickRef.current) {
                            onMapClickRef.current(e.latlng.lat, e.latlng.lng);
                        }
                    });

                    // Location Found Listener (My Location)
                    map.on('locationfound', (e: any) => {
                        // Remove existing location marker if any
                        map.eachLayer((layer: any) => {
                            if (layer._isUserLocation) {
                                map.removeLayer(layer);
                            }
                        });

                        const radius = e.accuracy / 2;

                        // User Marker (Blue Dot)
                        const userMarker = L.circleMarker(e.latlng, {
                            radius: 8,
                            fillColor: '#16a34a',
                            color: '#fff',
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 1
                        }).addTo(map);
                        (userMarker as any)._isUserLocation = true;

                        // Accuracy Circle
                        const accuracyCircle = L.circle(e.latlng, {
                            radius: radius,
                            color: '#16a34a',
                            fillColor: '#16a34a',
                            fillOpacity: 0.1,
                            weight: 1
                        }).addTo(map);
                        (accuracyCircle as any)._isUserLocation = true;
                    });

                    mapInstanceRef.current = map;
                    setIsMapReady(true);
                }
            }, 200);

            return () => clearInterval(checkForLeaflet);
        };

        init();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [center.lat, center.lng, zoom]);

    // 3. MARKER RENDERING & UPDATES
    useEffect(() => {
        if (!isMapReady || !mapInstanceRef.current) return;

        const L = (window as any).L;
        const map = mapInstanceRef.current;

        // Clear existing markers to prevent duplicates during incremental updates
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        const bounds = L.latLngBounds([]);
        let hasValidMarkers = false;

        displayItems.forEach(item => {
            if (!item.lat || !item.lng) return; // Skip if still waiting for geocode

            hasValidMarkers = true;
            bounds.extend([item.lat, item.lng]);

            // Determine Style based on Status
            const statusKey = (item.status || 'LIVRE') as keyof typeof STATUS_CONFIG;
            const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG['LIVRE'];
            const color = config.color;

            // Determine content inside the circle
            // City: MapIcon. Address: item.number
            const isCity = item.variant === 'city';
            const innerContent = isCity ? (
                <MapIcon size={18} strokeWidth={2.5} />
            ) : (
                <span className="text-xs font-bold leading-none tracking-tighter">
                    {item.number && item.number !== 'S/N' ? item.number : ''}
                </span>
            );

            // Determina a cor de fundo e borda baseada no status
            // Para cidades, sempre azul? User said: "Cidades deve mostrar a bolinha azul"
            // Se LIVRE (Aguardando), usar Cinza? Sim, config.color resolve isso.
            const circleColor = isCity ? '#3b82f6' : color;
            const borderColor = '#ffffff';

            // Label Content
            let labelText = '';
            if (isCity) {
                labelText = item.title;
            } else if (item.residentName) {
                labelText = item.residentName;
            }

            // Custom HTML Marker Construction
            // Circle with Number/Icon inside + Label Below
            const iconHtml = renderToStaticMarkup(
                <div className="relative flex flex-col items-center justify-center transform transition-transform hover:scale-110 hover:z-50 cursor-pointer group" style={{ width: 'auto', minWidth: '40px', height: 'auto' }}>

                    {/* Main Circle */}
                    <div
                        className="w-9 h-9 rounded-full border-[3px] shadow-md flex items-center justify-center text-white mb-1 transition-colors"
                        style={{ backgroundColor: circleColor, borderColor: borderColor }}
                    >
                        {innerContent}
                    </div>

                    {/* Label/Chip Below (Only if has text) */}
                    {labelText && (
                        <div
                            className="px-2 py-0.5 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm z-30 max-w-[120px]"
                        >
                            <span className="text-[10px] font-bold whitespace-nowrap leading-none block text-gray-800 truncate text-center">
                                {labelText}
                            </span>
                        </div>
                    )}

                    {/* Hover Tooltip (Full Info) - Optional, mainly for desktop */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-40">
                        {item.title}
                    </div>
                </div>
            );

            const displayIcon = L.divIcon({
                html: iconHtml,
                className: 'custom-map-marker', // Clean class, no default styles
                iconSize: [40, 60],
                iconAnchor: [20, 20], // Anchor at center of circle roughly
                popupAnchor: [0, -20]
            });

            // Create Marker
            const marker = L.marker([item.lat, item.lng], {
                icon: displayIcon,
                draggable: !!onMarkerDragEnd
            })
                .addTo(map)
                .on('dragend', function (event: any) {
                    const marker = event.target;
                    const position = marker.getLatLng();
                    if (onMarkerDragEndRef.current) {
                        onMarkerDragEndRef.current(item.id, position.lat, position.lng);
                    }
                })
                .on('click', () => {
                    if (onMarkerClickRef.current) {
                        onMarkerClickRef.current(item);
                    }
                })
                .bindPopup((() => {
                    // Create safe DOM structure to prevent XSS
                    const container = document.createElement('div');
                    container.className = 'font-sans min-w-[250px]';

                    // --- Header: Address (Full) ---
                    const header = document.createElement('div');
                    header.className = 'border-l-4 pl-3 py-1 mb-4';
                    header.style.borderColor = color;

                    const title = document.createElement('h3');
                    title.className = 'font-black text-lg text-gray-900 leading-tight';
                    title.textContent = item.title;
                    header.appendChild(title);
                    container.appendChild(header);

                    // --- Content: Resident Box ---
                    // Always show if there is info, otherwise skip
                    // Normalize gender to uppercase for comparison
                    const genderNormalized = item.gender ? item.gender.toUpperCase() : undefined;

                    if (item.residentName || genderNormalized || item.isDeaf || item.isMinor || item.isStudent || item.isNeurodivergent) {
                        const residentContainer = document.createElement('div');
                        residentContainer.className = 'flex items-start gap-3 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100';

                        // Icon Check
                        const iconDiv = document.createElement('div');
                        let genderClass = 'bg-gray-200 text-gray-500';
                        if (genderNormalized === 'HOMEM') genderClass = 'bg-blue-100 text-blue-600';
                        else if (genderNormalized === 'MULHER') genderClass = 'bg-pink-100 text-pink-600';
                        else if (genderNormalized === 'CASAL') genderClass = 'bg-purple-100 text-purple-600';

                        iconDiv.className = `w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${genderClass}`;

                        if (genderNormalized === 'CASAL') {
                            iconDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
                        } else {
                            iconDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
                        }
                        residentContainer.appendChild(iconDiv);

                        // Info Column
                        const infoCol = document.createElement('div');
                        infoCol.className = 'flex flex-col min-w-0 flex-1';

                        const label = document.createElement('span');
                        label.className = 'text-[10px] font-bold uppercase text-gray-400 leading-none mb-1';
                        label.textContent = genderNormalized === 'CASAL' ? 'Casal' : 'Morador';
                        infoCol.appendChild(label);

                        if (item.residentName) {
                            const nameVal = document.createElement('span');
                            nameVal.className = 'font-bold text-sm text-gray-800 leading-tight truncate';
                            nameVal.textContent = item.residentName;
                            infoCol.appendChild(nameVal);
                        }

                        // Tags Row
                        const tagsDiv = document.createElement('div');
                        tagsDiv.className = 'flex flex-wrap gap-1 mt-1.5';

                        const createTag = (text: string, colorClass: string) => {
                            const t = document.createElement('span');
                            t.className = `px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${colorClass}`;
                            t.textContent = text;
                            return t;
                        };

                        // Gender Tags
                        if (genderNormalized === 'HOMEM') tagsDiv.appendChild(createTag('Homem', 'bg-blue-100 text-blue-700'));
                        if (genderNormalized === 'MULHER') tagsDiv.appendChild(createTag('Mulher', 'bg-pink-100 text-pink-700'));
                        if (genderNormalized === 'CASAL') tagsDiv.appendChild(createTag('Casal', 'bg-purple-100 text-purple-700'));

                        if (item.isDeaf) tagsDiv.appendChild(createTag('Surdo', 'bg-yellow-100 text-yellow-700'));
                        if (item.isMinor) tagsDiv.appendChild(createTag('Menor', 'bg-orange-100 text-orange-700'));
                        if (item.isStudent) tagsDiv.appendChild(createTag('Estudante', 'bg-purple-100 text-purple-700'));
                        if (item.isNeurodivergent) tagsDiv.appendChild(createTag('Neuro', 'bg-teal-100 text-teal-700'));

                        if (tagsDiv.hasChildNodes()) {
                            infoCol.appendChild(tagsDiv);
                        }

                        residentContainer.appendChild(infoCol);
                        container.appendChild(residentContainer);
                    }

                    // --- Footer: Status & Actions ---
                    const footer = document.createElement('div');
                    footer.className = 'flex items-end justify-between mt-2 pt-0 gap-4';

                    // Left Side: Status Info
                    const infoStack = document.createElement('div');
                    infoStack.className = 'flex flex-col gap-1.5 pb-1';

                    if (item.lastVisit || config.label) {
                        const stLabel = document.createElement('span');
                        stLabel.className = 'text-[10px] font-bold uppercase tracking-wider text-gray-400';
                        stLabel.textContent = 'Status';
                        infoStack.appendChild(stLabel);

                        // 1. Status Badge
                        if (config.label) {
                            const stBadge = document.createElement('span');
                            stBadge.className = 'inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase mb-1 w-fit';
                            stBadge.style.backgroundColor = `${color}20`;
                            stBadge.style.color = color;
                            stBadge.textContent = config.label;
                            infoStack.appendChild(stBadge);
                        }

                        // 2. Last Visit Date (Below status)
                        if (item.lastVisit) {
                            const lvContainer = document.createElement('div');
                            lvContainer.className = 'flex items-center gap-1 text-xs text-gray-500 font-medium';
                            lvContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg> ${item.lastVisit}`;
                            infoStack.appendChild(lvContainer);
                        }
                    }

                    footer.appendChild(infoStack);

                    // Right Side: Action Button (Bottom Right)
                    const navBtn = document.createElement('a');
                    navBtn.href = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
                    navBtn.target = '_blank';
                    navBtn.rel = 'noopener noreferrer';
                    // Use standard Green-600 (#16a34a) which matches var(--primary)
                    // Added !text-white to override Leaflet's default anchor styling
                    navBtn.className = 'flex items-center gap-2 bg-[#16a34a] !text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide hover:bg-[#15803d] transition-transform active:scale-95 shadow-lg shadow-green-600/20';
                    navBtn.innerHTML = `
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                        Ir
                    `;
                    footer.appendChild(navBtn);

                    container.appendChild(footer);

                    return container;
                })(), {
                    closeButton: false,
                    className: 'custom-popup-clean'
                });

            markersRef.current.push(marker);
        });

        if (hasValidMarkers) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
        }

    }, [displayItems, isMapReady, onMarkerDragEnd]);


    // Fullscreen Toggle Logic
    const toggleFullscreen = () => {
        const container = mapContainerRef.current?.parentElement;
        if (!container) return;

        if (!document.fullscreenElement) {
            // Enter Fullscreen
            if (container.requestFullscreen) {
                container.requestFullscreen().catch((err: any) => {
                    console.warn("Fullscreen API failed:", err);
                    // Fallback to CSS only if API fails
                    setIsFullscreen(true);
                });
            } else {
                // Fallback for iOS/safari if requestFullscreen not present
                setIsFullscreen(true);
            }
        } else {
            // Exit Fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            setIsFullscreen(false);
        }
    };

    // Sync state with native fullscreen changes (e.g. ESC key)
    useEffect(() => {
        const handleChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleChange);
        return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);

    // Handle Resize on Fullscreen Toggle or Interaction Toggle
    useEffect(() => {
        if (mapInstanceRef.current) {
            const map = mapInstanceRef.current;
            // Chamadas múltiplas para garantir que o mapa se ajuste após qualquer mudança de estado
            const timer1 = setTimeout(() => map.invalidateSize(), 100);
            const timer2 = setTimeout(() => map.invalidateSize(), 400);
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        }
    }, [isFullscreen, isInteractionEnabled]);

    return (
        <div
            className={`w-full h-full relative overflow-hidden rounded-lg shadow-sm border border-gray-100 ${isFullscreen ? 'fixed inset-0 z-[5000] rounded-none border-0 bg-white' : ''}`}
            style={isFullscreen ? { height: '100dvh', width: '100vw' } : {}}
            onMouseDown={() => {
                if (!isInteractionEnabled) {
                    setShowLockHint(true);
                    setTimeout(() => setShowLockHint(false), 2000);
                }
            }}
        >
            {/* Map Container - Removed transitions and filters that break Leaflet */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Interaction Lock Overlay Hint */}
            {showLockHint && !isInteractionEnabled && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-20 pointer-events-none px-6">
                    <div className="bg-black/80 backdrop-blur-md text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                        <Lock className="w-4 h-4 text-emerald-400" />
                        <span>Clique no cadeado para interagir com o mapa</span>
                    </div>
                </div>
            )}

            {/* NOTA: O bloqueio de pan/zoom é feito pelo Leaflet (dragging.disable, scrollWheelZoom.disable)
                 NÃO usamos overlay div aqui pois ele bloquearia cliques nos pinos/balões também.
                 O hint é mostrado via onMouseDown no container pai (abaixo). */}

            {!isMapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-50">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            )}



            {/* Floating Legend (Bottom Center) - Enhanced Design */}
            {showLegend && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-5 py-3 rounded-lg shadow-xl shadow-gray-200/50 border border-gray-100 flex items-center gap-6 z-10 scale-95 transition-transform group-hover:scale-100 origin-bottom">
                    {Object.entries(STATUS_CONFIG)
                        .filter(([key]) => key !== 'LIVRE' && key !== 'PENDENTE')
                        .map(([key, config]) => (
                            <div key={key} className="flex flex-col items-center gap-1">
                                <div
                                    className="w-3 h-3 rounded-full shadow-sm"
                                    style={{ backgroundColor: config.color }}
                                />
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{config.label}</span>
                            </div>
                        ))}
                    {/* Adding "Aguardando" manually for clarity if needed, or filter LIVRE differently */}
                </div>
            )}

            {/* My Location Button */}
            <button
                onClick={() => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.locate({ setView: true, maxZoom: 16 });
                    }
                }}
                type="button"
                className="absolute top-4 left-4 bg-white p-3 rounded-lg shadow-lg z-20 text-gray-600 hover:text-emerald-600 hover:bg-gray-50 transition-all border border-gray-100 active:scale-95"
                title="Minha Localização"
            >
                <Navigation className="w-5 h-5 transition-transform" />
            </button>

            {/* Interaction Lock Button - Hide if lock is disabled by prop */}
            {!disableInteractionLock && (
                <button
                    onClick={() => setIsInteractionEnabled(!isInteractionEnabled)}
                    type="button"
                    className={`absolute top-4 left-16 p-3 rounded-lg shadow-lg z-20 transition-all border active:scale-95 ${isInteractionEnabled
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/20'
                        : 'bg-white text-gray-600 border-gray-100 hover:bg-emerald-50 hover:text-emerald-600'
                        }`}
                    title={isInteractionEnabled ? "Travar Mapa" : "Destravar Mapa"}
                >
                    {isInteractionEnabled ? <Unlock className="w-5 h-5 fill-current" /> : <Lock className="w-5 h-5" />}
                </button>
            )}

            {/* Fullscreen Button - Adjust position if lock is hidden */}
            <button
                onClick={toggleFullscreen}
                type="button"
                className={`absolute top-4 bg-white p-3 rounded-lg shadow-lg z-20 text-gray-600 hover:text-emerald-600 hover:bg-gray-50 transition-all border border-gray-100 active:scale-95 ${disableInteractionLock ? 'left-16' : 'left-28'
                    }`}
                title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
            >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>


            {/* Global Styles for Leaflet Overrides */}
            <style jsx global>{`
                .custom-map-marker {
                    background: transparent !important;
                    border: none !important;
                }
                .custom-popup-clean .leaflet-popup-content-wrapper {
                    border-radius: 16px;
                    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
                    padding: 0;
                    overflow: hidden;
                }
                .custom-popup-clean .leaflet-popup-content {
                    margin: 0;
                    padding: 16px;
                }
                .custom-popup-clean .leaflet-popup-tip {
                    background: white;
                }
                .custom-popup-clean a.leaflet-popup-close-button {
                    display: none;
                }
                /* Custom Scrollbar */
                .custom-scrollbar::-webkit-scrollbar {
                  width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: #f1f1f1;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #fab5b5;
                  border-radius: 4px;
                }
            `}</style>
        </div>
    );
}
