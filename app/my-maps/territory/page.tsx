"use client";

import { useState, useEffect, Suspense, Fragment } from 'react';
import {
    Plus,
    Link as LinkIcon,
    Link2,
    X,
    Map as MapIcon,
    Search,
    MapPin,
    ArrowRight,
    Loader2,
    Trash2,
    LogOut,
    Building2,
    List,
    History,
    MoreVertical,
    User,
    Pencil,
    AlertCircle,
    Users,
    Navigation,
    Ear,
    Baby,
    GraduationCap,
    Brain
} from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

import RoleBasedSwitcher from '@/app/components/RoleBasedSwitcher';
import CSVActionButtons from '@/app/components/CSVActionButtons';
import { MapSkeleton } from '@/app/components/Skeleton';
const MapView = dynamic(() => import('@/app/components/MapView'), {
    loading: () => <MapSkeleton />,
    ssr: false
});
const BottomNav = dynamic(() => import('@/app/components/BottomNav'), { ssr: false });
import ConfirmationModal from '@/app/components/ConfirmationModal';
const TerritoryHistoryModal = dynamic(() => import('@/app/components/TerritoryHistoryModal'));
const TerritoryAssignmentsModal = dynamic(() => import('@/app/components/TerritoryAssignmentsModal'));
import AssignedUserBadge from '@/app/components/AssignedUserBadge';
import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    onSnapshot
} from "firebase/firestore";
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatRelativeDate } from '@/lib/dateUtils';
import { getServiceYearRange, getServiceYear } from '@/lib/serviceYearUtils';
import { getTerritories, createTerritory, updateTerritory, deleteTerritory } from '@/lib/services/territories';
import { getAddresses } from '@/lib/services/addresses';

interface Territory {
    id: string;
    name: string;
    notes?: string;
    city_id: string;
    congregation_id: string;
    created_at?: string;
    lat?: number;
    lng?: number;
    status?: 'LIVRE' | 'OCUPADO';
}

function TerritoryListContent() {
    const searchParams = useSearchParams();
    const congregationId = searchParams.get('congregationId');
    const cityId = searchParams.get('cityId');
    const { user, isAdmin, isAdminRoleGlobal, isElder, isServant, loading: authLoading } = useAuth();
    const router = useRouter();
    const [currentView, setCurrentView] = useState(searchParams.get('view') || 'grid');
    const [error, setError] = useState<string | null>(null);

    // State
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [localTermType, setLocalTermType] = useState<'city' | 'neighborhood'>('city');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cityName, setCityName] = useState('');

    // Create State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTerritoryName, setNewTerritoryName] = useState('');
    const [newTerritoryDesc, setNewTerritoryDesc] = useState('');
    const [newTerritoryLat, setNewTerritoryLat] = useState('');
    const [newTerritoryLng, setNewTerritoryLng] = useState('');

    // Edit State
    const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');

    // Delete State
    const [territoryToDelete, setTerritoryToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Multi-select state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareExpiration, setShareExpiration] = useState('24h');

    // Data State
    const [addressCounts, setAddressCounts] = useState<Record<string, number>>({});
    const [genderStats, setGenderStats] = useState<Record<string, { men: number, women: number, couples: number }>>({});
    const [territorySearchIndex, setTerritorySearchIndex] = useState<Record<string, string>>({});
    const [allAddresses, setAllAddresses] = useState<any[]>([]);

    // History & Assignments
    const [selectedTerritoryForHistory, setSelectedTerritoryForHistory] = useState<{ id: string, name: string } | null>(null);
    const [territoryAssignments, setTerritoryAssignments] = useState<Record<string, any[]>>({});
    const [sharingStatusMap, setSharingStatusMap] = useState<Record<string, boolean>>({});
    const [lastCompletionDates, setLastCompletionDates] = useState<Record<string, Date>>({});
    const [selectedTerritoryForAssignments, setSelectedTerritoryForAssignments] = useState<{ id: string, name: string, assignments: any[] } | null>(null);

    // UI
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [searchInItems, setSearchInItems] = useState(false);


    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenu(null);
        if (activeMenu) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [activeMenu]);

    // Fetch City Name
    useEffect(() => {
        if (!cityId) return;
        const fetchCity = async () => {
            const cityRef = doc(db, 'cities', cityId);
            const citySnap = await getDoc(cityRef);
            if (citySnap.exists()) {
                const data = citySnap.data();
                setCityName(data.name);
            }
        };
        fetchCity();
    }, [cityId]);

    // Fetch Congregation Settings
    useEffect(() => {
        if (!congregationId) return;
        const fetchSettings = async () => {
            const congRef = doc(db, 'congregations', congregationId);
            const congSnap = await getDoc(congRef);
            if (congSnap.exists()) {
                const data = congSnap.data();
                setLocalTermType((data.termType || data.term_type) as any || 'city');
            }
        };
        fetchSettings();
    }, [congregationId]);

    // Fetch Territories
    const fetchTerritories = async () => {
        if (!congregationId || !cityId) {
            setLoading(false);
            return;
        }
        try {
            const data = await getTerritories(congregationId, cityId);

            if (!data.success) {
                throw new Error(data.error || 'Erro ao buscar territórios');
            }

            // Client-side numeric sort for names like "1", "2", "10"
            const sorted = (data.territories || []).sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setTerritories(sorted as Territory[]);

            // Populate counts and stats immediately from service data (which already includes counts)
            const counts: Record<string, number> = {};
            const gStats: Record<string, { men: number, women: number, couples: number }> = {};

            sorted.forEach((t: any) => {
                counts[t.id] = t.addressCount || 0;
                gStats[t.id] = {
                    men: t.menCount || 0,
                    women: t.womenCount || 0,
                    couples: t.couplesCount || 0
                };
            });

            setAddressCounts(prev => ({ ...prev, ...counts }));
            setGenderStats(prev => ({ ...prev, ...gStats }));
        } catch (error: any) {
            console.error("Error fetching territories:", error);
            setError(error?.message || "Erro desconhecido ao carregar territórios.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTerritories();

        if (congregationId && cityId) {
            const territoriesRef = collection(db, 'territories');
            const q = query(territoriesRef, where('cityId', '==', cityId));

            const unsubscribe = onSnapshot(q, () => {
                fetchTerritories();
            });

            return () => unsubscribe();
        }
    }, [congregationId, cityId]);

    // Fetch Addresses (for counts and search)
    const fetchAddresses = async () => {
        if (!congregationId || !cityId) return;
        try {
            const resData = await getAddresses(congregationId, cityId);

            if (!resData.success) {
                throw new Error(resData.error || 'Erro ao buscar endereços');
            }

            const { addresses: dataFromService } = resData;
            const addressesToProcess = dataFromService || [];

            const counts: Record<string, number> = {};
            const gStats: Record<string, { men: number, women: number, couples: number }> = {};
            const searchIndex: Record<string, string> = {};

            addressesToProcess.forEach((addr: any) => {
                if (addr.territory_id && addr.is_active !== false) {
                    counts[addr.territory_id] = (counts[addr.territory_id] || 0) + 1;

                    const searchString = `${addr.street || ''} ${addr.resident_name || ''} ${addr.observations || ''}`.toLowerCase();
                    searchIndex[addr.territory_id] = (searchIndex[addr.territory_id] || '') + ' ' + searchString;

                    if (!gStats[addr.territory_id]) gStats[addr.territory_id] = { men: 0, women: 0, couples: 0 };

                    const g = addr.gender;
                    if (g === 'HOMEM') gStats[addr.territory_id].men++;
                    else if (g === 'MULHER') gStats[addr.territory_id].women++;
                    else if (g === 'CASAL') gStats[addr.territory_id].couples++;
                }
            });

            setAddressCounts(counts);
            setGenderStats(gStats);
            setTerritorySearchIndex(searchIndex);
            setAllAddresses(addressesToProcess);
        } catch (error) {
            console.error("Error fetching addresses:", error);
        }
    };

    useEffect(() => {
        // Fetch addresses if searchInItems is used OR if we are in table view
        if ((searchInItems && searchTerm) || currentView === 'table') {
            fetchAddresses();
        }
    }, [congregationId, cityId, searchInItems, searchTerm, currentView]);

    // Sincronizar currentView com os parâmetros da URL
    useEffect(() => {
        const viewFromUrl = searchParams.get('view') || 'grid';
        if (viewFromUrl !== currentView) {
            setCurrentView(viewFromUrl);
        }
    }, [searchParams]);

    // Fetch Shared Lists (Assignments)
    useEffect(() => {
        if (!congregationId) return;

        const fetchSharedLists = async () => {
            try {
                const listsRef = collection(db, 'shared_lists');
                const q = query(listsRef, where('congregationId', '==', congregationId));
                const querySnapshot = await getDocs(q);

                const assignmentsMap: Record<string, any[]> = {};
                const sharedMap: Record<string, boolean> = {};

                querySnapshot.docs.forEach((docSnap) => {
                    const list = docSnap.data();
                    const listId = docSnap.id;

                    if ((list.type === 'territory' || list.type === 'LIST_CARDS') && list.items && Array.isArray(list.items)) {
                        // Active
                        if (list.status !== 'completed' && list.status !== 'archived') {
                            list.items.forEach((tId: string) => {
                                sharedMap[tId] = true;
                                const assignedName = list.assignedName || list.assigned_name;
                                const assignedTo = list.assignedTo || list.assigned_to;
                                if (assignedName && assignedTo) {
                                    if (!assignmentsMap[tId]) assignmentsMap[tId] = [];
                                    assignmentsMap[tId].push({
                                        id: listId,
                                        listTitle: list.title,
                                        assignedName,
                                        assignedTo,
                                        assignedAt: list.assignedAt || list.assigned_at
                                    });
                                }
                            });
                        }
                    }
                });

                setTerritoryAssignments(assignmentsMap);
                setSharingStatusMap(sharedMap);
            } catch (error) {
                console.error("Error fetching shared lists:", error);
            }
        };

        fetchSharedLists();
    }, [congregationId]);


    const handleCreateTerritory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTerritoryName.trim() || !cityId || !congregationId) return;

        try {
            const resData = await createTerritory({
                name: newTerritoryName.trim(),
                description: newTerritoryDesc.trim(),
                cityId: cityId,
                congregationId: congregationId,
                // Adicionando lat/lng se necessário, mas o serviço atual prioriza campos padrão
            });

            if (!resData.success) {
                throw new Error(resData.error || 'Erro ao criar território');
            }

            setNewTerritoryName('');
            setNewTerritoryDesc('');
            setNewTerritoryLat('');
            setNewTerritoryLng('');
            setIsCreateModalOpen(false);
            fetchTerritories();
            toast.success("Território criado com sucesso!");
        } catch (error) {
            console.error("Error creating territory:", error);
            toast.error("Erro ao criar território.");
        }
    };

    const handleUpdateTerritory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTerritory || !editName.trim()) return;

        try {
            const resData = await updateTerritory(editingTerritory.id, {
                name: editName,
                notes: editDescription
            });

            if (!resData.success) {
                throw new Error(resData.error || 'Erro ao atualizar território');
            }

            toast.success("Território atualizado com sucesso!");
            fetchTerritories();
            setIsEditModalOpen(false);
            setEditingTerritory(null);
        } catch (error) {
            console.error("Error updating territory:", error);
            toast.error("Erro ao atualizar território.");
        }
    };

    const handleDeleteTerritory = (id: string, name: string) => {
        setTerritoryToDelete({ id, name });
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteTerritory = async () => {
        if (!territoryToDelete) return;
        const { id } = territoryToDelete;
        setIsDeleteDialogOpen(false);
        setLoading(true);
        try {
            const resData = await deleteTerritory(id);
            if (!resData.success) {
                throw new Error(resData.error || 'Erro ao excluir território');
            } else {
                toast.success("Território e endereços vinculados excluídos!");
            }

            fetchTerritories();
            fetchAddresses();
        } catch (error: any) {
            console.error("Error deleting territory:", error);
            toast.error("Erro ao excluir: " + error.message);
        } finally {
            setLoading(false);
            setTerritoryToDelete(null);
        }
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
        setIsSelectionMode(newSelected.size > 0);
    };

    // Simplified sharing: navigates to the setup page with selected IDs
    const handleConfirmShare = async () => {
        if (selectedIds.size === 0) return;

        const ids = Array.from(selectedIds).join(',');
        const currentUrl = window.location.pathname + window.location.search;
        router.push(`/share-setup?ids=${ids}&returnUrl=${encodeURIComponent(currentUrl)}`);
    };

    const filteredTerritories = territories.filter(t => {
        const matchesName = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.notes?.toLowerCase().includes(searchTerm.toLowerCase());

        if (searchInItems && searchTerm) {
            const searchStr = territorySearchIndex[t.id] || '';
            const inAddresses = searchStr.includes(searchTerm.toLowerCase());
            return matchesName || inAddresses;
        }

        return matchesName;
    });

    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>;

    // Role Guard: Only Servants, Elders and Admins can see this page
    if (user && !isServant) {
        router.replace('/dashboard');
        return null;
    }

    if (!congregationId || !cityId) {
        return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-muted">Informações incompletas.</div>;
    }

    // View state

    return (
        <div className="bg-background min-h-screen pb-24 font-sans text-main transition-colors duration-300">
            {/* ... Header ... */}
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border flex justify-between items-center shadow-sm dark:shadow-none transition-colors">
                <div className="flex items-center gap-3">
                    <Link href={`/my-maps/city?congregationId=${congregationId}`} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title={`Voltar para ${localTermType === 'neighborhood' ? 'Bairros' : 'Cidades'}`}>
                        <ArrowRight className="w-5 h-5 rotate-180" />
                    </Link>
                    <div className="flex flex-col">
                        <span className="font-bold text-lg text-main tracking-tight leading-none">{cityName}</span>
                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider">{localTermType === 'neighborhood' ? 'Bairro' : 'Cidade'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <RoleBasedSwitcher />
                    {(isElder || isServant || isAdmin || isAdminRoleGlobal) && (
                        <>
                            <CSVActionButtons
                                congregationId={congregationId}
                                cityId={cityId}
                                onImportSuccess={fetchTerritories}
                            />
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-gray-900 border-gray-900 border hover:bg-black dark:bg-surface-highlight dark:hover:bg-slate-800 text-white dark:text-main dark:border-surface-border p-2 rounded-lg shadow-lg transition-all active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
            </header>


            <div className="px-6 pt-6 space-y-4">
                {error && (
                    <div className={`border p-4 rounded-lg flex items-start gap-3 animate-in zoom-in-95 ${error.includes('building') ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                        {error.includes('building') ? (
                            <Loader2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5 animate-spin" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                            <h3 className={`font-bold text-sm ${error.includes('building') ? 'text-blue-800 dark:text-blue-400' : 'text-red-800 dark:text-red-400'}`}>
                                {error.includes('building') ? 'Preparando Banco de Dados' : 'Erro de Dados'}
                            </h3>
                            <p className={`text-xs mt-1 break-all ${error.includes('building') ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                                {error?.includes('https://') ? (
                                    <>
                                        {error.includes('building') ? 'O Firebase está criando um índice necessário para esta consulta. Isso pode levar alguns minutos.' : error.split('https://')[0]}
                                        <a
                                            href={`https://${error.split('https://')[1]}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`underline font-extrabold transition-colors block mt-2 p-2 rounded border ${error.includes('building') ? 'bg-blue-500/10 border-blue-500/20 hover:text-blue-800' : 'bg-red-500/10 border-red-500/20 hover:text-red-800'}`}
                                        >
                                            {error.includes('building') ? 'Ver progresso no Firebase Console' : 'Clique aqui para criar o índice no Firebase Console'}
                                        </a>
                                    </>
                                ) : error}
                            </p>
                            {!error.includes('building') && (
                                <p className="text-red-500 dark:text-red-400 text-[10px] mt-2 leading-relaxed">
                                    Isso pode ocorrer se o esquema do banco de dados estiver incompleto ou se uma consulta exigir um índice composto que ainda não foi criado no Firebase Console.
                                </p>
                            )}
                        </div>
                    </div>
                )}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar território..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface border border-transparent dark:border-surface-border text-main text-sm font-medium rounded-lg py-4 pl-12 pr-36 shadow-sm dark:shadow-none focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-muted"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={searchInItems}
                                onChange={(e) => setSearchInItems(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-primary hover:text-primary-dark transition-colors"
                            />
                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 select-none hover:text-primary transition-colors">Buscar itens</span>
                        </label>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : filteredTerritories.length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                        <MapIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-400 font-medium">Nenhum território encontrado</p>
                    </div>
                ) : currentView === 'table' ? (
                    <div className="w-full overflow-x-auto pb-4 flex justify-start lg:justify-center">
                        <div className="bg-surface rounded-lg border border-surface-border shadow-sm inline-block min-w-full sm:min-w-0">
                            <table className="w-auto min-w-full sm:min-w-0 text-left text-sm">
                                <thead className="bg-surface-highlight border-b border-surface-border text-muted uppercase tracking-wider text-[10px] font-bold">
                                    <tr>
                                        <th className="px-6 py-4 w-[100px] text-left">Opções</th>
                                        <th className="px-6 py-4 text-left">Nome</th>
                                        <th className="px-6 py-4 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-border">
                                    {filteredTerritories.map(t => {
                                        const assignments = territoryAssignments[t.id] || [];
                                        const territoryAddresses = allAddresses.filter(a => (a.territory_id === t.id) || (a.territoryId === t.id));
                                        return (
                                            <Fragment key={t.id}>
                                                <tr className="hover:bg-surface-highlight/50 transition-colors group bg-surface">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-start gap-2">
                                                            {(isAdmin || isServant) && (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedIds.has(t.id)}
                                                                    onChange={() => toggleSelection(t.id)}
                                                                    className="w-5 h-5 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-primary focus:ring-primary transition-all cursor-pointer"
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-surface dark:bg-surface-highlight rounded-lg flex items-center justify-center text-muted shrink-0 shadow-sm border border-surface-border">
                                                                <MapIcon className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex flex-col items-start min-w-0">
                                                                <div className="font-bold text-main text-lg">{t.name}</div>
                                                                <div className="text-xs text-muted font-medium">
                                                                    {territoryAddresses.length > 0 ? (
                                                                        <span className="flex items-center gap-1">
                                                                            <MapPin className="w-3 h-3" />
                                                                            {territoryAddresses.length} endereço{territoryAddresses.length !== 1 ? 's' : ''}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-muted/50">Sem endereços</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div onClick={e => e.stopPropagation()}>
                                                            {t.status === 'OCUPADO' || assignments.length > 0 ? (
                                                                <button onClick={() => assignments.length > 0 && setSelectedTerritoryForAssignments({ id: t.id, name: t.name, assignments })} className="flex flex-col items-end">
                                                                    <div className="text-[10px] font-bold text-primary-600 bg-primary-50 border border-primary-100 dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-400 px-2 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors flex items-center gap-1">
                                                                        {assignments.length > 0 ? (
                                                                            <>
                                                                                <AssignedUserBadge userId={assignments[0].assignedTo} fallbackName={assignments[0].assignedName} />
                                                                                {assignments.length > 1 && <span className="ml-0.5 bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200 px-1 rounded-full text-[9px]">+{assignments.length - 1}</span>}
                                                                            </>
                                                                        ) : (
                                                                            <span>Ocupado</span>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400 px-2 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap">Livre</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {territoryAddresses.length > 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="p-0 border-b border-surface-border/50">
                                                            <div className="w-full">
                                                                <table className="w-full text-xs bg-surface border-x border-b border-surface-border/50 shadow-sm first:border-t-0">
                                                                    <tbody className="divide-y divide-surface-border/50">
                                                                        {territoryAddresses.map(addr => (
                                                                            <tr key={addr.id} className="hover:bg-surface-highlight/30 transition-colors group/addr">
                                                                                <td className="px-6 py-3 w-[50px]">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={selectedIds.has(addr.id)}
                                                                                        onChange={() => toggleSelection(addr.id)}
                                                                                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-primary focus:ring-primary transition-all cursor-pointer"
                                                                                    />
                                                                                </td>
                                                                                <td className="px-6 py-3 relative">
                                                                                    <div className="flex items-center justify-between gap-4">
                                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                                            {/* Gender Mode - igual à tela de endereços */}
                                                                                            {addr.gender && (addr.gender === 'male' || addr.gender === 'HOMEM' || addr.gender === 'female' || addr.gender === 'MULHER' || addr.gender === 'CASAL') ? (
                                                                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-sm border transition-colors ${
                                                                                                    addr.gender === 'HOMEM' || addr.gender === 'male' ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                                                                                    addr.gender === 'MULHER' || addr.gender === 'female' ? 'bg-pink-100 text-pink-600 border-pink-200' :
                                                                                                    addr.gender === 'CASAL' ? 'bg-purple-100 text-purple-600 border-purple-200' :
                                                                                                    'bg-gray-100 text-gray-600 border-gray-200'
                                                                                                }`}>
                                                                                                    {addr.gender === 'CASAL' ? (
                                                                                                        <div className="flex -space-x-1.5">
                                                                                                            <User className="w-3 h-3 fill-current" />
                                                                                                            <User className="w-3 h-3 fill-current" />
                                                                                                        </div>
                                    ) : (
                                        <User className="w-4 h-4 fill-current" />
                                    )}
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="w-6 h-6 bg-surface-highlight rounded flex items-center justify-center shrink-0">
                                                                                                    <MapPin className="w-3 h-3 text-muted" />
                                                                                                </div>
                                                                                            )}
                                                                                            <div className="min-w-0">
                                                                                                <div className="font-medium text-main truncate" title={addr.street}>
                                                                                                    {addr.street}
                                                                                                </div>
                                                                                                {addr.number && <div className="text-muted text-xs">Nº {addr.number}</div>}
                                                                                                {addr.complement && <div className="text-muted text-xs">{addr.complement}</div>}
                                                                                                {addr.neighborhood && <div className="text-muted text-xs">{addr.neighborhood}</div>}
                                                                                                
                                                                                                {/* Tags/Labels alinhadas com o endereço - igual à tela de endereços */}
                                                                                                <div className="flex gap-1 flex-wrap pt-1">
                                                                                                    {addr.isDeaf && (
                                                                                                        <span className="text-[8px] bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium flex items-center gap-1" title="Surdo">
                                                                                                            <Ear className="w-3 h-3" />
                                                                                                            Surdo
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {addr.isMinor && (
                                                                                                        <span className="text-[8px] bg-primary-light/50 text-primary-dark px-2 py-1 rounded-full font-medium flex items-center gap-1" title="Menor de idade">
                                                                                                            <Baby className="w-3 h-3" />
                                                                                                            Menor
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {addr.isStudent && (
                                                                                                        <span className="text-[8px] bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium flex items-center gap-1" title="Estudante">
                                                                                                            <GraduationCap className="w-3 h-3" />
                                                                                                            Estudante
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {addr.isNeurodivergent && (
                                                                                                        <span className="text-[8px] bg-teal-100 text-teal-800 px-2 py-1 rounded-full font-medium flex items-center gap-1" title="Neurodivergente">
                                                                                                            <Brain className="w-3 h-3" />
                                                                                                            Neurodivergente
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {/* Contador de residentes movido para aqui */}
                                                                                                    <span className="text-[10px] bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded-full font-bold">
                                                                                                        {addr.residentsCount || 1} residente{addr.residentsCount !== 1 ? 's' : ''}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                                            {/* Ícones de ação - Menu completo */}
                                                                                            <div className="flex items-center gap-1">
                                                                                                {(isElder || isServant) ? (
                                                                                                    <>
                                                                                                        <button
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                setActiveMenu(activeMenu === `addr-${addr.id}` ? null : `addr-${addr.id}`);
                                                                                                            }}
                                                                                                            className={`p-1.5 rounded transition-colors ${activeMenu === `addr-${addr.id}` ? 'bg-primary-light/50 dark:bg-primary-dark/30 text-primary-dark dark:text-primary-light' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                                                                                        >
                                                                                                            <MoreVertical className="w-3 h-3" />
                                                                                                        </button>
                                                                                                        {activeMenu === `addr-${addr.id}` && (
                                                                                                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-surface-border dark:border-slate-700 p-1 z-[9999] min-w-[140px] animate-in fade-in zoom-in-95 duration-200" style={{ minWidth: '140px' }}>
                                                                                                                {addr.googleMapsLink && (
                                                                                                                    <a
                                                                                                                        href={addr.googleMapsLink}
                                                                                                                        target="_blank"
                                                                                                                        rel="noopener noreferrer"
                                                                                                                        onClick={() => setActiveMenu(null)}
                                                                                                                        className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors w-full text-left"
                                                                                                                    >
                                                                                                                        <MapIcon className="w-3 h-3" />
                                                                                                                        Google Maps
                                                                                                                    </a>
                                                                                                                )}
                                                                                                                {addr.wazeLink && (
                                                                                                                    <a
                                                                                                                        href={addr.wazeLink}
                                                                                                                        target="_blank"
                                                                                                                        rel="noopener noreferrer"
                                                                                                                        onClick={() => setActiveMenu(null)}
                                                                                                                        className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors w-full text-left"
                                                                                                                    >
                                                                                                                        <Navigation className="w-3 h-3" />
                                                                                                                        Waze
                                                                                                                    </a>
                                                                                                                )}
                                                                                                                <button
                                                                                                                    onClick={() => {
                                                                                                                        setActiveMenu(null);
                                                                                                                        // Abrir histórico do endereço (implementar se necessário)
                                                                                                                        toast.info("Histórico do endereço em desenvolvimento");
                                                                                                                    }}
                                                                                                                    className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors w-full text-left"
                                                                                                                >
                                                                                                                    <History className="w-3 h-3" />
                                                                                                                    Histórico
                                                                                                                </button>
                                                                                                                {isServant && (
                                                                                                                    <a
                                                                                                                        href={`/my-maps/address?congregationId=${congregationId}&cityId=${cityId}&territoryId=${t.id}&edit=${addr.id}`}
                                                                                                                        onClick={() => setActiveMenu(null)}
                                                                                                                        className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors w-full text-left"
                                                                                                                    >
                                                                                                                        <Pencil className="w-3 h-3" />
                                                                                                                        Editar
                                                                                                                    </a>
                                                                                                                )}
                                                                                                                {(isElder || isServant) && (
                                                                                                                    <button
                                                                                                                        onClick={() => {
                                                                                                                            setActiveMenu(null);
                                                                                                                            // Implementar exclusão/inativação do endereço
                                                                                                                            toast.info("Exclusão de endereço em desenvolvimento");
                                                                                                                        }}
                                                                                                                        className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"
                                                                                                                    >
                                                                                                                        <Trash2 className="w-3 h-3" />
                                                                                                                        Excluir
                                                                                                                    </button>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </>
                                                                                                ) : (
                                                                                                    // Para publicadores, apenas ícones simples
                                                                                                    <>
                                                                                                        {addr.googleMapsLink && (
                                                                                                            <a
                                                                                                                href={addr.googleMapsLink}
                                                                                                                target="_blank"
                                                                                                                rel="noopener noreferrer"
                                                                                                                className="p-1.5 bg-surface rounded hover:bg-surface-highlight transition-colors"
                                                                                                                title="Google Maps"
                                                                                                            >
                                                                                                                <MapIcon className="w-3 h-3" />
                                                                                                            </a>
                                                                                                        )}
                                                                                                        {addr.wazeLink && (
                                                                                                            <a
                                                                                                                href={addr.wazeLink}
                                                                                                                target="_blank"
                                                                                                                rel="noopener noreferrer"
                                                                                                                className="p-1.5 bg-surface rounded hover:bg-surface-highlight transition-colors"
                                                                                                                title="Waze"
                                                                                                            >
                                                                                                                <Navigation className="w-3 h-3" />
                                                                                                            </a>
                                                                                                        )}
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {filteredTerritories.map(t => {
                            const isSelected = selectedIds.has(t.id);
                            const assignments = territoryAssignments[t.id] || [];
                            const hasSharing = sharingStatusMap[t.id];
                            // const historyDate = lastCompletionDates[t.id];
                            // const isOutdated = historyDate && historyDate < getServiceYearRange(getServiceYear()).start;

                            return (
                                <div
                                    key={t.id}
                                    className={`group bg-surface rounded-lg p-3 border border-surface-border shadow-sm hover:shadow-md transition-all relative ${isSelected ? 'ring-2 ring-primary bg-primary-light/10' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        {(isAdmin || isServant) && (
                                            <div onClick={(e) => e.stopPropagation()} className="pt-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelection(t.id)}
                                                    className="w-5 h-5 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-primary focus:ring-primary transition-all cursor-pointer"
                                                />
                                            </div>
                                        )}

                                        <Link
                                            href={`/my-maps/address?congregationId=${congregationId}&cityId=${cityId}&territoryId=${t.id}`}
                                            className="flex-1 min-w-0 flex flex-col gap-1.5 pb-1"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${t.status === 'OCUPADO' ? 'bg-primary-light/50 dark:bg-primary-dark/20 text-primary dark:text-primary-light' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                                                    <MapIcon className="w-4.5 h-4.5" />
                                                </div>
                                                <div className="min-w-0 flex-1 pt-0.5">
                                                    <h3 className="font-bold text-main text-base leading-tight truncate pr-1">{t.name}</h3>
                                                    <p className="text-xs text-muted font-medium line-clamp-2 mt-0.5 leading-snug">{t.notes || 'Sem descrição'}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 pl-0.5">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${!addressCounts[t.id] ? 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400' : 'text-primary bg-primary-light/50 dark:bg-primary-dark/30 dark:text-primary-light'}`}>
                                                    {addressCounts[t.id] || 0} Ativos
                                                </span>

                                                {genderStats[t.id] && (genderStats[t.id].men > 0 || genderStats[t.id].women > 0 || genderStats[t.id].couples > 0) && (
                                                    <div className="flex items-center gap-2 px-1.5 border-l border-gray-200 dark:border-gray-700">
                                                        {genderStats[t.id].men > 0 && (
                                                            <div className="flex items-center gap-0.5 text-blue-500" title="Homens">
                                                                <User className="w-3.5 h-3.5 fill-current" />
                                                                <span className="text-[10px] font-black">{genderStats[t.id].men}</span>
                                                            </div>
                                                        )}
                                                        {genderStats[t.id].women > 0 && (
                                                            <div className="flex items-center gap-0.5 text-pink-500" title="Mulheres">
                                                                <User className="w-3.5 h-3.5 fill-current" />
                                                                <span className="text-[10px] font-black">{genderStats[t.id].women}</span>
                                                            </div>
                                                        )}
                                                        {genderStats[t.id].couples > 0 && (
                                                            <div className="flex items-center gap-0.5 text-purple-600" title="Casais">
                                                                <Users className="w-3.5 h-3.5 fill-current" />
                                                                <span className="text-[10px] font-black">{genderStats[t.id].couples}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                            </div>
                                        </Link>

                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            {(isElder || isServant) && (
                                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={() => setActiveMenu(activeMenu === t.id ? null : t.id)} className={`p-1.5 rounded-lg transition-colors ${activeMenu === t.id ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/50' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                                        <MoreVertical className="w-4.5 h-4.5" />
                                                    </button>
                                                    {activeMenu === t.id && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-xl border border-surface-border z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                                                            <Link href={`/my-maps/address?congregationId=${congregationId}&cityId=${cityId}&territoryId=${t.id}`} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors w-full text-left">
                                                                <ArrowRight className="w-4 h-4" /> Abrir
                                                            </Link>
                                                            <button onClick={() => { setSelectedTerritoryForHistory({ id: t.id, name: t.name }); setActiveMenu(null); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors w-full text-left">
                                                                <History className="w-4 h-4" /> Histórico
                                                            </button>
                                                            {(isAdmin || isServant) && (
                                                                <button onClick={() => {
                                                                    setEditingTerritory(t);
                                                                    setEditName(t.name);
                                                                    setEditDescription(t.notes || '');
                                                                    setIsEditModalOpen(true);
                                                                    setActiveMenu(null);
                                                                }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors w-full text-left">
                                                                    <List className="w-4 h-4" /> Editar
                                                                </button>
                                                            )}
                                                            {(isElder || isServant) && (
                                                                <>
                                                                    <div className="h-px bg-gray-100 dark:bg-gray-800 mx-2 my-1" />
                                                                    <button onClick={() => { handleDeleteTerritory(t.id, t.name); setActiveMenu(null); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left">
                                                                        <Trash2 className="w-4 h-4" /> Excluir
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div onClick={e => e.stopPropagation()}>
                                                {t.status === 'OCUPADO' || assignments.length > 0 ? (
                                                    <button onClick={() => assignments.length > 0 && setSelectedTerritoryForAssignments({ id: t.id, name: t.name, assignments })} className="flex flex-col items-end">
                                                        <div className="text-[10px] font-bold text-primary-600 bg-primary-50 border border-primary-100 dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-400 px-2 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors flex items-center gap-1">
                                                            {assignments.length > 0 ? (
                                                                <>
                                                                    <AssignedUserBadge userId={assignments[0].assignedTo} fallbackName={assignments[0].assignedName} />
                                                                    {assignments.length > 1 && <span className="ml-0.5 bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200 px-1 rounded-full text-[9px]">+{assignments.length - 1}</span>}
                                                                </>
                                                            ) : (
                                                                <span>Ocupado</span>
                                                            )}
                                                        </div>
                                                    </button>
                                                ) : hasSharing ? (
                                                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400 px-2 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap">Compartilhado</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-100 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400 px-2 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap">Livre</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Floating Action Bar (Admin/Leaders) - for sharing multiple maps selection */}
                {(isAdmin || isServant) && selectedIds.size > 0 && (
                    <div className="fixed bottom-24 left-6 right-6 z-40 bg-gray-900 text-white rounded-lg p-4 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-3">
                            <span className="bg-primary px-3 py-1 rounded-lg text-xs font-bold">{selectedIds.size}</span>
                            <span className="text-sm">selecionados</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleConfirmShare} // Call handler directly for now
                                className="bg-white text-gray-900 px-4 py-2 rounded-lg text-xs font-bold flex gap-2 active:scale-95 transition-transform"
                            >
                                <LinkIcon className="w-4 h-4" /> LINK
                            </button>
                        </div>
                    </div>
                )}


            </div>

            {/* Create Modal */}
            {
                isCreateModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-300 border border-transparent dark:border-slate-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <Plus className="w-6 h-6 text-primary" />
                                Novo Território
                            </h2>
                            <form onSubmit={handleCreateTerritory} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Número do Mapa</label>
                                    <input
                                        type="text"
                                        value={newTerritoryName}
                                        onChange={(e) => setNewTerritoryName(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 font-bold text-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-gray-400"
                                        placeholder="Ex: 01"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Descrição</label>
                                    <textarea
                                        rows={3}
                                        value={newTerritoryDesc}
                                        onChange={(e) => setNewTerritoryDesc(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none resize-none placeholder:text-gray-400"
                                        placeholder="Ex: Centro, perto da praça..."
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                                    <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 hover:bg-primary-dark transition-colors">Criar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit Modal */}
            {
                isEditModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-300 border border-transparent dark:border-slate-800">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                <List className="w-6 h-6 text-primary" />
                                Editar Território
                            </h2>
                            <form onSubmit={handleUpdateTerritory} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Número do Mapa</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 font-bold text-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-gray-400"
                                        placeholder="Ex: 01"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Descrição</label>
                                    <textarea
                                        rows={3}
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none resize-none placeholder:text-gray-400"
                                        placeholder="Ex: Centro, perto da praça..."
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                                    <button type="submit" className="flex-1 py-3 bg-primary text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 hover:bg-primary-dark transition-colors">Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Custom Delete Confirmation Modal */}
            {isDeleteDialogOpen && territoryToDelete && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-main tracking-tight">Excluir Território {territoryToDelete.name}</h3>
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700 dark:text-red-400 font-medium leading-relaxed">
                                    <span className="font-bold">Atenção:</span> A exclusão do território apagará definitivamente também todos os endereços vinculados a ele.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setIsDeleteDialogOpen(false)}
                                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold py-3.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDeleteTerritory}
                                className="flex-1 font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-95 text-sm text-white bg-red-500 hover:bg-red-600 shadow-red-500/20"
                            >
                                Excluir Definitivamente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedTerritoryForHistory && (
                <TerritoryHistoryModal
                    territoryId={selectedTerritoryForHistory.id}
                    territoryName={selectedTerritoryForHistory.name}
                    congregationId={congregationId}
                    onClose={() => setSelectedTerritoryForHistory(null)}
                />
            )}

            <BottomNav />

        </div>
    );
}

export default function TerritoryListPage() {
    return <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}><TerritoryListContent /></Suspense>;
}
