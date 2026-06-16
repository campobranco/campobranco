"use client";

import { useEffect, useState, useCallback } from 'react';
import { 
    X, 
    Plus, 
    Pencil, 
    Trash2, 
    Loader2, 
    MapPin, 
    Navigation, 
    AlertCircle, 
    ChevronLeft,
    Compass,
    Search
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    getReferencePoints, 
    createReferencePoint, 
    updateReferencePoint, 
    deleteReferencePoint,
    ReferencePoint 
} from '@/lib/services/reference_points';
import { geocodeAddress } from '@/lib/services/geocoding';
import dynamic from 'next/dynamic';
import { MapSkeleton } from '@/app/components/Skeleton';
import { useAuth } from '@/app/context/AuthContext';

const MapView = dynamic(() => import('@/app/components/MapView'), {
    loading: () => <MapSkeleton />,
    ssr: false
});

interface ReferencePointsModalProps {
    isOpen: boolean;
    onClose: () => void;
    congregationId: string;
    cityId: string;
    cityName?: string;
    onSuccess?: () => void;
}

export default function ReferencePointsModal({
    isOpen,
    onClose,
    congregationId,
    cityId,
    cityName = '',
    onSuccess
}: ReferencePointsModalProps) {
    const { canManageReferencePoints, isServant, isElder, isAdminRoleGlobal } = useAuth();
    const canManage = canManageReferencePoints || isServant || isElder || isAdminRoleGlobal;

    const [points, setPoints] = useState<ReferencePoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState<ReferencePoint | null>(null);

    // Form states
    const [name, setName] = useState('');
    const [observations, setObservations] = useState('');
    const [pickerCoords, setPickerCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>(undefined);
    const [searchAddressQuery, setSearchAddressQuery] = useState('');
    const [searchingAddress, setSearchingAddress] = useState(false);

    const defaultCenter = { lat: -23.550520, lng: -46.633308 }; // São Paulo

    const handleSearchAddress = async () => {
        if (!searchAddressQuery.trim()) {
            toast.error("Digite um endereço para buscar.");
            return;
        }
        setSearchingAddress(true);
        try {
            const results = await geocodeAddress(searchAddressQuery);
            if (results && results.length > 0) {
                const lat = parseFloat(results[0].lat);
                const lng = parseFloat(results[0].lon);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setPickerCoords({ lat, lng });
                    setMapCenter({ lat, lng });
                    toast.success("Endereço encontrado!");
                } else {
                    toast.error("Erro ao processar as coordenadas do endereço.");
                }
            } else {
                toast.error("Endereço não encontrado. Tente outro termo ou clique no mapa.");
            }
        } catch (error) {
            console.error("Erro na busca de endereço:", error);
            toast.error("Erro ao buscar endereço.");
        } finally {
            setSearchingAddress(false);
        }
    };

    const fetchPoints = useCallback(async () => {
        setLoading(true);
        const result = await getReferencePoints(congregationId, cityId);
        if (result.success) {
            setPoints(result.data || []);
            // Set initial map center based on first reference point or default
            if (result.data && result.data.length > 0 && result.data[0].lat) {
                setMapCenter({ lat: result.data[0].lat, lng: result.data[0].lng });
            }
        } else {
            toast.error("Erro ao carregar pontos de referência: " + result.error);
        }
        setLoading(false);
    }, [congregationId, cityId]);

    useEffect(() => {
        if (isOpen && congregationId && cityId) {
            fetchPoints();
            setIsFormOpen(false);
            setEditingPoint(null);
            clearForm();
        }
    }, [isOpen, congregationId, cityId, fetchPoints]);

    const clearForm = () => {
        setName('');
        setObservations('');
        setPickerCoords(null);
        setSearchAddressQuery('');
    };

    const handleNewClick = () => {
        clearForm();
        setEditingPoint(null);
        setIsFormOpen(true);
        
        // Define default center of picker to the first point of the list, or center of São Paulo
        if (points.length > 0 && points[0].lat && points[0].lng) {
            setPickerCoords({ lat: points[0].lat, lng: points[0].lng });
            setMapCenter({ lat: points[0].lat, lng: points[0].lng });
        } else {
            // Tenta obter a geolocalização do navegador
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        setPickerCoords(coords);
                        setMapCenter(coords);
                    },
                    () => {
                        setPickerCoords(defaultCenter);
                        setMapCenter(defaultCenter);
                    }
                );
            } else {
                setPickerCoords(defaultCenter);
                setMapCenter(defaultCenter);
            }
        }
    };

    const handleEditClick = (point: ReferencePoint) => {
        setEditingPoint(point);
        setName(point.name);
        setObservations(point.observations || '');
        setPickerCoords({ lat: point.lat, lng: point.lng });
        setMapCenter({ lat: point.lat, lng: point.lng });
        setIsFormOpen(true);
    };

    const handleDeleteClick = async (pointId: string, pointName: string) => {
        if (!confirm(`Tem certeza que deseja excluir o ponto de referência "${pointName}"?`)) {
            return;
        }

        const toastId = toast.loading("Excluindo ponto de referência...");
        const result = await deleteReferencePoint(pointId);
        if (result.success) {
            toast.success("Ponto de referência excluído com sucesso!", { id: toastId });
            fetchPoints();
            if (onSuccess) onSuccess();
        } else {
            toast.error("Erro ao excluir: " + result.error, { id: toastId });
        }
    };

    const handleMapClick = (lat: number, lng: number) => {
        setPickerCoords({ lat, lng });
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocalização não é suportada por este navegador.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setPickerCoords(coords);
                setMapCenter(coords);
                toast.success("Localização atual carregada!");
            },
            (error) => {
                toast.error("Erro ao obter localização: " + error.message);
            }
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("O nome é obrigatório.");
            return;
        }
        if (!pickerCoords) {
            toast.error("Selecione um local no mapa.");
            return;
        }

        setSaving(true);
        const toastId = toast.loading("Salvando ponto de referência...");

        if (editingPoint) {
            // Update
            const result = await updateReferencePoint(editingPoint.id, {
                name: name.trim(),
                observations: observations.trim(),
                lat: pickerCoords.lat,
                lng: pickerCoords.lng
            });

            if (result.success) {
                toast.success("Ponto de referência atualizado com sucesso!", { id: toastId });
                setIsFormOpen(false);
                setEditingPoint(null);
                clearForm();
                fetchPoints();
                if (onSuccess) onSuccess();
            } else {
                toast.error("Erro ao atualizar: " + result.error, { id: toastId });
            }
        } else {
            // Create
            const result = await createReferencePoint({
                name: name.trim(),
                observations: observations.trim(),
                lat: pickerCoords.lat,
                lng: pickerCoords.lng,
                cityId,
                congregationId
            });

            if (result.success) {
                toast.success("Ponto de referência criado com sucesso!", { id: toastId });
                setIsFormOpen(false);
                clearForm();
                fetchPoints();
                if (onSuccess) onSuccess();
            } else {
                toast.error("Erro ao criar: " + result.error, { id: toastId });
            }
        }
        setSaving(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-300 border border-transparent dark:border-slate-800 my-8">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
                        <div className="flex items-center gap-2">
                            {isFormOpen && (
                                <button 
                                    onClick={() => { setIsFormOpen(false); setEditingPoint(null); }}
                                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}
                            <Compass className="w-6 h-6 text-orange-500" />
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {isFormOpen 
                                        ? (editingPoint ? 'Editar Ponto de Referência' : 'Novo Ponto de Referência') 
                                        : 'Pontos de Referência'
                                    }
                                </h2>
                                <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-none mt-0.5">
                                    {cityName}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    {isFormOpen ? (
                        /* FORMULÁRIO DE CADASTRO/EDIÇÃO */
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Nome do Ponto de Referência</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 font-bold text-sm text-main focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ex: Mercado Compre Bem, Ponto de Ônibus..."
                                    required
                                    disabled={saving}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Observações / Detalhes (Opcional)</label>
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 font-bold text-sm text-main focus:ring-2 focus:ring-orange-500/20 focus:outline-none resize-none"
                                    rows={2}
                                    value={observations}
                                    onChange={e => setObservations(e.target.value)}
                                    placeholder="Ex: Próximo à esquina, faixas pintadas..."
                                    disabled={saving}
                                />
                            </div>

                            {/* Picker de Coordenadas */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-bold text-muted uppercase tracking-wider">Selecione o local no mapa</label>
                                    <button
                                        type="button"
                                        onClick={handleUseCurrentLocation}
                                        className="text-[10px] font-bold text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1 uppercase tracking-wider"
                                    >
                                        <Navigation className="w-3.5 h-3.5 fill-current" /> Minha Localização
                                    </button>
                                </div>

                                {/* Barra de Busca de Endereços */}
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 font-bold text-xs text-main focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
                                            placeholder="Buscar endereço..."
                                            value={searchAddressQuery}
                                            onChange={e => setSearchAddressQuery(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleSearchAddress();
                                                }
                                            }}
                                            disabled={searchingAddress}
                                        />
                                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSearchAddress}
                                        className="bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/40 border border-orange-100 dark:border-orange-900/30 px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 shrink-0"
                                        disabled={searchingAddress}
                                    >
                                        {searchingAddress ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            'Buscar'
                                        )}
                                    </button>
                                </div>

                                <div className="h-60 w-full rounded-lg overflow-hidden border border-gray-200 dark:border-slate-800 relative z-0">
                                    <MapView
                                        items={pickerCoords ? [{
                                            id: 'temp-picker',
                                            lat: pickerCoords.lat,
                                            lng: pickerCoords.lng,
                                            title: name || 'Novo Ponto',
                                            variant: 'numbered',
                                            index: 1,
                                            status: 'PENDENTE'
                                        }] : []}
                                        center={mapCenter}
                                        zoom={16}
                                        onMapClick={handleMapClick}
                                        disableGeocoding={true}
                                        disableInteractionLock={true}
                                        showLegend={false}
                                    />
                                </div>
                                {pickerCoords && (
                                    <p className="text-[10px] text-center text-gray-400">
                                        Lat: {pickerCoords.lat.toFixed(6)} | Lng: {pickerCoords.lng.toFixed(6)}
                                    </p>
                                )}
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setIsFormOpen(false); setEditingPoint(null); }}
                                    className="px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                    disabled={saving}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        'Salvar'
                                    )}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* LISTAGEM DOS PONTOS EXISTENTES */
                        <div className="space-y-4">
                            <div className="flex justify-end">
                            {canManage && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleNewClick}
                                        className="bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/40 border border-orange-100 dark:border-orange-900/30 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Novo Ponto de Referência
                                    </button>
                                </div>
                            )}
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                </div>
                            ) : points.length === 0 ? (
                                <div className="text-center py-10 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50/50 dark:bg-slate-900/50">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Nenhum ponto cadastrado neste mapa</p>
                                    <p className="text-[10px] text-gray-400 mt-1 max-w-[280px] mx-auto leading-normal">Eles servem para orientar os publicadores durante o testemunho sem interferir na centralização dos mapas.</p>
                                </div>
                            ) : (
                                <div className="max-h-80 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                                    {points.map(point => (
                                        <div 
                                            key={point.id}
                                            className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 border border-gray-100 dark:border-slate-800 flex items-start justify-between gap-3 group hover:border-orange-100 dark:hover:border-orange-950/30 hover:bg-white dark:hover:bg-slate-800 transition-all"
                                        >
                                            <div className="flex items-start gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/20 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{point.name}</h4>
                                                    {point.observations && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal mt-0.5 text-pretty line-clamp-2">{point.observations}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {canManage && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditClick(point)}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteClick(point.id, point.name)}
                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
