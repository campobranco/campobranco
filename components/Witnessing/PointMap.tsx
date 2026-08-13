"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface WitnessingPoint {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    status: string;
}

interface PointMapProps {
    points: WitnessingPoint[];
}

export default function PointMap({ points }: PointMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const [isMapReady, setIsMapReady] = useState(false);
    const pointsRef = useRef(points);

    // Manter a ref de points atualizada para a inicialização assíncrona
    useEffect(() => {
        pointsRef.current = points;
    }, [points]);

    useEffect(() => {
        const initMap = async () => {
            if (typeof window === 'undefined' || !mapContainerRef.current) return;

            try {
                const L = (await import('leaflet')).default;
                (window as any).L = L; // Keep it globally for the markers effect

                if (mapContainerRef.current && !mapInstanceRef.current) {
                    const currentPoints = pointsRef.current;
                    const center = currentPoints.length > 0
                        ? [currentPoints[0].latitude, currentPoints[0].longitude]
                        : [-23.5505, -46.6333];

                    const map = L.map(mapContainerRef.current, {
                        zoomControl: false,
                        attributionControl: false
                    }).setView(center as any, 14);

                    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                        subdomains: 'abcd',
                        maxZoom: 20
                    }).addTo(map);

                    mapInstanceRef.current = map;
                    setIsMapReady(true);
                }
            } catch (error) {
                console.error("Failed to load Leaflet in PointMap:", error);
            }
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                try {
                    mapInstanceRef.current.remove();
                } catch (e) {
                    console.warn("[PointMap] Erro ao destruir o mapa Leaflet:", e);
                }
                mapInstanceRef.current = null;
            }
        };
    }, []); // Inicializa apenas uma vez no mount

    // Atualizar marcadores quando os pontos mudarem ou o mapa estiver pronto
    useEffect(() => {
        if (!isMapReady || !mapInstanceRef.current) return;

        const L = (window as any).L;
        const map = mapInstanceRef.current;

        // Limpar marcadores antigos com segurança
        markersRef.current.forEach(m => {
            try {
                m.remove();
            } catch (e) {
                console.warn("[PointMap] Erro ao remover marcador:", e);
            }
        });
        markersRef.current = [];

        if (points.length === 0) return;

        const bounds = L.latLngBounds([]);
        
        points.forEach(point => {
            // Garantir que temos coordenadas válidas
            if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number' || isNaN(point.latitude) || isNaN(point.longitude)) {
                return;
            }

            const isOccupied = point.status === 'OCCUPIED';
            const color = isOccupied ? "#fbbf24" : "#34d399";
            const borderColor = isOccupied ? "#d97706" : "#059669";

            const iconHtml = `
                <div style="
                    width: 14px; 
                    height: 14px; 
                    background-color: ${color}; 
                    border: 2px solid #ffffff; 
                    border-radius: 50%; 
                    box-shadow: 0 0 10px ${borderColor}66;
                "></div>
            `;

            const icon = L.divIcon({
                html: iconHtml,
                className: 'witnessing-dot',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            });

            try {
                const marker = L.marker([point.latitude, point.longitude], { icon })
                    .bindPopup(`<b style="font-family: sans-serif; font-size: 12px;">${point.name}</b>`)
                    .addTo(map);

                markersRef.current.push(marker);
                bounds.extend([point.latitude, point.longitude]);
            } catch (e) {
                console.error("[PointMap] Erro ao adicionar marcador no ponto:", point, e);
            }
        });

        if (markersRef.current.length > 0) {
            try {
                map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
            } catch (e) {
                console.warn("[PointMap] Erro ao ajustar bounds:", e);
            }
        }
    }, [points, isMapReady]);

    return (
        <div className="w-full h-full rounded-3xl overflow-hidden shadow-inner relative bg-gray-100 border border-gray-100">
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            {!isMapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            )}
        </div>
    );
}
