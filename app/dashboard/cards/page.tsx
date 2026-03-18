"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from "@/app/context/AuthContext";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    limit,
    orderBy,
    serverTimestamp,
    writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from 'next/link';
import BottomNav from "@/app/components/BottomNav";
import {
    ArrowLeft,
    Loader2,
    History,
    Map as MapIcon,
    User,
    Calendar,
    Clock,
    MoreVertical,
    ExternalLink,
    Copy,
    Share2,
    UserMinus,
    CheckCircle2,
    AlertCircle,
    CheckSquare,
    Square,
    ListChecks,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';

function CardsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const scope = (searchParams.get('scope') as 'mine' | 'managed') || 'mine';

    const { user, role, isElder, isServant, congregationId, profileName, isAdminRoleGlobal, loading: authLoading } = useAuth();
    const [lists, setLists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'warning';
    } | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [openMenuId]);

    const fetchLists = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            const listsRef = collection(db, "shared_lists");
            let q;

            // SCOPE: MINE
            if (scope === 'mine') {
                q = query(listsRef, where("assigned_to", "==", user.uid));
            }
            // SCOPE: MANAGED (Sent/All)
            else if (scope === 'managed') {
                if (role !== 'ADMIN' && congregationId) {
                    q = query(listsRef, where("congregationId", "==", congregationId));
                } else if (role !== 'ADMIN') {
                    setLists([]);
                    setLoading(false);
                    return;
                } else {
                    // Admin sees all, limited for safety
                    q = query(listsRef, limit(100));
                }
            } else {
                setLists([]);
                setLoading(false);
                return;
            }

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            let rawLists: any[] = (data || []).map((item: any) => ({
                ...item,
                assignedTo: item.assigned_to || item.assignedTo,
                assignedName: item.assigned_name || item.assignedName,
                congregationId: item.congregation_id || item.congregationId,
                createdAt: item.created_at || item.createdAt,
                expiresAt: item.expires_at || item.expiresAt,
                responsibleName: scope === 'mine' ? 'Você' : (item.assignedName || item.assigned_name || (item.assignedTo || item.assigned_to ? 'Usuário' : 'Não atribuído'))
            }));

            // Filter for Publisher in Managed View
            if (scope === 'managed' && !isElder && !isServant && !isAdminRoleGlobal) {
                const userName = profileName || user?.displayName || user?.email?.split('@')[0];
                rawLists = rawLists.filter(l => l.assignedName === userName || l.assignedTo === user.uid);
            }

            // Only show active ones for 'mine'
            if (scope === 'mine') {
                rawLists = rawLists.filter(l => l.status !== 'completed' && l.status !== 'archived');
            }

            // Sort
            rawLists.sort((a, b) => {
                const isAActive = a.status !== 'completed' && a.status !== 'archived';
                const isBActive = b.status !== 'completed' && b.status !== 'archived';
                if (isAActive && !isBActive) return -1;
                if (!isAActive && isBActive) return 1;

                const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });

            setLists(rawLists);

        } catch (e) {
            console.error("Error fetching lists:", e);
        } finally {
            setLoading(false);
        }
    }, [user, scope, role, isElder, isServant, congregationId, profileName, isAdminRoleGlobal]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchLists();
        }
    }, [authLoading, user, fetchLists]);


    // Handlers
    const handleCopyLink = async (id: string) => {
        const shareUrl = window.location.origin + "/share?id=" + id;
        try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Link copiado com sucesso!");
        } catch (err) {
            console.error("Error copying link:", err);
            toast.error("Erro ao copiar link.");
        }
    };

    const handleShareLink = async (id: string, title?: string) => {
        const shareUrl = window.location.origin + "/share?id=" + id;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title || 'Campo Branco - Cartão de Território',
                    text: 'Acesse o cartão de território do Campo Branco:',
                    url: shareUrl
                });
            } catch (err) {
                console.error("Error sharing:", err);
            }
        } else {
            handleCopyLink(id);
        }
    };

    const handleOpenLink = (id: string) => {
        window.open(window.location.origin + "/share?id=" + id, "_blank");
    };

    const handleDeleteShare = async (id: string) => {
        setConfirmModal(null);
        setLoading(true);
        try {
            const listRef = doc(db, "shared_lists", id);
            await deleteDoc(listRef);

            setLists(prev => prev.filter(item => item.id !== id));
            toast.success("Cartão excluído com sucesso.");
        } catch (err: any) {
            console.error("Error deleting share:", err);
            toast.error(err.message || "Erro ao excluir.");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveResponsible = async (id: string) => {
        setConfirmModal(null);
        try {
            const listRef = doc(db, "shared_lists", id);
            await updateDoc(listRef, {
                assigned_to: null,
                assignedTo: null,
                assigned_name: null,
                assignedName: null,
                updatedAt: serverTimestamp()
            });
            fetchLists();
            toast.success("Responsável removido.");
        } catch (err) {
            console.error("Error removing responsible:", err);
            toast.error("Erro ao remover responsável.");
        }
    };

    const handleBulkDelete = async () => {
        setConfirmModal(null);
        setLoading(true);
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => {
                const listRef = doc(db, "shared_lists", id);
                batch.delete(listRef);
            });
            await batch.commit();

            setLists(prev => prev.filter(item => !selectedIds.includes(item.id)));
            toast.success(`${selectedIds.length} cartões excluídos.`);
            setSelectedIds([]);
            setIsSelectionMode(false);
        } catch (err: any) {
            console.error("Bulk delete error:", err);
            toast.error(err.message || "Erro ao excluir cartões.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkRemoveResponsible = async () => {
        setConfirmModal(null);
        setLoading(true);
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => {
                const listRef = doc(db, "shared_lists", id);
                batch.update(listRef, {
                    assigned_to: null,
                    assignedTo: null,
                    assigned_name: null,
                    assignedName: null,
                    updatedAt: serverTimestamp()
                });
            });
            await batch.commit();

            fetchLists();
            setSelectedIds([]);
            setIsSelectionMode(false);
            toast.success(`Responsáveis removidos de ${selectedIds.length} cartões.`);
        } catch (err) {
            console.error("Bulk remove responsible error:", err);
            toast.error("Erro ao remover responsáveis.");
        } finally {
            setLoading(false);
        }
    };

    const toggleIdSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === lists.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(lists.map(l => l.id));
        }
    };

    const formatDate = (dateValue: any) => {
        if (!dateValue) return 'N/A';

        // Check if it's a Firestore Timestamp and has the toDate method
        const date = typeof dateValue.toDate === 'function' ? dateValue.toDate() : new Date(dateValue);

        // Still invalid date fallback
        if (isNaN(date.getTime())) return 'N/A';

        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    const formatExpirationTime = (expiresAtValue: any) => {
        if (!expiresAtValue) return "Por tempo indeterminado";
        const expiresAt = new Date(expiresAtValue);
        const now = new Date();
        const diffMs = expiresAt.getTime() - now.getTime();
        if (diffMs <= 0) return "Vencido";
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = Math.ceil(diffHours / 24);
        if (diffDays > 1000) return "Por tempo indeterminado";
        if (diffHours < 1) return "Vence em menos de uma hora";
        if (diffHours < 24) return `Vence em ${Math.floor(diffHours)} horas`;
        return `Faltam ${diffDays} dias`;
    };

    return (
        <div className="bg-background min-h-screen font-sans pb-24 transition-colors duration-300">
            {/* Header */}
            <header className="px-6 py-4 bg-surface border-b border-surface-border flex items-center justify-between sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg text-main leading-tight">
                            {scope === 'mine' ? 'Meus Cartões' : 'Cartões Enviados'}
                        </h1>
                        <span className="text-[10px] text-primary dark:text-blue-400 font-bold uppercase tracking-widest">
                            {scope === 'mine' ? 'Designações Pessoais' : 'Gestão de Territórios'}
                        </span>
                    </div>
                </div>

                {scope === 'managed' && !loading && lists.length > 0 && (
                    <button
                        onClick={() => {
                            setIsSelectionMode(!isSelectionMode);
                            if (isSelectionMode) setSelectedIds([]);
                        }}
                        className={`p-2 rounded-lg transition-all ${isSelectionMode ? 'bg-primary text-white shadow-lg' : 'bg-surface border border-surface-border text-muted hover:text-main'}`}
                    >
                        <ListChecks className="w-5 h-5" />
                    </button>
                )}
            </header>

            {/* Selection Toolbar */}
            {isSelectionMode && (
                <div className="bg-primary/5 dark:bg-blue-900/10 border-b border-primary/20 px-6 py-3 sticky top-[73px] z-30 animate-in slide-in-from-top-4 duration-300">
                    <div className="max-w-xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 text-xs font-bold text-primary dark:text-blue-400"
                            >
                                {selectedIds.length === lists.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                {selectedIds.length === lists.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                            </button>
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">
                                {selectedIds.length} selecionado(s)
                            </span>
                        </div>

                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setConfirmModal({
                                        title: 'Remover Responsáveis?',
                                        message: `Deseja remover o responsável de ${selectedIds.length} cartões selecionados?`,
                                        variant: 'warning',
                                        onConfirm: handleBulkRemoveResponsible
                                    })}
                                    className="p-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg transition-colors border border-orange-200 dark:border-orange-800/30"
                                    title="Remover responsáveis em massa"
                                >
                                    <UserMinus className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setConfirmModal({
                                        title: 'Excluir Selecionados?',
                                        message: `Deseja excluir definitivamente os ${selectedIds.length} cartões selecionados?`,
                                        variant: 'danger',
                                        onConfirm: handleBulkDelete
                                    })}
                                    className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors border border-red-200 dark:border-red-800/30"
                                    title="Excluir em massa"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <main className="max-w-xl mx-auto px-6 py-8">
                {/* Icon Banner */}
                <div className="mb-6 bg-surface p-4 rounded-lg border border-surface-border flex items-center gap-3 shadow-sm">
                    <div className={`
                        p-2 rounded-lg
                        ${scope === 'mine' ? 'bg-primary-light dark:bg-blue-900/30 text-primary' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'}
                    `}>
                        {scope === 'mine' ? <User className="w-5 h-5" /> : <MapIcon className="w-5 h-5" />}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-muted font-medium leading-tight">
                        {scope === 'mine'
                            ? "Abaixo estão listado os cartões que você está trabalhando no momento."
                            : "Abaixo estão todos os cartões de território que foram enviados para os publicadores."
                        }
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : lists.length === 0 ? (
                    <div className="text-center py-12 opacity-50 bg-surface rounded-lg border border-dashed border-surface-border">
                        <p className="text-sm text-muted">Nenhum cartão encontrado.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {lists.map((list) => (
                            <div
                                key={list.id}
                                onClick={() => isSelectionMode && toggleIdSelection(list.id)}
                                className={`p-4 rounded-lg bg-surface border ${selectedIds.includes(list.id) ? 'border-primary border-2 shadow-md' : 'border-surface-border'} hover:border-blue-200 dark:hover:border-blue-800 transition-all group relative shadow-sm ${isSelectionMode ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                            >
                                {isSelectionMode && (
                                    <div className="absolute right-4 top-4">
                                        {selectedIds.includes(list.id)
                                            ? <CheckCircle2 className="w-5 h-5 text-primary" />
                                            : <div className="w-5 h-5 rounded-full border-2 border-surface-border" />
                                        }
                                    </div>
                                )}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-main text-sm truncate">
                                            {list.context?.territoryName ? `${list.context.territoryName} - ${list.context.featuredDetails || 'Mapa'}` : (list.title || "Cartão de Território")}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <User className="w-3 h-3 text-muted" />
                                            <span className="text-[10px] font-bold text-muted truncate">{list.responsibleName}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 pt-1 flex items-center gap-2">
                                        {list.status === 'completed' ? (
                                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">Concluído</span>
                                        ) : (
                                            <span className="bg-primary-light dark:bg-blue-900/30 text-primary-dark dark:text-blue-400 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">Ativo</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-surface-border/50">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-muted" />
                                            <span className="text-[10px] text-muted font-medium">Início: {formatDate(list.createdAt || list.created_at)}</span>
                                        </div>
                                        {list.status !== 'completed' && list.expiresAt && formatExpirationTime(list.expiresAt) && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-orange-400" />
                                                <span className={`text-[10px] font-bold ${(list.expiresAt && (list.expiresAt.seconds * 1000 - Date.now()) < 5 * 24 * 60 * 60 * 1000)
                                                    ? 'text-red-500 dark:text-red-400'
                                                    : 'text-orange-500 dark:text-orange-400'
                                                    }`}>
                                                    {formatExpirationTime(list.expiresAt)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="relative">
                                        {!isSelectionMode && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === list.id ? null : list.id);
                                                }}
                                                className="p-1.5 text-muted hover:text-main hover:bg-surface rounded-lg transition-all shadow-sm"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        )}

                                        {openMenuId === list.id && (
                                            <div className="absolute right-0 top-8 w-48 bg-surface rounded-lg shadow-xl border border-surface-border py-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                                                <button
                                                    onClick={() => {
                                                        handleOpenLink(list.id);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-main hover:bg-primary-light/50 dark:hover:bg-blue-900/30 hover:text-primary dark:hover:text-blue-400 flex items-center gap-2 transition-colors border-b border-surface-border"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    Abrir Link
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleCopyLink(list.id);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-main hover:bg-primary-light/50 dark:hover:bg-blue-900/30 hover:text-primary dark:hover:text-blue-400 flex items-center gap-2 transition-colors border-b border-surface-border"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                    Copiar Link
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleShareLink(list.id, list.title);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-main hover:bg-primary-light/50 dark:hover:bg-blue-900/30 hover:text-primary dark:hover:text-blue-400 flex items-center gap-2 transition-colors border-b border-surface-border"
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                    Enviar Link
                                                </button>
                                                {(isElder || isServant || role === 'ADMIN') && (
                                                    <button
                                                        onClick={() => {
                                                            setConfirmModal({
                                                                title: 'Remover Responsável?',
                                                                message: 'Tem certeza que deseja remover o responsável?',
                                                                variant: 'warning',
                                                                onConfirm: () => handleRemoveResponsible(list.id)
                                                            });
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 flex items-center gap-2 transition-colors border-b border-surface-border"
                                                    >
                                                        <UserMinus className="w-3.5 h-3.5" />
                                                        Remover Responsável
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setConfirmModal({
                                                            title: 'Excluir Cartão?',
                                                            message: 'Tem certeza que deseja excluir? O link deixará de funcionar.',
                                                            variant: 'danger',
                                                            onConfirm: () => handleDeleteShare(list.id)
                                                        });
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Excluir
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {confirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-surface rounded-xl w-full max-w-xs p-6 shadow-2xl animate-in zoom-in-95 duration-300 border border-surface-border">
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-16 h-16 ${confirmModal.variant === 'danger' ? 'bg-red-100 dark:bg-red-900/20 text-red-600' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600'} rounded-full flex items-center justify-center mb-4`}>
                                {confirmModal.variant === 'danger' ? <Trash2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                            </div>
                            <h2 className="text-lg font-bold text-main mb-2">{confirmModal.title}</h2>
                            <p className="text-sm text-muted mb-6">{confirmModal.message}</p>
                            <div className="flex flex-col w-full gap-2">
                                <button
                                    onClick={confirmModal.onConfirm}
                                    className={`w-full py-3 ${confirmModal.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'} text-white rounded-lg font-bold text-sm transition-colors`}
                                >
                                    Confirmar
                                </button>
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="w-full py-3 bg-background text-muted rounded-lg font-bold text-sm hover:bg-surface-highlight border border-surface-border transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <BottomNav />
        </div>
    );
}

export default function CardsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        }>
            <CardsContent />
        </Suspense>
    );
}
