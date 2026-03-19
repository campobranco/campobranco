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

    useEffect(() => {
        // Inicialização do Leaflet (Mesma lógica do MapView principal)
        const initMap = async () => {
            if (typeof window === 'undefined' || !mapContainerRef.current) return;

            // Esperar o Leaflet estar disponível globalmente (carregado via layout.tsx)
            const checkForLeaflet = setInterval(() => {
                if ((window as any).L && mapContainerRef.current && !mapInstanceRef.current) {
                    clearInterval(checkForLeaflet);
                    const L = (window as any).L;

                    const center = points.length > 0
                        ? [points[0].latitude, points[0].longitude]
                        : [-23.5505, -46.6333];

                    const map = L.map(mapContainerRef.current, {
                        zoomControl: false,
                        attributionControl: false
                    }).setView(center, 14);

                    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                        subdomains: 'abcd',
                        maxZoom: 20
                    }).addTo(map);

                    mapInstanceRef.current = map;
                    setIsMapReady(true);
                }
            }, 200);

            return () => clearInterval(checkForLeaflet);
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [points]);

    // Atualizar marcadores quando os pontos mudarem
    useEffect(() => {
        if (!isMapReady || !mapInstanceRef.current) return;

        const L = (window as any).L;
        const map = mapInstanceRef.current;

        // Limpar marcadores antigos
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        const bounds = L.latLngBounds([]);
        
        points.forEach(point => {
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

            const marker = L.marker([point.latitude, point.longitude], { icon })
                .bindPopup(`<b style="font-family: sans-serif; font-size: 12px;">${point.name}</b>`)
                .addTo(map);

            markersRef.current.push(marker);
            bounds.extend([point.latitude, point.longitude]);
        });

        if (points.length > 0) {
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
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
