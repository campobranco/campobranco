// app/components/Witnessing/EditPointModal.tsx
// Modal para edição de pontos de testemunho público existentes
// Salva alterações diretamente no Firestore

"use client";

import { useState, useEffect } from 'react';
import { X, Pencil, Loader2, MapPin, Search, MousePointer2, Navigation, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
// TODO(mutations): migrate to mutation layer - legacy module (admin/report/dashboard)
// eslint-disable-next-line no-restricted-imports
import { updateWitnessingPointDetails } from '@/lib/services/witnessing';
// TODO(mutations): migrate to mutation layer - legacy module (admin/report/dashboard)
// eslint-disable-next-line no-restricted-imports
import { geocodeAddress } from '@/lib/services/geocoding';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/app/components/MapView'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
});

// Tipagem com campos camelCase (padrão Firestore)
interface WitnessingPoint {
    id: string;
    name: string;
    address: string;
    cityId: string;
    congregationId: string;
    lat?: number;
    lng?: number;
    googleMapsLink?: string;
    wazeLink?: string;
    status: 'AVAILABLE' | 'OCCUPIED';
    schedule?: string;
}

interface EditPointModalProps {
    isOpen: boolean;
    onClose: () => void;
    point: WitnessingPoint | null;
    cityName: string;
    onSuccess?: () => void;
}

export default function EditPointModal({ isOpen, onClose, point, cityName, onSuccess }: EditPointModalProps) {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [googleMapsLink, setGoogleMapsLink] = useState('');
    const [wazeLink, setWazeLink] = useState('');
    const [schedule, setSchedule] = useState('');
    const [lat, setLat] = useState<number | undefined>(undefined);
    const [lng, setLng] = useState<number | undefined>(undefined);
    const [loading, setLoading] = useState(false);

    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [isMapSelectionMode, setIsMapSelectionMode] = useState(true);
    const [pickerTempCoords, setPickerTempCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [isGeocodingMap, setIsGeocodingMap] = useState(false);

    // Preenche o formulário com os dados atuais do ponto ao abrir
    useEffect(() => {
        if (point) {
            setName(point.name || '');
            setAddress(point.address || '');
            setGoogleMapsLink(point.googleMapsLink || '');
            setWazeLink(point.wazeLink || '');
            setSchedule(point.schedule || '');
            setLat(point.lat || undefined);
            setLng(point.lng || undefined);
        }
    }, [point, isOpen]);

    const handleMapSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!mapSearchQuery.trim()) return;

        setIsGeocodingMap(true);
        try {
            const results = await geocodeAddress(mapSearchQuery);
            if (results && results.length > 0) {
                const { lat, lon } = results[0];
                const newCoords = { lat: parseFloat(lat), lng: parseFloat(lon) };
                setPickerTempCoords(newCoords);
                setIsMapSelectionMode(true);
                toast.success("Localização encontrada!");
            } else {
                toast.error("Endereço não encontrado");
            }
        } catch (error) {
            console.error("Error geocoding in picker:", error);
            toast.error("Erro ao pesquisar endereço");
        } finally {
            setIsGeocodingMap(false);
        }
    };

    const handleMapClick = (clickLat: number, clickLng: number) => {
        if (isMapPickerOpen && isMapSelectionMode) {
            setPickerTempCoords({ lat: clickLat, lng: clickLng });
        }
    };

    // Atualiza o ponto no Firestore
    const handleUpdatePoint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!point || !name.trim()) return;

        setLoading(true);
        try {
            const result = await updateWitnessingPointDetails(point.id, {
                name: name.trim(),
                address: address.trim(),
                latitude: lat || 0,
                longitude: lng || 0,
                schedule: schedule.trim() || '',
                googleMapsLink: googleMapsLink.trim(),
                wazeLink: wazeLink.trim()
            });

            if (!result.success) throw new Error(result.error);

            toast.success("Ponto atualizado com sucesso!");
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Erro ao atualizar ponto:", error);
            toast.error("Erro ao atualizar ponto. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !point) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-lg w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Pencil className="w-6 h-6 text-primary" />
                        Editar Ponto
                    </h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                <form onSubmit={handleUpdatePoint} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nome do Local</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-lg p-4 font-bold text-gray-900 focus:ring-2 focus:ring-primary-light/50 outline-none"
                            placeholder="Ex: Praça Central"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Endereço</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-lg p-4 font-medium text-gray-900 focus:ring-2 focus:ring-primary-light/50 outline-none"
                            placeholder="Rua..."
                        />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Google Maps</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={googleMapsLink}
                                    onChange={(e) => setGoogleMapsLink(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-lg p-3 pr-10 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-primary-light/50 outline-none"
                                    placeholder="Link..."
                                />
                                <img
                                    src="/icons/google-maps.svg"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full object-cover pointer-events-none"
                                    alt=""
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Waze</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={wazeLink}
                                    onChange={(e) => setWazeLink(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-lg p-3 pr-10 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-primary-light/50 outline-none"
                                    placeholder="Link..."
                                />
                                <img
                                    src="/icons/waze.svg"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full object-cover pointer-events-none"
                                    alt=""
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Horário (Opcional)</label>
                        <input
                            type="text"
                            value={schedule}
                            onChange={(e) => setSchedule(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-xl p-4 font-medium text-gray-900 focus:ring-2 focus:ring-primary-light/50 outline-none"
                            placeholder="Ex: Segundas, 08:00 - 12:00"
                        />
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setPickerTempCoords(lat && lng ? { lat, lng } : null);
                                setIsMapPickerOpen(true);
                            }}
                            className="w-full py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2"
                        >
                            <MapPin className="w-4 h-4" /> Selecionar Pino no Mapa
                        </button>
                    </div>

                    <button type="submit" className="w-full py-3.5 bg-gray-900 text-white rounded-lg font-bold shadow-lg mt-2 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                    </button>
                </form>
            </div>

            {/* Map Picker Modal */}
            {isMapPickerOpen && (
                <div className="fixed inset-0 z-[2000] bg-background flex flex-col animate-in fade-in duration-300">
                    <header className="bg-surface border-b border-surface-border px-6 py-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-main tracking-tight">Selecionar Localização</h2>
                            <p className="text-xs text-muted font-bold uppercase tracking-widest">
                                {isMapSelectionMode ? 'Clique para marcar o ponto' : 'Arraste para navegar'}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsMapPickerOpen(false)}
                            className="p-2 hover:bg-background rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-muted" />
                        </button>
                    </header>

                    {/* Search Bar in Modal */}
                    <div className="bg-surface px-6 py-3 border-b border-surface-border">
                        <form onSubmit={handleMapSearch} className="relative w-full flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar endereço para o pino..."
                                    className="w-full bg-background border border-surface-border rounded-lg py-2 pl-9 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    value={mapSearchQuery}
                                    onChange={(e) => setMapSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleMapSearch}
                                disabled={isGeocodingMap}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                            >
                                {isGeocodingMap ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                                {isGeocodingMap ? 'Buscando...' : 'Buscar'}
                            </button>
                        </form>
                    </div>

                    <div className="flex-1 relative">
                        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
                            <button
                                onClick={() => setIsMapSelectionMode(true)}
                                className={`p-3 rounded-2xl shadow-xl transition-all ${isMapSelectionMode ? 'bg-blue-600 text-white scale-110' : 'bg-surface text-muted hover:text-main border border-surface-border'}`}
                                title="Modo Seleção"
                            >
                                <MousePointer2 className="w-6 h-6" />
                            </button>
                            <button
                                onClick={() => setIsMapSelectionMode(false)}
                                className={`p-3 rounded-2xl shadow-xl transition-all ${!isMapSelectionMode ? 'bg-blue-600 text-white scale-110' : 'bg-surface text-muted hover:text-main border border-surface-border'}`}
                                title="Modo Navegação"
                            >
                                <Navigation className="w-6 h-6" />
                            </button>
                        </div>

                        <MapView
                            onMapClick={handleMapClick}
                            center={pickerTempCoords || undefined}
                            items={pickerTempCoords ? [{
                                id: 'temp',
                                lat: pickerTempCoords.lat,
                                lng: pickerTempCoords.lng,
                                title: name || 'Novo Ponto',
                                variant: 'store',
                                status: 'LIVRE'
                            }] : []}
                            disableGeocoding={true}
                            showLegend={false}
                        />

                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-6">
                            <button
                                onClick={() => {
                                    if (pickerTempCoords) {
                                        setLat(pickerTempCoords.lat);
                                        setLng(pickerTempCoords.lng);
                                        setIsMapPickerOpen(false);
                                    }
                                }}
                                disabled={!pickerTempCoords || !isMapSelectionMode}
                                className={`w-full py-4 rounded-3xl font-bold flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-95 ${(!pickerTempCoords || !isMapSelectionMode) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                                <CheckCircle className="w-5 h-5" />
                                CONFIRMAR LOCAL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
