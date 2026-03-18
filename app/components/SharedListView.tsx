"use client";

import { useEffect, useState, Suspense } from 'react';
// Supabase removido — operações agora passam pelos serviços de cliente
import { getSharedListWithData, processSharedListAction } from '@/lib/services/shared_lists';
import { reportVisit, deleteVisitByAddressAndShare } from '@/lib/services/visits';
import {
    Map as MapIcon,
    Loader2,
    MapPin,
    Building2,
    ChevronRight,
    Share2,
    CheckCircle2,
    ThumbsUp,
    ThumbsDown,
    Minus,
    User,
    Users,
    Ear,
    Baby,
    GraduationCap,
    FileText,
    ClipboardList,
    CheckCircle,
    Navigation,
    MoreVertical,
    History as HistoryIcon,
    Brain,
    Calendar,
    ChevronUp,
    ChevronDown,
    Hand,
    Home
} from 'lucide-react';
import VisitReportModal from '@/app/components/VisitReportModal';
import VisitHistoryModal from '@/app/components/VisitHistoryModal';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import BottomNav from '@/app/components/BottomNav';

interface SharedList {
    type: 'address' | 'city' | 'territory';
    items: string[];
    context?: any;
    congregationId?: string;
    cityId?: string;
    territoryId?: string;
    createdAt?: any;
    assignedTo?: string;
    assignedName?: string;
    status?: string;
    expiresAt?: any;
}

interface SharedListViewProps {
    id?: string;
}

export default function SharedListView({ id: propId }: SharedListViewProps) {
    const searchParams = useSearchParams();
    const id = propId || searchParams.get('id');
    const { user, profileName } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [returning, setReturning] = useState(false);
    const [error, setError] = useState('');
    const [listData, setListData] = useState<SharedList | null>(null);
    const [items, setItems] = useState<any[]>([]);
    const [isResponsibilityModalOpen, setIsResponsibilityModalOpen] = useState(false);
    const [accepting, setAccepting] = useState(false);

    // Modals State
    const [visitingItem, setVisitingItem] = useState<any | null>(null);
    const [viewingHistoryItem, setViewingHistoryItem] = useState<any | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'info';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Stats
    const [addressCounts, setAddressCounts] = useState<Record<string, number>>({});
    const [processedCounts, setProcessedCounts] = useState<Record<string, number>>({});
    const [globalStats, setGlobalStats] = useState({
        total: 0,
        processed: 0,
        contacted: 0,
        not_contacted: 0,
        moved: 0,
        do_not_visit: 0,
        contested: 0
    });

    useEffect(() => {
        const fetchList = async () => {
            if (!id) {
                setError("Link incompleto (ID ausente).");
                setLoading(false);
                return;
            }

            try {
                console.log(`Buscando detalhes do link ${id} via API...`);
                const resData = await getSharedListWithData(id);

                if (!resData.success) {
                    if (resData.status === 404) setError("Link não encontrado.");
                    else if (resData.status === 410) setError("Link expirado.");
                    else setError(resData.error || "Erro ao carregar link.");
                    setLoading(false);
                    return;
                }

                const { list, items: fetchedItems, visits } = resData as any;

                setListData({
                    ...list,
                    assignedTo: list.assigned_to,
                    assignedName: list.assigned_name,
                    congregationId: list.congregation_id,
                    territoryId: list.territory_id,
                    cityId: list.city_id,
                    expiresAt: list.expires_at
                } as any);

                // Show responsibility modal if no one is assigned and list is active
                const hasResponsible = list.assigned_to || list.assignedTo || list.assigned_name || list.assignedName;
                if (!hasResponsible && list.status !== 'completed') {
                    setIsResponsibilityModalOpen(true);
                }

                // 2. Process Results (Visits)
                const linkResults: Record<string, any> = {};
                if (visits) {
                    visits.forEach((v: any) => {
                        linkResults[v.address_id] = v;
                    });
                }

                // 3. Merge Items with Results
                // Note: items returned by the API include all snapshots (territories + addresses for stats)
                // We must filter for only the "main items" listed in the shared_list metadata
                const mainItemIds = list.items || [];
                const mergedItems = (fetchedItems || [])
                    .filter((item: any) => mainItemIds.includes(item.itemId || item.id))
                    .map((item: any) => {
                        const sourceData = item.data || item;
                        const actualId = item.itemId || item.id;
                        const result = linkResults[actualId];
                        return {
                            ...item,
                            ...sourceData,
                            id: actualId,
                            completed: result?.status === 'contacted',
                            visitStatus: result?.status || item.visitStatus || 'none',
                            visitNotes: result?.notes || '',
                            inactivatedAt: sourceData.inactivated_at || sourceData.inactivatedAt
                        };
                    });

                setItems(mergedItems);

                // 4. Calculate Counts and Stats (if Territory)
                if (list.type === 'territory') {
                    // Try to get all addresses related to these territories
                    // These should be in the snapshots too
                    let allAddresses: any[] = [];

                    if (fetchedItems && fetchedItems.length > 0) {
                        // Em snapshots, o território_id pode estar no item ou dentro de item.data
                        const territoryIds = (list.items || []);
                        allAddresses = fetchedItems.filter((item: any) => {
                            const sourceData = item.data || item;
                            const tId = sourceData.territory_id || sourceData.territoryId;
                            return tId && (territoryIds.includes(tId) || tId === list.territoryId);
                        }).map((item: any) => ({
                            ...(item.data || item),
                            id: item.itemId || item.id
                        }));
                    }

                    const counts: Record<string, number> = {};
                    const procCounts: Record<string, number> = {};
                    const stats = {
                        total: 0,
                        processed: 0,
                        contacted: 0,
                        not_contacted: 0,
                        moved: 0,
                        do_not_visit: 0,
                        contested: 0
                    };

                    allAddresses.forEach((addr: any) => {
                        // O contador NÃO deve contabilizar desativados
                        if (addr.is_active !== false && addr.isActive !== false) {
                            const tId = addr.territory_id || addr.territoryId;
                            if (tId) {
                                counts[tId] = (counts[tId] || 0) + 1;
                            }
                            stats.total++;

                            const result = linkResults[addr.id];
                            const currentStatus = result?.status || 'none';

                            if (currentStatus && currentStatus !== 'none') {
                                stats.processed++;
                                if (tId) {
                                    procCounts[tId] = (procCounts[tId] || 0) + 1;
                                }
                                if (currentStatus === 'contacted') stats.contacted++;
                                else if (currentStatus === 'not_contacted') stats.not_contacted++;
                                else if (currentStatus === 'moved') stats.moved++;
                                else if (currentStatus === 'do_not_visit') stats.do_not_visit++;
                                else if (currentStatus === 'contested') stats.contested++;
                            }
                        }
                    });

                    setAddressCounts(counts);
                    setProcessedCounts(procCounts);
                    setGlobalStats(stats);
                }
            } catch (err) {
                console.error("Fetch Shared List Error:", err);
                setError("Erro ao carregar lista compartilhada.");
            } finally {
                setLoading(false);
            }
        }

        if (id) {
            fetchList();
        }
    }, [id]);

    const handleReturnMap = async () => {
        if (!id) return;

        setConfirmModal({
            isOpen: true,
            title: "Devolver Mapa",
            message: "Confirmar devolução do mapa? O link será encerrado em breve.",
            variant: 'info',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setReturning(true);
                try {
                    const resData = await processSharedListAction(id, 'return_map');

                    if (!resData.success) {
                        throw new Error(resData.error || 'Erro ao devolver mapa');
                    }

                    toast.success("Mapa devolvido com sucesso! O acesso será encerrado em 24 horas.");
                    window.location.reload();
                } catch (e: any) {
                    console.error(e);
                    toast.error(e.message || "Erro ao devolver mapa.");
                    setReturning(false);
                }
            }
        });
    };

    const handleReturnTerritory = async (territoryId: string, territoryName: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Devolver Território",
            message: `Confirmar devolução do território ${territoryName}?`,
            variant: 'info',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                // Atualização otimista da UI antes da confirmação do servidor
                setItems(prev => prev.map(item =>
                    item.id === territoryId ? { ...item, visitStatus: 'completed' } : item
                ));

                try {
                    const resData = await processSharedListAction(id as string, 'return_territory', { territoryId, undo: false });

                    if (!resData.success) {
                        throw new Error(resData.error || 'Erro ao devolver território');
                    }

                    toast.success(`Território ${territoryName} devolvido.`);

                } catch (e: any) {
                    console.error(e);
                    toast.error(e.message || "Erro ao sincronizar devolução. Tente novamente.");
                    // Reverte a atualização otimista em caso de erro
                    setItems(prev => prev.map(item =>
                        item.id === territoryId ? { ...item, visitStatus: 'active' } : item
                    ));
                }
            }
        });
    };

    const handleUndoReturnTerritory = async (territoryId: string, territoryName: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Desfazer Devolução",
            message: `Desfazer devolução do território ${territoryName}?`,
            variant: 'info',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                // Atualização otimista da UI
                setItems(prev => prev.map(item =>
                    item.id === territoryId ? { ...item, visitStatus: 'active' } : item
                ));

                try {
                    const resData = await processSharedListAction(id as string, 'return_territory', { territoryId, undo: true });
                    if (!resData.success) throw new Error(resData.error || 'Erro ao desfazer');

                    if (listData?.status === 'completed') {
                        // Atualiza o estado local após reativação da lista
                        setListData(prev => prev ? { ...prev, status: 'active' } : null);
                        toast.success("Mapa reativado!");
                    } else {
                        toast.success(`Retorno do território ${territoryName} desfeito.`);
                    }

                } catch (e: any) {
                    console.error(e);
                    toast.error(e.message || "Erro ao desfazer ação.");
                    // Reverte a atualização otimista
                    setItems(prev => prev.map(item =>
                        item.id === territoryId ? { ...item, visitStatus: 'completed' } : item
                    ));
                }
            }
        });
    };

    const handleAcceptResponsibility = async () => {
        if (!user) {
            router.push(`/login?redirect=/share?id=${id}`);
            return;
        }
        if (!id) return;
        setAccepting(true);
        try {
                const resData = await processSharedListAction(id, 'accept_responsibility', {
                    userId: user.uid,
                    userName: profileName || 'Irmão sem Nome',
                    userCongregationId: listData?.congregationId
                });

                if (!resData.success) throw new Error(resData.error || 'Erro ao aceitar responsabilidade');

                // Se o servidor indicar que o usuário foi vinculado, recarrega a página
                if (resData.reloadRequired) {
                    window.location.reload();
                    return;
                }

            setIsResponsibilityModalOpen(false);
            setListData(prev => prev ? {
                ...prev,
                assignedTo: user.uid,
                assignedName: profileName || 'Irmão sem Nome'
            } : null);
        } catch (e: any) {
            console.error("Error accepting responsibility:", e);
            toast.error(e.message || "Erro ao aceitar responsabilidade.");
        } finally {
            setAccepting(false);
        }
    };

    const handleSaveVisit = async (data: any) => {
        if (!visitingItem || !id) return;

        // Optimistic UI Update
        setItems(prev => prev.map(item =>
            item.id === visitingItem.id
                ? { ...item, completed: data.status === 'contacted', visitStatus: data.status, visitNotes: data.observations || '' }
                : item
        ));

        const savedItem = visitingItem;
        setVisitingItem(null);

        try {
            const visit_date = new Date().toISOString();

            // Prepare visit data
            const visitData = {
                address_id: savedItem.id,
                territory_id: savedItem.territory_id || listData?.territoryId,
                user_id: user?.uid,
                status: data.status,
                notes: data.observations || '',
                visit_date: visit_date,
                tags_snapshot: {
                    isDeaf: data.isDeaf || false,
                    isMinor: data.isMinor || false,
                    isStudent: data.isStudent || false,
                    isNeurodivergent: data.isNeurodivergent || false
                }
            };

            // Save visit via Client Service
            const resData = await reportVisit(id, visitData);

            if (!resData.success) {
                throw new Error(resData.error || 'Erro ao salvar visita');
            }

            // Optional: The API could handle address updates if we wanted, 
            // but for now, we rely on the visit record being preserved for this shareId.

        } catch (e: any) {
            console.error("Error saving visit:", e);
            toast.error(e.message || "Erro ao salvar. Verifique sua conexão.");
            // Revert Optimistic Update
            setItems(prev => prev.map(item =>
                item.id === savedItem.id
                    ? { ...item, completed: false, visitStatus: savedItem.visitStatus }
                    : item
            ));
        }
    };

    const handleDeleteVisit = async () => {
        if (!visitingItem || !id) return;

        try {
            const resData = await deleteVisitByAddressAndShare(visitingItem.id, id);

            if (!resData.success) {
                throw new Error(resData.error || 'Erro ao remover visita');
            }

            // Optimistic UI Update
            setItems(prev => prev.map(item =>
                item.id === visitingItem.id
                    ? { ...item, completed: false, visitStatus: 'none', visitNotes: '' }
                    : item
            ));

            toast.success("Resposta removida com sucesso!");

        } catch (e: any) {
            console.error("Error deleting visit:", e);
            toast.error(e.message || "Erro ao remover visita.");
        }
    };

    const handleOpenMap = (item: any) => {
        const query = `${item.street}, ${item.number}`;
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);

        let url = '';
        if (isIOS) {
            url = `maps://?q=${encodeURIComponent(query)}`;
        } else if (isAndroid) {
            url = `geo:0,0?q=${encodeURIComponent(query)}`;
        } else {
            url = item.googleMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
        }

        window.open(url, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-gray-400 text-sm font-bold animate-pulse">Carregando lista...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-6">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-primary-light/30 rounded-full flex items-center justify-center mx-auto text-primary">
                        <MapIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">Ops!</h1>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen font-sans pb-10 text-main">
            {/* Minimal Header */}
            <header className="px-6 py-6 bg-surface border-b border-surface-border flex items-center justify-center sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 text-primary bg-primary-light/50 dark:bg-primary-dark/30 rounded-lg flex items-center justify-center shadow-md shadow-primary-light/10 dark:shadow-none">
                        <Share2 className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-lg text-main tracking-tight">Lista Compartilhada</span>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-5 py-8 space-y-6">

                {/* Context Header */}
                {/* Instruction Card */}
                {/* Global Progress Bar & Return Action */}
                {listData?.type === 'territory' && (
                    <div className="bg-surface rounded-lg p-6 shadow-xl shadow-primary-light/5 space-y-6 border border-surface-border relative overflow-hidden">

                        {/* Title & Status */}
                        <div className="flex flex-col gap-1">
                            <h2 className="text-2xl font-bold text-main">Cobertura do mapa</h2>
                            <p className="text-muted text-sm">
                                {globalStats.total > 0 && globalStats.processed === globalStats.total
                                    ? (listData?.status === 'completed' ? "Este mapa já foi devolvido." : "Parabéns! Todos os territórios foram trabalhados.")
                                    : "Registre o resultado de cada visita abaixo."}
                            </p>
                        </div>

                        {/* Expiration Notice if Completed */}
                        {listData?.status === 'completed' && (
                            <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                                    <HistoryIcon className="w-5 h-5" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-orange-800 dark:text-orange-300">Acesso Temporário</p>
                                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">O acesso a este link será encerrado automaticamente em 24h.</p>
                                </div>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {globalStats.total > 0 && (
                            <div className="space-y-2">
                                <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                                    {/* Contacted */}
                                    <div style={{ width: `${(globalStats.contacted / globalStats.total) * 100}%` }} className="bg-green-600 h-full transition-all duration-500" title={`Contatados: ${globalStats.contacted}`} />
                                    {/* Not Contacted */}
                                    <div style={{ width: `${(globalStats.not_contacted / globalStats.total) * 100}%` }} className="bg-orange-500 h-full transition-all duration-500" title={`Não Contatados: ${globalStats.not_contacted}`} />
                                    {/* Moved */}
                                    <div style={{ width: `${(globalStats.moved / globalStats.total) * 100}%` }} className="bg-blue-500 h-full transition-all duration-500" title={`Mudou-se: ${globalStats.moved}`} />
                                    {/* Do Not Visit */}
                                    <div style={{ width: `${(globalStats.do_not_visit / globalStats.total) * 100}%` }} className="bg-red-500 h-full transition-all duration-500" title={`Não Visitar: ${globalStats.do_not_visit}`} />
                                </div>
                                <div className="flex justify-between text-xs font-bold text-muted">
                                    <span>{globalStats.processed} de {globalStats.total} visitas concluídas</span>
                                    <span>{Math.round((globalStats.processed / globalStats.total) * 100)}%</span>
                                </div>

                                {/* Legend */}
                                <div className="flex flex-wrap gap-3 pt-2">
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-600" /><span className="text-[10px] text-muted font-bold uppercase">Contatado</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-[10px] text-muted font-bold uppercase">Não Contatado</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] text-muted font-bold uppercase">Mudou</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] text-muted font-bold uppercase">Não Visitar</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" /><span className="text-[10px] text-muted font-bold uppercase">Não Trabalhado</span></div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            {/* Return Button - Only if 100% complete */}
                            {globalStats.total > 0 && globalStats.processed === globalStats.total && (
                                <button
                                    onClick={handleReturnMap}
                                    disabled={returning || listData?.status === 'completed'}
                                    className={`flex-1 px-6 py-3.5 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg
                                        ${listData?.status === 'completed'
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 shadow-none cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20'
                                        }`}
                                >
                                    {returning ? <Loader2 className="w-4 h-4 animate-spin" /> : (listData?.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />)}
                                    {listData?.status === 'completed' ? 'Mapa Devolvido' : 'Devolver Mapa'}
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    toast.success("Link copiado!");
                                }}
                                className="flex-1 bg-surface hover:bg-background text-primary dark:text-primary-light active:scale-95 transition-all px-6 py-3.5 rounded-lg text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-surface-border shadow-sm"
                            >
                                <Share2 className="w-4 h-4" />
                                <span className="uppercase text-xs font-bold tracking-wider">Copiar Link</span>
                            </button>
                        </div>
                    </div>
                )}

                {listData?.type !== 'territory' && (
                    <div className="bg-primary rounded-lg p-6 shadow-xl shadow-primary-light/20 text-white space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Relatório de Campo</h2>
                            <p className="text-primary-light/80 text-sm leading-relaxed">
                                Clique em cada endereço abaixo para registrar o resultado da sua visita.
                                O mapa será marcado como concluído automaticamente ao terminar todos.
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                toast.success("Link copiado!");
                            }}
                            className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-white/10 w-full justify-center sm:w-auto"
                        >
                            <Share2 className="w-4 h-4" />
                            Copiar Link do Cartão
                        </button>
                    </div>
                )}

                {/* List Items */}
                <div className="space-y-3">
                    {items.length === 0 && !loading && (
                        <div className="text-center py-10 text-muted">
                            <p>Nenhum item encontrado nesta lista.</p>
                            <p className="text-xs mt-2 opacity-50">ID: {id}</p>
                        </div>
                    )}
                    {items.map((item) => {
                        let href = '#';
                        let isExternal = false;

                        if (listData?.type === 'city') {
                            href = `/share/preview?type=city&id=${item.id}&shareId=${id}`;
                        } else if (listData?.type === 'territory') {
                            href = `/share/preview?type=territory&id=${item.id}&shareId=${id}`;
                        } else if (listData?.type === 'address') {
                            if (item.googleMapsLink) {
                                href = item.googleMapsLink;
                                isExternal = true;
                            } else if (item.lat && item.lng) {
                                href = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
                                isExternal = true;
                            } else {
                                href = '#';
                            }
                        }

                        return (
                            <div key={item.id} className="block group">
                                <div className={`bg-surface p-4 rounded-lg border border-surface-border flex items-center gap-4 shadow-sm group-hover:border-primary-light dark:group-hover:border-primary-dark group-hover:shadow-md transition-all relative overflow-hidden ${item.is_active === false || item.isActive === false ? 'opacity-60 grayscale' : ''}`}>

                                    {/* Hover Highlight */}
                                    <div
                                        onClick={() => {
                                            if (listData?.type === 'address') {
                                                if (!user) {
                                                    setConfirmModal({
                                                        isOpen: true,
                                                        title: "Login Necessário",
                                                        message: "Você precisa estar logado para registrar uma visita. Deseja entrar agora?",
                                                        variant: 'info',
                                                        onConfirm: () => {
                                                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                            router.push(`/login?redirect=/share?id=${id}`);
                                                        }
                                                    });
                                                    return;
                                                }
                                                setVisitingItem(item);
                                            } else if (href !== '#') {
                                                router.push(href);
                                            }
                                        }}
                                        className={`absolute inset-0 z-0 ${listData?.type === 'address' ? 'cursor-pointer' : ''}`}
                                    />

                                    {/* Icon based on type */}
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors shadow-sm
                                                        ${listData?.type === 'address'
                                            ? (item.visitStatus === 'contacted' ? 'bg-[#21832B] text-white' :
                                                item.visitStatus === 'not_contacted' ? 'bg-orange-500 text-white' :
                                                    item.visitStatus === 'moved' ? 'bg-blue-500 text-white' :
                                                        item.visitStatus === 'do_not_visit' ? 'bg-red-500 text-white' :
                                                            'bg-primary-light/50 dark:bg-primary-dark/30 text-primary-dark dark:text-primary-light group-hover:bg-primary-light/80 dark:group-hover:bg-primary-dark/50 group-hover:text-primary-dark dark:group-hover:text-primary-light')
                                            : listData?.type === 'territory' && (addressCounts[item.id] > 0 && addressCounts[item.id] === processedCounts[item.id])
                                                ? 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                                                : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700 group-hover:bg-primary-light/50 dark:group-hover:bg-primary-dark/30 group-hover:text-primary dark:group-hover:text-primary-light'
                                        }`}
                                    >
                                        {listData?.type === 'city' && <Building2 className="w-6 h-6" />}
                                        {listData?.type === 'territory' && <MapIcon className="w-6 h-6" />}

                                        {listData?.type === 'address' && (
                                            <>
                                                {item.gender === 'HOMEM' && <User className={`w-5 h-5 ${item.visitStatus ? 'text-white' : 'text-primary fill-primary'}`} />}
                                                {item.gender === 'MULHER' && <User className={`w-5 h-5 ${item.visitStatus ? 'text-white' : 'text-pink-500 fill-pink-500'}`} />}
                                                {item.gender === 'CASAL' && (
                                                    <div className="flex items-center -space-x-1">
                                                        <User className={`w-4 h-4 ${item.visitStatus ? 'text-white' : 'text-purple-500 fill-purple-500'}`} />
                                                        <User className={`w-4 h-4 ${item.visitStatus ? 'text-white' : 'text-purple-500 fill-purple-500'}`} />
                                                    </div>
                                                )}
                                                {!item.gender && <MapPin className={`w-6 h-6 ${item.visitStatus ? 'text-white' : 'text-primary'}`} />}
                                            </>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {listData?.type === 'address' && (
                                            <>
                                                <h3 className="font-bold text-main truncate group-hover:text-primary-dark dark:group-hover:text-primary-light transition-colors">
                                                    {item.street}
                                                    {!item.street?.includes(item.number || '') && item.number !== 'S/N' ? `, ${item.number}` : ''}
                                                    {item.complement ? ` - ${item.complement}` : ''}
                                                </h3>

                                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted">
                                                    {item.peopleCount ? (
                                                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md" title="Número de Pessoas">
                                                            <Users className="w-3 h-3" />
                                                            <span className="font-bold">{item.peopleCount}</span>
                                                        </div>
                                                    ) : null}
                                                    {item.residentName && <span className="font-semibold text-main">{item.residentName}</span>}

                                                    {item.is_deaf && (
                                                        <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                                            <Ear className="w-3 h-3" /> Surdo
                                                        </span>
                                                    )}
                                                    {item.is_minor && (
                                                        <span className="flex items-center gap-1 bg-primary-light/30 text-primary-dark px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                                            <Baby className="w-3 h-3" /> Menor
                                                        </span>
                                                    )}
                                                    {item.is_student && (
                                                        <span className="flex items-center gap-1 bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                                            <GraduationCap className="w-3 h-3" /> Estudante
                                                        </span>
                                                    )}
                                                    {(item.is_active === false || item.isActive === false) && item.inactivatedAt && (
                                                        <span className="flex items-center gap-1 bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30">
                                                            <Calendar className="w-3 h-3" /> Desativado em: {new Date(item.inactivatedAt).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                        {listData?.type === 'city' && (
                                            <h3 className="font-bold text-main truncate group-hover:text-primary-dark dark:group-hover:text-primary-light transition-colors">{item.name}</h3>
                                        )}
                                        {listData?.type === 'territory' && (
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-main text-base truncate">{item.name}</h3>
                                                    {addressCounts[item.id] > 0 && addressCounts[item.id] === processedCounts[item.id] ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                            <CheckCircle2 className="w-3 h-3" /> Concluído
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-primary-dark bg-primary-light/50 dark:bg-primary-dark/50 dark:text-primary-light px-2 py-0.5 rounded-full whitespace-nowrap">
                                                            {addressCounts[item.id] || 0} Endereços
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider line-clamp-1">
                                                    {item.description || 'VER ENDEREÇOS'}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Menu Action */}
                                    <div className="relative z-10 flex flex-col gap-2 items-end">
                                        {listData?.type === 'address' ? (
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(openMenuId === item.id ? null : item.id);
                                                    }}
                                                    className={`p-2 rounded-full transition-colors ${openMenuId === item.id ? 'bg-primary-light/50 dark:bg-primary-dark/30 text-primary dark:text-primary-light' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>

                                                {openMenuId === item.id && (
                                                    <div className="absolute right-0 top-10 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-primary-light/20 dark:border-slate-800 p-1 z-[30] min-w-[170px] animate-in fade-in zoom-in-95 duration-200">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setViewingHistoryItem(item);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-primary-light/20 dark:hover:bg-primary-dark/20 hover:text-primary dark:hover:text-primary-light rounded-lg transition-colors w-full text-left"
                                                        >
                                                            <HistoryIcon className="w-4 h-4" />
                                                            Ver Histórico
                                                        </button>

                                                        {item.waze_link && (
                                                            <a
                                                                href={item.waze_link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors w-full text-left"
                                                            >
                                                                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                                                                    <path fill="#33CCFF" d="M19.333 11.667a6.666 6.666 0 0 0-13.333 0c0 .35.03.7.078 1.045a3.167 3.167 0 0 0-2.745 3.122 3.167 3.167 0 0 0 3.167 3.166h.165a2.833 2.833 0 0 0 5.667 0h1.333a2.833 2.833 0 0 0 5.667 0h.165a3.167 3.167 0 0 0 3.167-3.166 3.167 3.167 0 0 0-2.745-3.122 6.666 6.666 0 0 0 .078-1.045z" />
                                                                    <circle cx="15.5" cy="11.5" r="1" fill="#fff" />
                                                                    <circle cx="9.5" cy="11.5" r="1" fill="#fff" />
                                                                    <path d="M10 14.5s1 1 2 0" stroke="#fff" strokeWidth="1" fill="none" strokeLinecap="round" />
                                                                </svg>
                                                                Abrir no Waze
                                                            </a>
                                                        )}

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenMap(item);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-primary-light/50 dark:hover:bg-primary-dark/30 text-primary dark:text-primary-light rounded-lg transition-colors w-full text-left"
                                                        >
                                                            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                                                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4285F4" />
                                                                <circle cx="12" cy="9" r="2.5" fill="#fff" />
                                                            </svg>
                                                            Abrir no Mapa
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                {/* Individual Return Action for Territories */}
                                                {listData?.type === 'territory' && (
                                                    <div onClick={e => e.stopPropagation()}>
                                                        {item.visitStatus === 'completed' ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUndoReturnTerritory(item.id, item.name);
                                                                }}
                                                                className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                                                                title="Desfazer devolução"
                                                            >
                                                                <CheckCircle className="w-5 h-5" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleReturnTerritory(item.id, item.name);
                                                                }}
                                                                className="p-2 rounded-full text-gray-300 hover:text-green-500 hover:bg-green-50 transition-colors"
                                                                title="Devolver Território"
                                                            >
                                                                <CheckCircle2 className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </main>

            {visitingItem && (
                <VisitReportModal
                    address={visitingItem}
                    onClose={() => setVisitingItem(null)}
                    onSave={handleSaveVisit}
                    onDelete={handleDeleteVisit}
                    onViewHistory={() => {
                        setViewingHistoryItem(visitingItem);
                        setVisitingItem(null);
                    }}
                />
            )}

            {/* History Modal */}
            {viewingHistoryItem && (
                <VisitHistoryModal
                    onClose={() => setViewingHistoryItem(null)}
                    addressId={viewingHistoryItem.id}
                    address={viewingHistoryItem.street}
                />
            )}

            {isResponsibilityModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-surface w-full max-w-sm rounded-[2rem] p-6 space-y-6 animate-in slide-in-from-bottom-5">
                        <h2 className="text-xl font-black text-center">Aceitar Responsabilidade?</h2>
                        <p className="text-center text-muted">Ao aceitar, você se compromete a trabalhar este território.</p>
                        <div className="space-y-3">
                            <button onClick={handleAcceptResponsibility} disabled={accepting} className="w-full bg-primary text-white py-4 rounded-lg font-bold">
                                {accepting ? "Aceitando..." : "Sim, Aceitar"}
                            </button>
                            <button onClick={() => setIsResponsibilityModalOpen(false)} className="w-full text-muted py-3 font-bold">
                                Apenas Visualizar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                description={confirmModal.message}
                variant={confirmModal.variant || 'danger'}
            />
        </div>
    );
}

