"use client";

import { useState, useEffect, Suspense } from 'react';
import { toast } from 'sonner';
import RoleBasedSwitcher from '@/app/components/RoleBasedSwitcher';
import {
    Plus,
    Link as LinkIcon,
    Map as MapIcon,
    Search,
    MapPin,
    ArrowRight,
    Loader2,
    Trash2,
    LogOut,
    Link2,
    X,
    List,
    MoreVertical,
    Pencil,
    CheckCircle,
    Navigation,
    MousePointer2,
    AlertCircle
} from 'lucide-react';
import MapView from '@/app/components/MapView';
import { geocodeAddress } from '@/lib/services/geocoding';
import { getCityStats } from '@/lib/services/stats';
import { getCities, createCity, updateCity, deleteCity } from '@/lib/services/cities';
import CongregationSelector from '@/app/components/CongregationSelector';
import BottomNav from '@/app/components/BottomNav';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    doc,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { getServiceYear, getServiceYearLabel, getServiceYearRange } from '@/lib/serviceYearUtils';
import CSVActionButtons from '@/app/components/CSVActionButtons';

interface City {
    id: string;
    name: string;
    uf: string;
    created_at?: string;
    congregation_id: string;
    lat?: number;
    lng?: number;
    parent_city?: string;
}

function CityListContent() {
    const searchParams = useSearchParams();
    const congregationId = searchParams.get('congregationId');
    const currentView = searchParams.get('view') || 'grid';
    const { user, isAdmin, isAdminRoleGlobal, isElder, isServant, loading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newCityName, setNewCityName] = useState('');
    const [newCityUF, setNewCityUF] = useState('SP');
    const [newCityLat, setNewCityLat] = useState('');
    const [newCityLng, setNewCityLng] = useState('');
    const [newParentCity, setNewParentCity] = useState('');
    const [localTermType, setLocalTermType] = useState<'city' | 'neighborhood'>('city');
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(true);
    const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Stats State - Hybrid: Unique for base coverage, Volume for efficiency > 100%
    const [coverageStats, setCoverageStats] = useState<Record<string, {
        total: number,
        completedUnique: number,
        completedVolume: number,
        statusBreakdown: { contacted: number, not_contacted: number, moved: number, do_not_visit: number, total_visits: number }
    }>>({});

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCity, setEditingCity] = useState<City | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [cityToDelete, setCityToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSearchAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery || searchQuery.length < 3) return;

        setIsSearching(true);
        try {
            const data = await geocodeAddress(searchQuery);
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                setTempCoords({ lat, lng });
                toast.success("Localização encontrada!");
            } else {
                toast.error("Endereço não encontrado.");
            }
        } catch (error) {
            console.error("Error searching address:", error);
            toast.error("Erro ao buscar endereço.");
        } finally {
            setIsSearching(false);
        }
    };

    const fetchCities = async () => {
        if (!congregationId) return;
        setLoading(true);
        try {
            const data = await getCities(congregationId);

            if (!data.success) {
                throw new Error(data.error || 'Erro ao buscar dados');
            }

            setCities(data.cities as City[] || []);
        } catch (error: any) {
            console.error("Error fetching cities:", error);
            setError(error?.message || "Erro desconhecido ao carregar cidades.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!congregationId) return;

        setLoading(true);
        const q = query(
            collection(db, 'cities'),
            where('congregationId', '==', congregationId),
            orderBy('name')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const citiesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as City[];
            setCities(citiesData);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching cities:", err);
            setError(err?.message || "Erro desconhecido ao carregar cidades.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [congregationId]);

    // Fetch Congregation Settings (TermType)
    useEffect(() => {
        if (!congregationId) return;

        const fetchSettings = async () => {
            try {
                const congRef = doc(db, 'congregations', congregationId);
                const congSnap = await getDoc(congRef);
                if (congSnap.exists()) {
                    setLocalTermType(congSnap.data().term_type || 'city');
                }
            } catch (err) {
                console.error("Error fetching congregation termType:", err);
            }
        };

        fetchSettings();
    }, [congregationId]);

    // Fetch Coverage Stats
    useEffect(() => {
        if (!congregationId) return;

        const fetchStats = async () => {
            try {
                const currentYear = getServiceYear();
                const { start, end } = getServiceYearRange(currentYear);
                const data = await getCityStats(congregationId, '', start, end);
                if (!data.success) throw new Error(data.error || 'Erro ao buscar estatísticas');

                const territories = data.territories || [];
                const history = data.history || [];
                const addresses = data.addresses || [];

                // Debug logs
                console.log('[DEBUG] Territories:', territories.length, territories);
                console.log('[DEBUG] History:', history.length, history);
                console.log('[DEBUG] Addresses:', addresses.length, addresses);

                const cityTotals: Record<string, number> = {};
                const territoryCityMap: Record<string, string> = {};

                territories.forEach((t: any) => {
                    console.log('[DEBUG] Processing territory:', t.id, t.name, 'city_id:', t.city_id, 'cityId:', t.cityId);
                    // Aceita ambos os padrões: city_id (legado) e cityId (novo)
                    const cityId = t.city_id || t.cityId;
                    if (cityId) {
                        cityTotals[cityId] = (cityTotals[cityId] || 0) + 1;
                        territoryCityMap[t.id] = cityId;
                    }
                });

                console.log('[DEBUG] City totals:', cityTotals);
                console.log('[DEBUG] Territory city map:', territoryCityMap);

                const completedUniqueByCity: Record<string, Set<string>> = {};
                const completedVolumeByCity: Record<string, number> = {};

                history.forEach((h: any) => {
                    // Aceita ambos os padrões: territory_id (legado) e territoryId (novo)
                    const territoryId = h.territory_id || h.territoryId;
                    if (territoryId) {
                        const cId = territoryCityMap[territoryId];
                        if (cId) {
                            if (!completedUniqueByCity[cId]) completedUniqueByCity[cId] = new Set();
                            completedUniqueByCity[cId].add(territoryId);
                            completedVolumeByCity[cId] = (completedVolumeByCity[cId] || 0) + 1;
                        }
                    } else if (h.items && h.items.length > 0) {
                        h.items.forEach((tId: string) => {
                            const cId = territoryCityMap[tId];
                            if (cId) {
                                if (!completedUniqueByCity[cId]) completedUniqueByCity[cId] = new Set();
                                completedUniqueByCity[cId].add(tId);
                                completedVolumeByCity[cId] = (completedVolumeByCity[cId] || 0) + 1;
                            }
                        });
                    }
                });

                const statusByCity: Record<string, { contacted: number, not_contacted: number, moved: number, do_not_visit: number, total_visits: number }> = {};

                addresses.forEach((a: any) => {
                    // Aceita ambos os padrões: city_id/territory_id (legado) e cityId/territoryId (novo)
                    const cityId = a.city_id || a.cityId;
                    const territoryId = a.territory_id || a.territoryId;
                    const cId = cityId || (territoryId ? territoryCityMap[territoryId] : null);
                    if (!cId) return;

                    if (!statusByCity[cId]) statusByCity[cId] = { contacted: 0, not_contacted: 0, moved: 0, do_not_visit: 0, total_visits: 0 };

                    statusByCity[cId].total_visits++;
                    // Aceita ambos os padrões para visit_status
                    const visitStatus = a.visit_status || a.visitStatus;
                    if (visitStatus === 'contacted') statusByCity[cId].contacted++;
                    else if (visitStatus === 'not_contacted') statusByCity[cId].not_contacted++;
                    else if (visitStatus === 'moved') statusByCity[cId].moved++;
                    else if (visitStatus === 'do_not_visit') statusByCity[cId].do_not_visit++;
                });

                const stats: Record<string, {
                    total: number,
                    completedUnique: number,
                    completedVolume: number,
                    statusBreakdown: { contacted: number, not_contacted: number, moved: number, do_not_visit: number, total_visits: number }
                }> = {};

                Object.keys(cityTotals).forEach(cityId => {
                    stats[cityId] = {
                        total: cityTotals[cityId],
                        completedUnique: completedUniqueByCity[cityId]?.size || 0,
                        completedVolume: completedVolumeByCity[cityId] || 0,
                        statusBreakdown: statusByCity[cityId] || { contacted: 0, not_contacted: 0, moved: 0, do_not_visit: 0, total_visits: 0 }
                    };
                });

                console.log('[DEBUG] Final stats:', stats);
                setCoverageStats(stats);
            } catch (error) {
                console.error("Error fetching coverage stats:", error);
            }
        };

        fetchStats();
    }, [congregationId]);


    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [openMenuId]);

    const handleCreateCity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCityName.trim() || !congregationId) return;

        try {
            const resData = await createCity({
                name: newCityName.trim(),
                uf: newCityUF,
                congregationId: congregationId,
                parent_city: localTermType === 'neighborhood' ? newParentCity.trim() : null,
                lat: newCityLat ? parseFloat(newCityLat) : null,
                lng: newCityLng ? parseFloat(newCityLng) : null
            });

            if (!resData.success) {
                throw new Error(resData.error || `Erro ao atualizar ${localTermType === 'neighborhood' ? 'bairro' : 'cidade'}`);
            }

            setNewCityName('');
            setNewCityUF('SP');
            setNewCityLat('');
            setNewCityLng('');
            setNewParentCity('');
            setIsCreateModalOpen(false);
            fetchCities(); // Adicionado para atualizar a lista
            toast.success(`${localTermType === 'neighborhood' ? 'Bairro' : 'Cidade'} criado(a) com sucesso!`);
        } catch (error) {
            console.error("Error creating city:", error);
            toast.error(`Erro ao criar ${localTermType === 'neighborhood' ? 'bairro' : 'cidade'}.`);
        }
    };

    const handleUpdateCity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCity || !editingCity.name.trim()) return;

        try {
            const resData = await updateCity(editingCity.id, {
                name: editingCity.name,
                uf: editingCity.uf,
                parent_city: editingCity.parent_city,
                lat: editingCity.lat ? parseFloat(editingCity.lat.toString()) : null,
                lng: editingCity.lng ? parseFloat(editingCity.lng.toString()) : null
            });
            if (!resData.success) {
                throw new Error(resData.error || `Erro ao atualizar ${localTermType === 'neighborhood' ? 'bairro' : 'cidade'}`);
            }

            toast.success(`${localTermType === 'neighborhood' ? 'Bairro' : 'Cidade'} atualizado(a) com sucesso!`);
            fetchCities();
            setIsEditModalOpen(false);
            setEditingCity(null);
        } catch (error: any) {
            console.error("Error updating city:", error);
            toast.error(`Erro ao atualizar ${localTermType === 'neighborhood' ? 'bairro' : 'cidade'}: ${error.message}`);
        }
    };

    const handleDeleteCity = (id: string, name: string) => {
        setCityToDelete({ id, name });
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteCity = async () => {
        if (!cityToDelete) return;
        setIsDeleting(true);
        try {
            const resData = await deleteCity(cityToDelete.id);
            if (!resData.success) {
                throw new Error(resData.error || 'Erro ao excluir');
            }
            toast.success(`${localTermType === 'neighborhood' ? 'Bairro' : 'Cidade'} excluído(a) com sucesso!`);
            fetchCities();
            setIsDeleteDialogOpen(false);
            setCityToDelete(null);
            setOpenMenuId(null);
        } catch (error) {
            console.error("Error deleting city:", error);
            toast.error(`Erro ao excluir ${localTermType === 'neighborhood' ? 'bairro' : 'cidade'}.`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await logout();
            window.location.href = '/login';
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = '/login';
        }
    };

    const filteredCities = cities.filter(city =>
        city.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    // Role Guard: Only Servants, Elders and Admins can see this page
    if (user && !isServant) {
        router.replace('/dashboard');
        return null;
    }

    if (!congregationId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-muted">
                Congregação não encontrada.
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen pb-24 font-sans text-main">
            {/* Header */}
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border flex justify-between items-center shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-none">
                <div className="flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-xl text-white shadow-primary-light/20 dark:shadow-primary-dark/20 shadow-md hidden sm:block">
                        <MapIcon className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                        <span className="font-bold text-lg text-main tracking-tight block leading-tight">
                            {localTermType === 'neighborhood' ? 'Bairros' : 'Cidades'}
                        </span>
                        <span className="text-[10px] text-muted font-bold uppercase tracking-widest hidden sm:inline-block">Territórios</span>
                    </div>
                </div>



                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSignOut}
                        className="p-2 text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        title="Sair"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>

                    {(isAdmin || isServant || isElder || isAdminRoleGlobal) && (
                        <>
                            <CSVActionButtons
                                congregationId={congregationId}
                                onImportSuccess={fetchCities}
                            />
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-gray-900 dark:bg-surface-highlight hover:bg-black dark:hover:bg-slate-800 text-white dark:text-main p-2 rounded-xl shadow-lg transition-all active:scale-95 border border-transparent dark:border-surface-border"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
            </header>


            {/* Main Content */}
            <div className="flex flex-col">
                {/* Top: City List */}
                <div className="flex-1 bg-surface">
                    {error && (
                        (() => {
                            const isBuilding = error?.includes('building');
                            return (
                                <div className={`mx-6 mt-6 ${isBuilding ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'} p-4 rounded-lg flex items-start gap-3 animate-in zoom-in-95`}>
                                    {isBuilding ? (
                                        <Loader2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5 animate-spin" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    )}
                                    <div>
                                        <h3 className={`font-bold ${isBuilding ? 'text-blue-800 dark:text-blue-400' : 'text-red-800 dark:text-red-400'} text-sm`}>
                                            {isBuilding ? 'Preparando Banco de Dados' : 'Erro de Dados'}
                                        </h3>
                                        <p className={`${isBuilding ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'} text-xs mt-1 break-all`}>
                                            {error?.includes('https://') ? (
                                                <>
                                                    {isBuilding
                                                        ? 'O Firebase está criando um índice necessário para esta consulta. Isso pode levar alguns minutos.'
                                                        : error.split('https://')[0]}
                                                    <a
                                                        href={`https://${error.split('https://')[1]}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`underline font-extrabold transition-colors block mt-2 p-2 rounded border ${isBuilding ? 'bg-blue-500/10 border-blue-500/20 hover:text-blue-800' : 'bg-red-500/10 border-red-500/20 hover:text-red-800'}`}
                                                    >
                                                        Ver progresso no Firebase Console
                                                    </a>
                                                </>
                                            ) : error}
                                        </p>
                                        {!isBuilding && (
                                            <p className="text-red-500 dark:text-red-400 text-[10px] mt-2 leading-relaxed">
                                                Isso pode ocorrer se o esquema do banco de dados estiver incompleto ou se uma consulta exigir um índice composto que ainda não foi criado no Firebase Console.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })()
                    )}

                    {/* Search */}
                    <div className="px-6 pt-6 pb-2 sticky top-0 bg-surface z-10 transition-colors">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5 group-focus-within:text-primary transition-colors" />



                            <input
                                type="text"
                                placeholder={localTermType === 'neighborhood' ? 'Buscar bairro...' : 'Buscar cidade...'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-surface border border-transparent dark:border-surface-border text-main text-sm font-medium rounded-lg py-4 pl-12 pr-4 shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:shadow-none dark:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-muted"
                            />
                        </div>

                        {/* Legend removed by simplified view */}
                    </div>

                    <main className="px-6 py-4">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : filteredCities.length === 0 ? (
                            <div className="text-center py-12 opacity-50">
                                <MapPin className="w-16 h-16 mx-auto mb-4 text-muted" />
                                <p className="text-muted font-medium">Nenhum(a) {localTermType === 'neighborhood' ? 'bairro' : 'cidade'} encontrado(a).</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                                {filteredCities.map((city) => {
                                    const stats = coverageStats[city.id];
                                    let coverageLabel = "0%";
                                    let coveragePercent = 0; // For bar width (visual modulus)
                                    let displayPercent = 0;  // For text label
                                    let isGreen = false;



                                    if (stats && stats.total > 0) {
                                        // Hybrid Logic:
                                        // 1. Calculate Unique Coverage Ratio
                                        const uniqueRatio = stats.completedUnique / stats.total;

                                        // 2. Base Calculation
                                        let finalRatio = 0;

                                        if (uniqueRatio < 1) {
                                            // Case A: Not all maps touched yet (< 100% Unique)
                                            // Use Unique Ratio strictly.
                                            finalRatio = uniqueRatio;
                                        } else {
                                            // Case B: All maps touched at least once (>= 100% Unique)
                                            // Use Volume Ratio to show > 100% efficiency.
                                            const volumeRatio = stats.completedVolume / stats.total;
                                            finalRatio = volumeRatio;
                                        }

                                        // 3. Formatting
                                        // Round down to simple integer (1%)
                                        const rawPercent = finalRatio * 100;
                                        displayPercent = Math.floor(rawPercent);
                                        coverageLabel = `${displayPercent}%`;



                                        // Bar Total Width Logic
                                        if (displayPercent >= 100) {
                                            isGreen = true;
                                            coveragePercent = 100; // Full bar
                                        } else {
                                            coveragePercent = displayPercent;
                                        }
                                    }

                                    return (
                                        <div
                                            key={city.id}
                                            className="group bg-background rounded-lg p-4 border border-surface-border shadow-sm hover:shadow-md hover:border-primary-light/50 dark:hover:border-primary-light/20 transition-all flex items-center gap-4"
                                        >

                                            <Link href={`/my-maps/territory?congregationId=${congregationId}&cityId=${city.id}`} prefetch={false} className="flex-1 flex items-center gap-4 min-w-0">
                                                <div className="w-10 h-10 bg-surface dark:bg-surface-highlight rounded-lg flex items-center justify-center text-muted shrink-0 shadow-sm border border-surface-border">
                                                    <MapIcon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div>
                                                            <h3 className="font-bold text-main text-base truncate leading-tight">{city.name}</h3>
                                                            {city.parent_city && (
                                                                <p className="text-[10px] text-muted font-black uppercase tracking-wider">{city.parent_city}</p>
                                                            )}
                                                        </div>
                                                        {(stats && stats.total > 0) && (
                                                            <span className={`md:hidden text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${isGreen ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-primary-light/50 text-primary dark:bg-primary-dark/30 dark:text-primary-light'}`}>
                                                                {coverageLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider">VER MAPAS</p>
                                                    </div>

                                                    {/* Mobile-only Progress Bar */}
                                                    <div className="md:hidden space-y-2">
                                                        <div className={`w-full ${displayPercent === 0 ? 'bg-gray-200 dark:bg-gray-700' : 'bg-emerald-50 dark:bg-emerald-900/10'} rounded-full h-1.5 overflow-hidden flex relative border border-transparent ${displayPercent === 0 ? 'dark:border-gray-600' : ''}`} title="Verde: Concluído | Cinza: Pendente">
                                                            <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${coveragePercent}%` }} />
                                                        </div>
                                                        <div className="flex justify-between items-center px-0.5">
                                                            <span className="text-[9px] text-muted">
                                                                {stats?.completedUnique || 0}/{stats?.total || 0} mapas
                                                            </span>
                                                            {stats?.completedVolume > stats?.completedUnique && (
                                                                <span className="text-[9px] text-green-600 font-bold">
                                                                    +{stats.completedVolume - stats.completedUnique}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>

                                            {/* Desktop-only Coverage Stats */}
                                            <div className="flex-1 flex flex-col justify-center gap-1.5 ml-4 mr-4 max-w-[200px] hidden md:flex">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Cobertura</span>
                                                    <span className={`text-[10px] font-bold ${displayPercent === 0 ? 'text-gray-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {coverageLabel}
                                                    </span>
                                                </div>
                                                <div className={`w-full ${displayPercent === 0 ? 'bg-gray-200 dark:bg-gray-700' : 'bg-emerald-50 dark:bg-emerald-900/10'} rounded-full h-1.5 overflow-hidden flex relative border border-transparent ${displayPercent === 0 ? 'dark:border-gray-600' : ''}`}>
                                                    <div className="h-full bg-emerald-500 transition-all duration-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${coveragePercent}%` }} />
                                                </div>
                                                <span className="text-[9px] text-muted text-right">
                                                    {stats?.completedUnique || 0}/{stats?.total || 0} mapas
                                                    {stats?.completedVolume > stats?.completedUnique && ` (+${stats.completedVolume - stats.completedUnique} repetições)`}
                                                </span>
                                            </div>



                                            <div className="flex items-center gap-2">
                                                {(isElder || isServant) && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setOpenMenuId(openMenuId === city.id ? null : city.id);
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary-light/50 rounded-lg transition-colors"
                                                        >
                                                            <MoreVertical className="w-5 h-5" />
                                                        </button>

                                                        {openMenuId === city.id && (
                                                            <>
                                                                <div
                                                                    className="fixed inset-0 z-10"
                                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                                                                />
                                                                <div className="absolute right-0 mt-2 w-32 bg-surface rounded-lg shadow-xl border border-surface-border z-20 py-1 animation-fade-in origin-top-right">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingCity(city);
                                                                            setIsEditModalOpen(true);
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-2 text-sm font-medium text-main hover:bg-background flex items-center gap-2"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" /> Editar
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteCity(city.id, city.name);
                                                                        }}
                                                                        className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                <Link href={`/my-maps/territory?congregationId=${congregationId}&cityId=${city.id}`} prefetch={false} className="p-2">
                                                    <ArrowRight className="w-4 h-4 text-gray-300" />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </main>
                </div>

                {/* Bottom: Map View */}
                <div className="w-full h-96 border-t border-surface-border relative z-0">
                    <MapView
                        items={filteredCities.map((c, idx) => ({
                            id: c.id,
                            lat: c.lat,
                            lng: c.lng,
                            title: c.name,
                            subtitle: `UF: ${c.uf}`,
                            status: 'LIVRE',
                            fullAddress: `${c.name}, ${c.uf}, Brasil`,
                            variant: 'city' as const
                        }))}
                        showLegend={false}
                    />
                </div>
            </div>



            {/* Confirmation Modal for Deletion */}
            <ConfirmationModal
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setCityToDelete(null);
                }}
                onConfirm={confirmDeleteCity}
                title={localTermType === 'neighborhood' ? 'Excluir Bairro' : 'Excluir Cidade'}
                message={`Tem certeza que deseja excluir ${cityToDelete?.name}? Todos os territórios e endereços vinculados serão afetados.`}
                confirmText="Excluir"
                variant="danger"
                isLoading={isDeleting}
            />

            {/* Bottom Nav */}
            <BottomNav />

            {/* Create City Modal (Admin/Elder/Servant) */}
            {
                isCreateModalOpen && (isElder || isServant) && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="mb-6">
                                <h1 className="text-xl font-bold text-main tracking-tight">
                                    {localTermType === 'neighborhood' ? 'Bairros' : 'Cidades'}
                                </h1>
                                <p className="text-xs text-muted font-medium">Mapas do território</p>
                            </div>

                            <form onSubmit={handleCreateCity} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">{localTermType === 'neighborhood' ? 'Nome do Bairro' : 'Nome da Cidade'}</label>
                                    <input
                                        required
                                        type="text"
                                        value={newCityName}
                                        onChange={(e) => setNewCityName(e.target.value)}
                                        className="w-full bg-background border border-surface-border rounded-lg py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-main placeholder-muted"
                                        placeholder={localTermType === 'neighborhood' ? 'Ex: Jardim Paulista' : 'Ex: São Paulo'}
                                        autoFocus
                                    />
                                </div>

                                {localTermType === 'neighborhood' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Cidade do Bairro</label>
                                        <input
                                            required
                                            type="text"
                                            value={newParentCity}
                                            onChange={(e) => setNewParentCity(e.target.value)}
                                            className="w-full bg-background border border-surface-border rounded-lg py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-main placeholder-muted"
                                            placeholder="Ex: São Paulo"
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">UF</label>
                                    <input
                                        type="text"
                                        value={newCityUF}
                                        onChange={e => setNewCityUF(e.target.value.toUpperCase())}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-gray-400"
                                        placeholder="UF"
                                        maxLength={2}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Localização</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsMapPickerOpen(true)}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg border font-bold transition-all ${newCityLat && newCityLng
                                            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                                            : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <MapIcon className="w-4 h-4" />
                                            <span>{newCityLat && newCityLng ? 'Localização Definida' : 'Selecionar no Mapa'}</span>
                                        </div>
                                        {newCityLat && newCityLng && <div className="text-[10px] opacity-70">{parseFloat(newCityLat).toFixed(4)}, {parseFloat(newCityLng).toFixed(4)}</div>}
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-colors mt-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    {localTermType === 'neighborhood' ? 'Novo Bairro' : 'Nova Cidade'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit City Modal */}
            {
                isEditModalOpen && editingCity && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {localTermType === 'neighborhood' ? 'Editar Bairro' : 'Editar Cidade'}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {localTermType === 'neighborhood' ? 'Atualize as informações do bairro.' : 'Atualize as informações da cidade.'}
                                </p>
                            </div>

                            <form onSubmit={handleUpdateCity} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {localTermType === 'neighborhood' ? 'Nome do Bairro' : 'Nome da Cidade'}
                                    </label>
                                    <input
                                        type="text"
                                        value={editingCity.name || ''}
                                        onChange={e => setEditingCity({ ...editingCity, name: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-gray-400"
                                        placeholder="Nome"
                                        required
                                        autoFocus
                                    />
                                </div>
                                {localTermType === 'neighborhood' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cidade do Bairro</label>
                                        <input
                                            type="text"
                                            value={editingCity.parent_city || ''}
                                            onChange={e => setEditingCity({ ...editingCity, parent_city: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-gray-400"
                                            placeholder="Cidade"
                                            required
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">UF</label>
                                    <input
                                        type="text"
                                        value={editingCity.uf || ''}
                                        onChange={e => setEditingCity({ ...editingCity, uf: e.target.value.toUpperCase() })}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-gray-400"
                                        placeholder="UF"
                                        maxLength={2}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Localização</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsMapPickerOpen(true)}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg border font-bold transition-all ${editingCity.lat && editingCity.lng
                                            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                                            : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <MapIcon className="w-4 h-4" />
                                            <span>{editingCity.lat && editingCity.lng ? 'Localização Definida' : 'Selecionar no Mapa'}</span>
                                        </div>
                                        {editingCity.lat && editingCity.lng && <div className="text-[10px] opacity-70">{parseFloat(editingCity.lat.toString()).toFixed(4)}, {parseFloat(editingCity.lng.toString()).toFixed(4)}</div>}
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-colors mt-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Salvar Alterações
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Map Picker Modal */}
            {isMapPickerOpen && (
                <div className="fixed inset-0 z-[1100] bg-black/80 flex flex-col animate-in fade-in duration-200">
                    <div className="bg-surface p-4 flex flex-col gap-4 shadow-lg relative z-10 shrink-0">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-main">Selecionar Localização</h2>
                                <p className="text-xs text-muted font-medium">Busque o endereço ou clique no mapa para marcar</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (tempCoords) {
                                            if (editingCity) {
                                                setEditingCity({ ...editingCity, lat: tempCoords.lat, lng: tempCoords.lng });
                                            } else {
                                                setNewCityLat(tempCoords.lat.toString());
                                                setNewCityLng(tempCoords.lng.toString());
                                            }
                                            setIsMapPickerOpen(false);
                                            setTempCoords(null);
                                            setSearchQuery('');
                                        }
                                    }}
                                    className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!tempCoords}
                                >
                                    Confirmar
                                </button>
                                <button
                                    onClick={() => {
                                        setIsMapPickerOpen(false);
                                        setSearchQuery('');
                                    }}
                                    className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={handleSearchAddress} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Digite o endereço para buscar..."
                                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSearching || searchQuery.length < 3}
                                className="bg-slate-800 dark:bg-slate-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-900 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapIcon className="w-4 h-4" />}
                                Buscar
                            </button>
                        </form>
                    </div>

                    <div className="flex-1 relative cursor-crosshair h-full">
                        <MapView
                            items={tempCoords ? [{
                                id: 'temp-marker',
                                lat: tempCoords.lat,
                                lng: tempCoords.lng,
                                title: 'Nova Localização',
                                status: 'PENDENTE'
                            }] : (editingCity?.lat && editingCity?.lng) ? [{
                                id: 'existing-marker',
                                lat: parseFloat(editingCity.lat.toString()),
                                lng: parseFloat(editingCity.lng.toString()),
                                title: 'Localização Atual',
                                status: 'LIVRE'
                            }] : []}
                            onMapClick={(lat, lng) => {
                                setTempCoords({ lat, lng });
                            }}
                            onMarkerDragEnd={(id, lat, lng) => {
                                setTempCoords({ lat, lng });
                            }}
                            center={
                                tempCoords
                                    ? { lat: tempCoords.lat, lng: tempCoords.lng }
                                    : (editingCity?.lat && editingCity?.lng)
                                        ? { lat: parseFloat(editingCity.lat.toString()), lng: parseFloat(editingCity.lng.toString()) }
                                        : (newCityLat && newCityLng)
                                            ? { lat: parseFloat(newCityLat), lng: parseFloat(newCityLng) }
                                            : undefined
                            }
                            zoom={tempCoords ? 18 : 15}
                            disableInteractionLock={true}
                        />
                        {/* Center Marker Help */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold pointer-events-none shadow-xl border border-white/10 z-10 whitespace-nowrap">
                            {tempCoords ? 'Arraste o marcador ou clique em Confirmar.' : 'Busque um endereço ou clique no mapa'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CityListPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <CityListContent />
        </Suspense>
    );
}
