"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
    doc,
    getDocs,
    collection,
    query,
    where,
    or,
    and,
    limit,
    serverTimestamp,
    deleteDoc,
    updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    User,
    Shield,
    AlertCircle,
    Copy,
    Trash2,
    Loader2,
    Calendar,
    Share2,
    Clock,
    ExternalLink,
    MoreVertical,
    UserMinus,
    Bell,
    History as HistoryIcon,
    CheckCircle as CheckCircleIcon
} from "lucide-react";
import { toast } from 'sonner';
import { getServiceYear, getServiceYearRange } from "@/lib/serviceYearUtils";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import BottomNav from "@/app/components/BottomNav";
import ActionCenter from "@/app/components/Dashboard/ActionCenter";
import VisitsHistory from "@/app/components/Dashboard/VisitsHistory";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import DropDownItem from "@/app/components/DropDownItem";

// --- UTILS ---

const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    const date = typeof dateValue.toDate === 'function' ? dateValue.toDate() : new Date(dateValue);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const formatExpirationTime = (expiresAtValue: any) => {
    if (!expiresAtValue) return "Por tempo indeterminado";
    const expiresAt = typeof expiresAtValue.toDate === 'function' ? expiresAtValue.toDate() : new Date(expiresAtValue);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    if (diffMs <= 0) return "Vencido";
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffHours / 24);
    if (diffDays > 1000) return "Por tempo indeterminado";
    if (diffHours < 1) return "Vence em menos de uma hora";
    else if (diffHours < 24) return `Vence em ${Math.floor(diffHours)} horas`;
    else return `Faltam ${diffDays} dias`;
};

export default function DashboardPage() {
    const { user, role, isElder, isServant, congregationId, loading, profileName, isAdminRoleGlobal } = useAuth();
    const router = useRouter();
    const [sharedHistory, setSharedHistory] = useState<any[]>([]);
    const [myAssignments, setMyAssignments] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [stats, setStats] = useState({
        congregations: 0,
        cities: 0,
        maps: 0,
        addresses: 0,
        visits: 0,
        revisits: 0,
        pubs: 0,
        publicWitnessing: 0,
        coverage: 0
    });

    const [pendingMapsCount, setPendingMapsCount] = useState(0);
    const [idleTerritories, setIdleTerritories] = useState<any[]>([]);
    const [cityCompletion, setCityCompletion] = useState<{ cityName: string; percentage: number } | undefined>();
    const [expiringMaps, setExpiringMaps] = useState<{ id: string, title: string, daysLeft: number }[]>([]);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'warning';
    } | null>(null);

    const totalNotifications = pendingMapsCount + expiringMaps.length + (isElder ? idleTerritories.length : 0) + (cityCompletion && cityCompletion.percentage === 100 ? 1 : 0);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
        else if (!loading && user && !congregationId && role !== 'ADMIN') router.push('/sem-congregacao');
    }, [user, loading, congregationId, role, router]);

    useEffect(() => {
        if (!user) return;
        const fetchMyAssignments = async () => {
            if (!user || (!congregationId && role !== 'ADMIN')) return;
            try {
                const userId = user.uid;
                const q = query(
                    collection(db, 'shared_lists'),
                    where('assignedTo', '==', userId)
                );
                const querySnapshot = await getDocs(q);
                const lists = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
                const processedLists: any[] = [];
                lists.forEach((data: any) => {
                    if (data.status !== 'completed' && data.status !== 'archived') {
                        processedLists.push({ ...data, responsibleName: 'Você' });
                    }
                });
                processedLists.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                });
                const expiring = processedLists.filter(l => {
                    const expiresAt = l.expiresAt;
                    if (!expiresAt) return false;
                    const expires = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
                    const now = new Date();
                    const diffMs = expires.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    return diffDays > 0 && diffDays <= 10;
                }).map(l => {
                    const expiresAt = l.expiresAt;
                    const expires = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
                    const now = new Date();
                    const diffMs = expires.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    return { id: l.id, title: l.title || "Cartão de Território", daysLeft: diffDays };
                });
                setExpiringMaps(expiring);
                setMyAssignments(processedLists);
                setPendingMapsCount(processedLists.length);
            } catch (e) {
                console.error("Error fetching my assignments:", e);
            }
        };
        fetchMyAssignments();
    }, [user, isAdminRoleGlobal, congregationId, role]);

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [openMenuId]);

    const roleLabel = role === 'ADMIN' ? 'ADMIN' :
        role === 'ANCIAO' ? 'Superintendente de Serviço' :
            role === 'SERVO' ? 'Servo de Territórios' :
                'Publicador';

    const fetchSharedHistory = useCallback(async () => {
        if (!congregationId && role !== 'ADMIN') return;
        setHistoryLoading(true);
        try {
            const listsRef = collection(db, 'shared_lists');
            let q;
            if (congregationId) {
                q = query(listsRef, where('congregationId', '==', congregationId));
            }
            else if (role !== 'ADMIN') return;
            else q = query(listsRef, limit(100));

            const usersMap: Record<string, string> = {};
            if (user?.uid) usersMap[user.uid] = profileName || "Você";
            if (isElder || isServant || role === 'ADMIN') {
                const usersRef = collection(db, 'users');
                const uQ = congregationId ? query(usersRef, where('congregationId', '==', congregationId)) : query(usersRef, limit(500));
                const usersSnap = await getDocs(uQ);
                usersSnap.forEach(doc => { usersMap[doc.id] = doc.data().name || ""; });
            }

            const querySnapshot = await getDocs(q);
            const lists = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const processedLists = (lists as any[]).map(data => {
                const assignedTo = data.assignedTo;
                const assignedName = data.assignedName;
                return {
                    ...data,
                    responsibleName: (assignedTo && usersMap[assignedTo]) ? usersMap[assignedTo] : (assignedName || 'Não atribuído')
                };
            });

            let filteredLists = [...processedLists];
            if (!isElder && !isServant && role !== 'ADMIN') filteredLists = processedLists.filter(l => l.assignedTo === user?.uid);

            filteredLists.sort((a, b) => {
                const isAActive = a.status !== 'completed' && a.status !== 'archived';
                const isBActive = b.status !== 'completed' && b.status !== 'archived';
                if (isAActive && !isBActive) return -1;
                if (!isAActive && isBActive) return 1;
                const dA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                const dB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                return dB - dA;
            });
            setSharedHistory(filteredLists);
        } catch (err) {
            console.error("Error fetching shared history:", err);
            setHasError(true);
        } finally {
            setHistoryLoading(false);
        }
    }, [congregationId, role, isElder, isServant, user, profileName]);

    useEffect(() => {
        if (!congregationId && role !== 'ADMIN') return;
        const fetchStats = async () => {
            try {
                const targetCong = congregationId;
                const citiesRef = collection(db, 'cities');
                const territoriesRef = collection(db, 'territories');
                const addressesRef = collection(db, 'addresses');
                const pointsRef = collection(db, 'witnessing_points');
                const visitsRef = collection(db, 'visits');
                const historyRef = collection(db, 'shared_lists');

                const qCities = targetCong ? query(citiesRef, where('congregationId', '==', targetCong)) : citiesRef;
                const qTerritories = targetCong ? query(territoriesRef, where('congregationId', '==', targetCong)) : territoriesRef;
                const qAddresses = targetCong
                    ? query(addressesRef, and(where('congregationId', '==', targetCong), where('isActive', '==', true)))
                    : query(addressesRef, where('isActive', '==', true));

                const qPoints = targetCong ? query(pointsRef, where('congregationId', '==', targetCong)) : pointsRef;
                const qVisits = targetCong ? query(visitsRef, where('congregationId', '==', targetCong)) : visitsRef;
                const qHistory = targetCong ? query(historyRef, where('congregationId', '==', targetCong)) : historyRef;

                const [citiesSnap, territoriesSnap, addressesSnap, pointsSnap, visitsSnap, historySnap] = await Promise.all([
                    getDocs(qCities), getDocs(qTerritories), getDocs(qAddresses),
                    getDocs(qPoints), getDocs(qVisits), getDocs(qHistory)
                ]);

                const citiesData = citiesSnap.docs.map(s => ({ id: s.id, ...s.data() })) as any[];
                const territoriesData = territoriesSnap.docs.map(s => ({ id: s.id, ...s.data() })) as any[];
                const cityMap: Record<string, string> = {};
                citiesData.forEach(c => cityMap[c.id] = c.name);
                const validCityIds = new Set(citiesData.map(c => c.id));

                let validTerritories = territoriesData.filter(t => t.cityId && validCityIds.has(t.cityId));
                if (validTerritories.length === 0 && territoriesData.length > 0) validTerritories = territoriesData;

                const latestWorkMap = new Map<string, number>();
                const latestAnyMap = new Map<string, number>();
                historySnap.docs.forEach(s => {
                    const d = s.data();
                    const tId = d.territoryId;
                    if (tId) {
                        const created = d.createdAt?.toDate ? d.createdAt.toDate().getTime() : (d.createdAt ? new Date(d.createdAt).getTime() : 0);
                        const returned = d.returnedAt?.toDate ? d.returnedAt.toDate().getTime() : (d.returnedAt ? new Date(d.returnedAt).getTime() : 0);
                        if (created > (latestAnyMap.get(tId) || 0)) latestAnyMap.set(tId, created);
                        if (returned > (latestWorkMap.get(tId) || 0)) latestWorkMap.set(tId, returned);
                        if (returned > (latestAnyMap.get(tId) || 0)) latestAnyMap.set(tId, returned);
                    }
                });

                const currentYear = getServiceYear();
                const { start: syStart, end: syEnd } = getServiceYearRange(currentYear);
                const idleList: any[] = [];
                let coveredCount = 0;

                validTerritories.forEach((t: any) => {
                    let lastWork = 0;
                    if (t.manualLastCompletedDate) lastWork = t.manualLastCompletedDate.toDate ? t.manualLastCompletedDate.toDate().getTime() : new Date(t.manualLastCompletedDate).getTime();
                    else if (t.lastVisit) lastWork = t.lastVisit.toDate ? t.lastVisit.toDate().getTime() : new Date(t.lastVisit).getTime();
                    const hWork = latestWorkMap.get(t.id) || 0;
                    if (hWork > lastWork) lastWork = hWork;
                    const lwDate = lastWork > 0 ? new Date(lastWork) : null;
                    if (lwDate && lwDate >= syStart && lwDate <= syEnd) coveredCount++;

                    let lastAny = lastWork;
                    const hAny = latestAnyMap.get(t.id) || 0;
                    if (hAny > lastAny) lastAny = hAny;
                    if (!t.assignedTo) {
                        const ago = new Date(); ago.setDate(ago.getDate() - 180);
                        const laDate = lastAny > 0 ? new Date(lastAny) : null;
                        idleList.push({
                            id: t.id,
                            name: t.name || 'Sem Nome',
                            description: t.description || '', // Inclui a descrição (ex: Catiguá)
                            city: cityMap[t.cityId] || 'Cidade Desconhecida',
                            lastVisit: laDate,
                            variant: !laDate ? 'danger' : (laDate < ago ? 'warning' : 'info')
                        });
                    }
                });

                setIdleTerritories(idleList.filter(i => i.variant !== 'info').sort((a, b) => (a.lastVisit?.getTime() || 0) - (b.lastVisit?.getTime() || 0)));
                setStats({
                    congregations: congregationId ? 1 : 0, cities: citiesData.length, maps: validTerritories.length,
                    visits: visitsSnap.size, addresses: addressesSnap.size, publicWitnessing: pointsSnap.size,
                    revisits: 0, pubs: 0, coverage: validTerritories.length > 0 ? Math.floor((coveredCount / validTerritories.length) * 100) : 0
                });
                if (coveredCount >= validTerritories.length && validTerritories.length > 0) setCityCompletion({ cityName: "Território Completo", percentage: 100 });
            } catch (e) { console.error("Stats error:", e); }
        };
        fetchStats();
        fetchSharedHistory();
    }, [congregationId, role, isElder, isServant, user?.uid, fetchSharedHistory]);

    const handleCopyLink = async (id: string) => {
        try { await navigator.clipboard.writeText(window.location.origin + "/share?id=" + id); toast.success("Link copiado!"); }
        catch (err) { toast.error("Erro ao copiar."); }
    };

    const handleShareLink = async (id: string, title?: string) => {
        const url = window.location.origin + "/share?id=" + id;
        if (navigator.share) {
            try { await navigator.share({ title: title || 'Campo Branco', text: 'Acesse o cartão:', url }); }
            catch (err) { if ((err as Error).name !== 'AbortError') console.error(err); }
        } else handleCopyLink(id);
    };

    const handleDeleteShare = async (id: string) => {
        setConfirmModal(null);
        try { await deleteDoc(doc(db, 'shared_lists', id)); toast.success("Cartão removido."); setSharedHistory(prev => prev.filter(item => item.id !== id)); }
        catch (err) { toast.error("Erro ao excluir."); }
    };

    const handleRemoveResponsible = async (id: string) => {
        setConfirmModal(null);
        try {
            await updateDoc(doc(db, 'shared_lists', id), {
                assignedTo: null,
                assignedName: null,
                updatedAt: serverTimestamp()
            });
            fetchSharedHistory();
            toast.success("Responsável removido.");
        }
        catch (err) { toast.error("Erro ao remover."); }
    };

    const SharedHistoryListComponent = ({ title, items, icon: Icon = HistoryIcon }: { title: string, items: any[], icon?: any }) => {
        const isMine = title === 'Meus Cartões';
        const limit = 4;
        const visibleItems = items.slice(0, limit);
        return (
            <div className="bg-surface p-6 rounded-lg shadow-sm border border-surface-border">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-main">{title}</h3>
                    </div>
                    {items.length > limit && (
                        <Link href={`/dashboard/cards?scope=${isMine ? 'mine' : 'managed'}`} className="text-[10px] font-extrabold text-primary uppercase bg-primary-light/50 dark:bg-primary-dark/30 px-3 py-1.5 rounded-full">Ver Tudo</Link>
                    )}
                </div>
                <div className="space-y-3">
                    {items.length === 0 ? (
                        <div className="py-12 text-center border-2 border-dashed border-surface-border rounded-xl bg-background/50">
                            <Icon className="w-8 h-8 text-muted/30 mx-auto mb-3" />
                            <p className="text-xs font-bold text-muted uppercase tracking-widest">Nenhum cartão encontrado</p>
                        </div>
                    ) : (
                        visibleItems.map((list) => (
                            <div key={list.id} className="p-4 rounded-lg bg-background border border-surface-border hover:border-primary/30 transition-colors group relative">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-main text-sm truncate">{list.context?.territoryName || list.title || "Cartão de Território"}</h4>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <User className="w-3 h-3 text-muted" />
                                            <span className="text-[10px] font-bold text-muted truncate">{list.responsibleName || list.assignedName}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 pt-1 flex items-center gap-2">
                                        {list.status === 'completed' ? <span className="bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">Concluído</span> : <span className="bg-primary/20 text-primary text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">Ativo</span>}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-surface-border/10">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-muted" /><span className="text-[10px] text-muted">Início: {formatDate(list.createdAt)}</span></div>
                                        {list.status === 'completed' ? (
                                            <div className="flex items-center gap-1">
                                                <CheckCircleIcon className="w-3 h-3 text-green-500" />
                                                <span className="text-[10px] text-muted">Fim: {formatDate(list.updatedAt || list.createdAt)}</span>
                                            </div>
                                        ) : list.expiresAt && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-orange-400" />
                                                <span className="text-[10px] font-bold">{formatExpirationTime(list.expiresAt)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === list.id ? null : list.id); }} className="p-1.5 text-muted hover:text-main hover:bg-gray-100 rounded-lg transition-colors"><MoreVertical className="w-4 h-4" /></button>
                                        {openMenuId === list.id && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                                                <div className="absolute right-0 top-8 w-52 bg-surface rounded-xl shadow-2xl border border-surface-border p-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                    <DropDownItem 
                                                        icon={ExternalLink} 
                                                        label="Abrir" 
                                                        variant="primary" 
                                                        onClick={() => { window.open("/share?id=" + list.id, "_blank"); setOpenMenuId(null); }} 
                                                    />
                                                    <DropDownItem 
                                                        icon={Copy} 
                                                        label="Copiar Link" 
                                                        variant="neutral" 
                                                        onClick={() => { handleCopyLink(list.id); setOpenMenuId(null); }} 
                                                    />
                                                    {(isElder || isServant || role === 'ADMIN') && (
                                                        <DropDownItem 
                                                            icon={UserMinus} 
                                                            label="Remover Responsável" 
                                                            variant="orange" 
                                                            onClick={() => { setConfirmModal({ title: 'Remover?', message: 'Deseja remover o responsável?', variant: 'warning', onConfirm: () => handleRemoveResponsible(list.id) }); setOpenMenuId(null); }} 
                                                        />
                                                    )}
                                                    <DropDownItem 
                                                        icon={Trash2} 
                                                        label="Excluir Cartão" 
                                                        variant="danger" 
                                                        onClick={() => { setConfirmModal({ title: 'Excluir?', message: 'Deseja excluir o cartão?', variant: 'danger', onConfirm: () => handleDeleteShare(list.id) }); setOpenMenuId(null); }} 
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    };

    if (loading) return null;

    return (
        <div className="bg-background min-h-screen pb-24 font-sans text-main">
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img src="/app-icon.svg" alt="Logo" width="40" height="40" className="object-contain" />
                    <div>
                        <span className="font-bold text-lg text-main block leading-tight">Campo Branco</span>
                        <span className="text-[10px] text-muted font-bold uppercase">Início</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase flex items-center gap-1 ${isElder ? 'bg-indigo-100 text-indigo-700' : isServant ? 'bg-primary-light text-primary' : 'bg-gray-100 text-muted'}`}>
                        <Shield className="w-3 h-3" /> {roleLabel}
                    </span>
                    <Link href="/notifications" className="relative p-1.5 text-muted hover:text-primary transition-colors">
                        <Bell className="w-5 h-5" />
                        {totalNotifications > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-surface">{totalNotifications}</span>}
                    </Link>
                </div>
            </header>

            <main className="px-6 py-6 max-w-xl mx-auto space-y-10">
                <div>
                    <h1 className="text-2xl font-bold text-main tracking-tight">Olá, {(profileName || user?.displayName || user?.email)?.split(' ')[0] || 'Irmão'}</h1>
                    <p className="text-muted text-sm">Aqui está o resumo para sua função.</p>
                </div>

                <section className="space-y-6">
                    <div className="flex items-center gap-2 px-1"><div className="w-1 h-6 bg-primary rounded-full" /><h2 className="text-lg font-bold text-main uppercase text-[12px]">Ministério</h2></div>
                    {(isElder || isServant || role === 'ADMIN') && (
                        <ActionCenter
                            userName={profileName || user?.displayName || user?.email || 'Publicador'}
                            pendingMapsCount={pendingMapsCount}
                            hasPendingAnnotation={false}
                            idleTerritories={idleTerritories}
                            cityCompletion={cityCompletion}
                            expiringMaps={expiringMaps}
                            onAssignTerritory={(t) => router.push(`/share-setup?ids=${t.id}&returnUrl=/dashboard`)}
                            limit={3}
                        />
                    )}
                    <SharedHistoryListComponent title="Meus Cartões" items={myAssignments} icon={User} />
                    <VisitsHistory scope="mine" />
                </section>

                {(isElder || isServant || role === 'ADMIN') && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 px-1"><div className="w-1 h-6 bg-purple-600 rounded-full" /><h2 className="text-lg font-bold text-main uppercase text-[12px]">Gestão de Territórios</h2></div>
                        <SharedHistoryListComponent title="Cartões Enviados" items={sharedHistory.filter(l => l.status !== 'completed' || isElder || isServant).slice(0, 15)} />
                        <VisitsHistory scope="all" />
                    </section>
                )}

                {(isElder || isServant || role === 'ADMIN') && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 px-1"><div className="w-1 h-6 bg-emerald-600 rounded-full" /><h2 className="text-lg font-bold text-main uppercase text-[12px]">A Congregação</h2></div>
                        <div className="grid grid-cols-2 gap-4">
                            {role === 'ADMIN' && !congregationId && (
                                <div className="col-span-2 bg-surface p-4 rounded-lg shadow-sm border border-surface-border"><p className="text-[10px] font-bold text-muted uppercase">CONGREGAÇÕES</p><p className="text-2xl font-bold text-main">{stats.congregations}</p></div>
                            )}
                            <div className="bg-surface p-4 rounded-lg shadow-sm border border-surface-border"><p className="text-[10px] font-bold text-muted uppercase">CIDADES</p><p className="text-2xl font-bold text-main">{stats.cities}</p></div>
                            <div className="bg-surface p-4 rounded-lg shadow-sm border border-surface-border"><p className="text-[10px] font-bold text-muted uppercase">MAPAS</p><p className="text-2xl font-bold text-main">{stats.maps}</p></div>
                            <div className="bg-surface p-4 rounded-lg shadow-sm border border-surface-border"><p className="text-[10px] font-bold text-muted uppercase">ENDEREÇOS</p><p className="text-2xl font-bold text-main">{stats.addresses}</p></div>
                            <div className="bg-surface p-4 rounded-lg shadow-sm border border-surface-border"><p className="text-[10px] font-bold text-muted uppercase">VISITAS</p><p className="text-2xl font-bold text-main">{stats.visits}</p></div>
                            <div className="bg-surface p-4 rounded-lg shadow-sm border border-surface-border"><p className="text-[10px] font-bold text-muted uppercase">COBERTURA</p><p className="text-2xl font-bold text-main">{stats.coverage}%</p></div>
                        </div>
                    </section>
                )}
            </main>

            {confirmModal && (
                <ConfirmationModal
                    isOpen={!!confirmModal}
                    onClose={() => setConfirmModal(null)}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    description={confirmModal.message}
                    variant={confirmModal.variant as any}
                />
            )}
            <BottomNav />
        </div>
    );
}
