"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    orderBy,
    limit,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    documentId
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    History,
    Calendar,
    User,
    MapPin,
    MoreVertical,
    Pencil,
    Trash2,
    X,
    Check,
    Loader2,
    AlertCircle
} from "lucide-react";

import Link from "next/link";
import { toast } from "sonner";
import ConfirmationModal from "@/app/components/ConfirmationModal";

export default function VisitsHistory({ scope = 'all', showViewAll = true }: { scope?: 'mine' | 'all', showViewAll?: boolean }) {
    const { user, congregationId, role, isElder, isServant, profileName, loading: authLoading } = useAuth();
    const [visits, setVisits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Edit Form State
    const [editForm, setEditForm] = useState({
        observations: '',
        status: ''
    });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'info';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const fetchVisits = useCallback(async () => {
        setLoading(true);
        try {
            const visitsRef = collection(db, 'visits');
            let q = query(visitsRef, orderBy('visitDate', 'desc'), limit(showViewAll ? 20 : 100));

            if (role !== 'ADMIN') {
                if (congregationId) {
                    q = query(visitsRef, where('congregationId', '==', congregationId), orderBy('visitDate', 'desc'), limit(showViewAll ? 20 : 100));
                } else {
                    setVisits([]);
                    setLoading(false);
                    return;
                }
            }

            const querySnapshot = await getDocs(q);
            const rawVisits = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 2. Filter logic (Scope)
            const filteredVisits = rawVisits.filter((v: any) => {
                const visitUserId = v.userId || v.user_id;
                if (scope === 'mine' && visitUserId !== user?.uid) return false;
                if (scope === 'all' && role !== 'ADMIN' && !isElder && !isServant) {
                    if (visitUserId !== user?.uid) return false;
                }
                return true;
            });

            // 3. Fetch Related Names manually
            const addressIds = Array.from(new Set(filteredVisits.map((v: any) => v.addressId || v.address_id).filter(id => !!id)));
            const userIds = Array.from(new Set(filteredVisits.map((v: any) => v.userId || v.user_id).filter(id => !!id)));

            const addressMap: Record<string, string> = {};
            const userMap: Record<string, string> = {};

            // Fetch addresses (limite de 30 para 'in' no firestore)
            if (addressIds.length > 0) {
                const chunkedAddressIds = [];
                for (let i = 0; i < addressIds.length; i += 30) {
                    chunkedAddressIds.push(addressIds.slice(i, i + 30));
                }

                await Promise.all(chunkedAddressIds.map(async (chunk) => {
                    // Usamos documentId() para buscar pelos IDs reais dos documentos
                    const qAddr = query(
                        collection(db, 'addresses'), 
                        where(documentId(), 'in', chunk),
                        where('congregationId', '==', congregationId)
                    );
                    const addrSnap = await getDocs(qAddr);
                    addrSnap.forEach(docSnap => addressMap[docSnap.id] = docSnap.data().street);
                }));
            }

            // Fetch users
            if (user?.uid) {
                userMap[user.uid] = profileName || "Você";
            }
            if (userIds.length > 0 && (isElder || isServant || role === 'ADMIN')) {
                const chunkedUserIds = [];
                for (let i = 0; i < userIds.length; i += 30) {
                    chunkedUserIds.push(userIds.slice(i, i + 30));
                }

                await Promise.all(chunkedUserIds.map(async (chunk) => {
                    const qUser = query(
                        collection(db, 'users'), 
                        where(documentId(), 'in', chunk)
                    );
                    const userSnap = await getDocs(qUser);
                    userSnap.forEach(docSnap => {
                        const data = docSnap.data();
                        const fetchedName = data.name || data.profileName;
                        if (fetchedName) {
                            userMap[docSnap.id] = fetchedName;
                        }
                    });
                }));
            }

            const mergedVisits = filteredVisits.map((v: any) => {
                const addressId = v.addressId || v.address_id;
                const userId = v.userId || v.user_id;
                const visitDate = v.visitDate || v.visit_date;

                return {
                    ...v,
                    addressStreet: addressMap[addressId] || 'Localização não identificada',
                    displayName: userMap[userId] || 'Publicador',
                    sortDate: visitDate?.toDate ? visitDate.toDate() : (visitDate ? new Date(visitDate) : new Date(0)),
                    observations: v.notes || ''
                };
            });

            if (showViewAll) {
                setVisits(mergedVisits.slice(0, 4));
            } else {
                setVisits(mergedVisits);
            }

        } catch (error) {
            console.error("Error fetching visits:", error);
            setHasError(true);
        } finally {
            setLoading(false);
        }
    }, [congregationId, isElder, isServant, role, user?.uid, profileName, scope, showViewAll]);

    // Timeout for safety
    useEffect(() => {
        if (!loading) return;

        const timer = setTimeout(() => {
            if (loading) {
                console.warn("VisitsHistory fetch timed out");
                setHasError(true);
                setLoading(false);
            }
        }, 12000); // 12 seconds buffer

        return () => clearTimeout(timer);
    }, [loading]);

    useEffect(() => {
        // Wait for auth to resolve
        if (authLoading) return;

        if (!user) {
            setLoading(false);
            return;
        }

        // Only fetch if we have a role assigned (meaning profile sync completed)
        if (role) {
            setHasError(false);
            fetchVisits();
        }
    }, [user, congregationId, role, fetchVisits, authLoading]);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [openMenuId]);

    const handleDelete = async (visit: any) => {
        setConfirmModal({
            isOpen: true,
            title: "Excluir Registro",
            message: "Tem certeza que deseja excluir este registro de visita?",
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const visitRef = doc(db, 'visits', visit.id);
                    await deleteDoc(visitRef);

                    // Remove from state
                    setVisits(prev => prev.filter(v => v.id !== visit.id));
                    toast.success("Visita excluída com sucesso.");
                } catch (error) {
                    console.error("Error deleting visit:", error);
                    toast.error("Erro ao excluir visita.");
                }
            }
        });
    };

    const startEdit = (visit: any) => {
        setEditingId(visit.id);
        setEditForm({
            observations: visit.observations || '',
            status: visit.status || ''
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ observations: '', status: '' });
    };

    const saveEdit = async (visit: any) => {
        try {
            const visitRef = doc(db, 'visits', visit.id);
            await updateDoc(visitRef, {
                notes: editForm.observations,
                status: editForm.status,
                updatedAt: serverTimestamp()
            });

            // Update State
            setVisits(prev => prev.map(v => {
                if (v.id === visit.id) {
                    return { ...v, observations: editForm.observations, status: editForm.status };
                }
                return v;
            }));

            setEditingId(null);
        } catch (error) {
            console.error("Error updating visit:", error);
            toast.error("Erro ao atualizar visita.");
        }
    };

    const formatDate = (date: Date) => {
        if (!date || isNaN(date.getTime())) return 'Data Inválida';
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'contacted': return { label: 'Encontrado', color: 'bg-green-50 text-green-700 border border-green-500 dark:bg-green-900/20 dark:border-green-600 dark:text-green-400' };
            case 'not_contacted': return { label: 'Não Enc.', color: 'bg-orange-50 text-orange-600 border border-orange-500 dark:bg-orange-900/20 dark:border-orange-600 dark:text-orange-400' };
            case 'moved': return { label: 'Mudou-se', color: 'bg-blue-50 text-blue-600 border border-blue-500 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-400' };
            case 'do_not_visit': return { label: 'Não Visitar', color: 'bg-red-50 text-red-600 border border-red-500 dark:bg-red-900/20 dark:border-red-600 dark:text-red-400' };
            default: return { label: status, color: 'bg-gray-50 text-gray-600 border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400' };
        }
    };

    if (loading) return (
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-surface-border h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
    );

    if (hasError) return (
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-surface-border h-46 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-8 h-8 text-orange-400 mb-2" />
            <p className="text-sm font-bold text-main">O carregamento está demorando muito.</p>
            <p className="text-[10px] text-muted mb-4 px-4">Isso pode ser devido à sua conexão. Deseja tentar novamente?</p>
            <button
                onClick={() => {
                    setHasError(false);
                    setLoading(true);
                    fetchVisits();
                }}
                className="bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2 px-6 rounded-full transition-colors flex items-center gap-2"
            >
                Tentar Novamente
            </button>
        </div>
    );

    // if (visits.length === 0) return null; // MOVED: Render empty state inside return

    return (
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-surface-border">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-bold text-main">Histórico Recente</h3>
                </div>
                <div className="flex items-center gap-4">
                    {visits.length > 0 && showViewAll && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Últimas 4</span>
                    )}
                    {showViewAll && (
                        <Link
                            href={`/dashboard/history?scope=${scope}`}
                            className="text-[10px] font-extrabold text-purple-600 uppercase tracking-widest hover:text-purple-700 transition-colors bg-purple-50 px-3 py-1.5 rounded-full"
                        >
                            Ver Tudo
                        </Link>
                    )}
                </div>
            </div>

            {visits.length === 0 ? (
                <div className="text-center py-6 opacity-50">
                    <p className="text-sm text-gray-400">
                        {loading ? "Carregando histórico..." : "Nenhuma visita realizada recentemente."}
                    </p>
                    {(role === 'ADMIN' || isElder) && !loading && (
                        <p className="text-[10px] text-gray-300 mt-2 uppercase">Verifique se as visitas possuem congregação vinculada</p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {visits.map((visit) => (
                        <div key={visit.id} className="p-4 rounded-lg bg-background border border-surface-border hover:border-purple-200 dark:hover:border-purple-800 transition-colors group">

                            {editingId === visit.id ? (
                                // EDIT MODE
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-main text-sm">Editar Visita</h4>
                                        <button onClick={cancelEdit} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                            <X className="w-4 h-4 text-muted" />
                                        </button>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-muted uppercase">Resultado</label>
                                        <select
                                            className="w-full mt-1 p-2 rounded-lg border border-surface-border text-sm bg-surface text-main"
                                            value={editForm.status}
                                            onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                        >
                                            <option value="contacted">Encontrado</option>
                                            <option value="not_contacted">Não Encontrado</option>
                                            <option value="moved">Mudou-se</option>
                                            <option value="do_not_visit">Não Visitar</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-muted uppercase">Observações</label>
                                        <input
                                            type="text"
                                            className="w-full mt-1 p-2 rounded-lg border border-surface-border text-sm bg-surface text-main"
                                            value={editForm.observations}
                                            onChange={e => setEditForm({ ...editForm, observations: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        onClick={() => saveEdit(visit)}
                                        className="w-full bg-purple-600 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-3 h-3" />
                                        Salvar Alterações
                                    </button>
                                </div>
                            ) : (
                                // VIEW MODE
                                <>
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${getStatusLabel(visit.status).color}`}>
                                                    {getStatusLabel(visit.status).label}
                                                </span>
                                                <span className="text-[10px] text-muted font-medium">
                                                    {formatDate(visit.sortDate)}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-main text-sm">{visit.addressStreet}, {visit.addressNumber}</h4>
                                        </div>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === visit.id ? null : visit.id);
                                                }}
                                                className="p-1.5 text-muted hover:text-main hover:bg-surface rounded-lg transition-all shadow-sm"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {openMenuId === visit.id && (
                                                <div className="absolute right-0 top-full mt-2 w-32 bg-surface rounded-lg shadow-xl border border-surface-border py-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                                                    <button
                                                        onClick={() => {
                                                            startEdit(visit);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-light/50 dark:hover:bg-blue-900/30 hover:text-primary dark:hover:text-blue-400 flex items-center gap-2 transition-colors border-b border-surface-border"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleDelete(visit);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Excluir
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {visit.observations && (
                                        <p className="text-xs text-muted bg-surface p-2 rounded-lg border border-surface-border italic">
                                            &quot;{visit.observations}&quot;
                                        </p>
                                    )}

                                    <div className="mt-2 flex items-center gap-1">
                                        <User className="w-3 h-3 text-gray-300" />
                                        <span className="text-[10px] text-gray-400 font-bold">
                                            {visit.displayName}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                description={confirmModal.message}
                variant={confirmModal.variant}
            />
        </div>
    );
}
