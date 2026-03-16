"use client";
// Force rebuild

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
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
    getCountFromServer,
    serverTimestamp,
    deleteDoc,
    updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    Map as MapIcon,
    Home,
    BarChart3,
    User,
    Shield,
    FileText,
    TrendingUp,
    Users,
    Lightbulb,
    CheckCircle,
    AlertCircle,
    Copy,
    Trash2,
    History,
    Loader2,
    Calendar,
    Share2,
    Clock,
    ExternalLink,
    MoreVertical,
    UserMinus,
    Bell,
    CheckCircle2,
    ChevronDown,
    History as HistoryIcon,
    CheckCircle as CheckCircleIcon
} from "lucide-react";
import { toast } from 'sonner';
import { getServiceYear, getServiceYearRange } from "@/lib/serviceYearUtils";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import BottomNav from "@/app/components/BottomNav";
import ActionCenter, { IdleTerritory } from "@/app/components/Dashboard/ActionCenter";
import VisitsHistory from "@/app/components/Dashboard/VisitsHistory";

// --- UTILS ---

const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';

    // Check if it's a Firestore Timestamp and has the toDate method
    const date = typeof dateValue.toDate === 'function' ? dateValue.toDate() : new Date(dateValue);

    // Still invalid date fallback
    if (isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const formatExpirationTime = (expiresAtString: any) => {
    if (!expiresAtString) return "Por tempo indeterminado";

    const expiresAt = new Date(expiresAtString);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();

    if (diffMs <= 0) return "Vencido";

    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffHours / 24);

    if (diffDays > 1000) return "Por tempo indeterminado";

    if (diffHours < 1) {
        return "Vence em menos de uma hora";
    } else if (diffHours < 24) {
        return `Vence em ${Math.floor(diffHours)} horas`;
    } else {
        return `Faltam ${diffDays} dias`;
    }
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

    // Redirect Unassigned Users
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (!loading && user && !congregationId && role !== 'ADMIN') {
            router.push('/sem-congregacao');
        }
    }, [user, loading, congregationId, role, router]);

    // Fetch user's assigned maps
    useEffect(() => {
        if (!user) return;

        const fetchMyAssignments = async () => {
            if (!user || (!congregationId && role !== 'ADMIN')) return;
            try {
                const userId = user.uid;

                const q = query(
                    collection(db, 'shared_lists'),
                    where('assigned_to', '==', userId)
                );

                const querySnapshot = await getDocs(q);
                const lists = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as any));

                const processedLists: any[] = [];
                lists.forEach((data: any) => {
                    if (data.status !== 'completed' && data.status !== 'archived') {
                        processedLists.push({
                            ...data,
                            responsibleName: 'Você'
                        });
                    }
                });

                processedLists.sort((a, b) => {
                    const dateA = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at || 0).getTime();
                    const dateB = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at || 0).getTime();
                    return dateB - dateA;
                });

                const expiring = processedLists.filter(l => {
                    if (!l.expires_at) return false;
                    const expires = l.expires_at?.toDate ? l.expires_at.toDate() : new Date(l.expires_at);
                    const now = new Date();
                    const diffMs = expires.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    return diffDays > 0 && diffDays <= 10;
                }).map(l => {
                    const expires = l.expires_at?.toDate ? l.expires_at.toDate() : new Date(l.expires_at);
                    const now = new Date();
                    const diffMs = expires.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    return {
                        id: l.id,
                        title: l.title || "Cartão de Território",
                        daysLeft: diffDays
                    };
                });

                setExpiringMaps(expiring);
                setMyAssignments(processedLists);
                setPendingMapsCount(processedLists.length);
            } catch (e) {
                console.error("Error fetching my assignments:", e);
            }
        };

        fetchMyAssignments();

    }, [user, isAdminRoleGlobal]);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) {
            window.addEventListener('click', handleClickOutside);
        }
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
            } else if (role !== 'ADMIN') {
                return;
            } else {
                q = query(listsRef, limit(100));
            }

            const usersMap: Record<string, string> = {};
            try {
                const usersRef = collection(db, 'users');
                let uQ;
                if (congregationId) {
                    uQ = query(usersRef, where('congregationId', '==', congregationId));
                } else {
                    uQ = query(usersRef, limit(500));
                }
                const usersSnap = await getDocs(uQ);
                usersSnap.forEach(doc => {
                    const data = doc.data();
                    usersMap[doc.id] = data.name || "";
                });
            } catch (e) {
                console.warn("Error fetching users map:", e);
            }

            const querySnapshot = await getDocs(q);
            const lists = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const processedLists: any[] = [];
            for (const data of lists as any[]) {
                let responsible = 'Não atribuído';
                const assignedTo = data.assigned_to || data.assignedTo;
                if (assignedTo && usersMap[assignedTo]) {
                    responsible = usersMap[assignedTo];
                } else {
                    responsible = data.assigned_name || data.assignedName || 'Não atribuído';
                }

                processedLists.push({
                    ...data,
                    responsibleName: responsible
                });
            }

            let filteredLists = [...processedLists];
            if (!isElder && !isServant && role !== 'ADMIN') {
                filteredLists = processedLists.filter(l => (l.assigned_to || l.assignedTo) === user?.uid);
            }

            filteredLists.sort((a, b) => {
                const isAActive = a.status !== 'completed' && a.status !== 'archived';
                const isBActive = b.status !== 'completed' && b.status !== 'archived';
                if (isAActive && !isBActive) return -1;
                if (!isAActive && isBActive) return 1;

                const dateA = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at || 0).getTime();
                const dateB = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at || 0).getTime();
                return dateB - dateA;
            });

            setSharedHistory(filteredLists);
        } catch (err) {
            console.error("Error fetching shared history:", err);
            setHasError(true);
        } finally {
            setHistoryLoading(false);
        }
    }, [congregationId, role, isElder, isServant, user]);

    // Safety Timeout for Dashboard
    useEffect(() => {
        if (!historyLoading) return;

        const timer = setTimeout(() => {
            if (historyLoading) {
                console.warn("Dashboard fetch timed out");
                setHasError(true);
                setHistoryLoading(false);
            }
        }, 15000); // 15 seconds for dashboard (more complex)

        return () => clearTimeout(timer);
    }, [historyLoading]);

    useEffect(() => {
        if (!user || sharedHistory.length === 0) return;

        const checkNotifications = async () => {
            try {
                const templatesRef = collection(db, 'notification_templates');
                const q = query(templatesRef, where('isActive', '==', true));
                const querySnapshot = await getDocs(q);

                const templates: Record<string, any> = {};
                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    if (data.slug) {
                        templates[data.slug] = data;
                    }
                });

                const now = new Date();
                const trigger = (slug: string, uniqueKey: string) => {
                    const storageKey = `notified_${slug}_${uniqueKey}`;
                    if (localStorage.getItem(storageKey)) return;

                    const tpl = templates[slug];
                    if (tpl && Notification.permission === 'granted') {
                        new Notification(tpl.title, {
                            body: tpl.body,
                            icon: "/app-icon.png"
                        });
                        localStorage.setItem(storageKey, new Date().toISOString());
                    }
                };

                const myActiveLists = sharedHistory.filter(l => {
                    const userId = user?.uid;
                    const isAssigned = (l.assigned_to || l.assignedTo) === userId || (l.created_by || l.createdBy) === userId;
                    return isAssigned && l.status === 'active';
                });

                myActiveLists.forEach(list => {
                    const createdAt = list.created_at?.toDate ? list.created_at.toDate() : (list.created_at ? new Date(list.created_at) : null);
                    if (!createdAt) return;

                    const diffMs = now.getTime() - createdAt.getTime();
                    const diffDays = diffMs / (1000 * 60 * 60 * 24);
                    const diffHours = diffMs / (1000 * 60 * 60);

                    if (diffHours < 24) {
                        trigger('map_assigned', list.id);
                        trigger('encourage_finish', list.id);
                    }
                    if (diffDays >= 6 && diffDays <= 8) {
                        trigger('encourage_1week', list.id);
                    }
                    if (diffDays >= 13 && diffDays <= 15) {
                        trigger('encourage_2weeks', list.id);
                    }

                    if (list.expires_at || list.expiresAt) {
                        const expires = (list.expiresAt?.toDate ? list.expiresAt.toDate() : (list.expires_at ? new Date(list.expires_at) : null));
                        if (expires && expires > now && (expires.getTime() - now.getTime()) < (24 * 60 * 60 * 1000)) {
                            trigger('link_expiration', list.id);
                        }
                    }
                });

            } catch (error) {
                console.error("Error checking notifications:", error);
            }
        };

        const timer = setTimeout(checkNotifications, 3000);
        return () => clearTimeout(timer);
    }, [user, sharedHistory, profileName]);

    useEffect(() => {
        if (!congregationId && role !== 'ADMIN') return;

        const fetchStats = async () => {
            try {
                if (!congregationId && role !== 'ADMIN') return;
                const targetCong = congregationId;

                const citiesRef = collection(db, 'cities');
                const territoriesRef = collection(db, 'territories');
                const addressesRef = collection(db, 'addresses');
                const pointsRef = collection(db, 'witnessing_points');
                const visitsRef = collection(db, 'visits');
                const historyRef = collection(db, 'shared_lists');

                const qCities = targetCong ? query(citiesRef, where('congregationId', '==', targetCong)) : citiesRef;
                const qTerritories = targetCong ? query(territoriesRef, where('congregationId', '==', targetCong)) : territoriesRef;
                const qAddresses = targetCong ? query(addressesRef, where('congregationId', '==', targetCong), where('isActive', '==', true)) : query(addressesRef, where('isActive', '==', true));
                const qPoints = targetCong ? query(pointsRef, where('congregationId', '==', targetCong)) : pointsRef;
                const qVisits = targetCong ? query(visitsRef, where('congregationId', '==', targetCong)) : visitsRef;
                const qHistory = targetCong ? query(historyRef, where('congregationId', '==', targetCong)) : historyRef;

                const [
                    citiesSnap,
                    territoriesSnap,
                    addressesCountSnap,
                    pointsCountSnap,
                    visitsCountSnap,
                    historySnap
                ] = await Promise.all([
                    getDocs(qCities),
                    getDocs(qTerritories),
                    getCountFromServer(qAddresses),
                    getCountFromServer(qPoints),
                    getCountFromServer(qVisits),
                    getDocs(qHistory)
                ]);

                const citiesData = citiesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as any[];
                const territoriesData = territoriesSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as any[];
                const addressesCount = addressesCountSnap.data().count;
                const pointsCount = pointsCountSnap.data().count;
                const visitsCount = visitsCountSnap.data().count;
                const historyData = historySnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as any[];

                // 1. Validate Cities
                const validCityIds = new Set(citiesData?.map(c => c.id) || []);
                const cityMap: Record<string, string> = {};
                citiesData?.forEach(c => cityMap[c.id] = c.name);

                // 2. Validate Territories
                const validTerritories = territoriesData?.filter(t => t.city_id && validCityIds.has(t.city_id)) || [];
                const validTerritoryIds = new Set(validTerritories.map(t => t.id));

                // 3. Process History for Coverage
                const latestWorkMap = new Map<string, number>();
                const latestAnyActivityMap = new Map<string, number>();

                if (historyData) {
                    historyData.forEach((data: any) => {
                        const territoryId = data.territoryId || data.territory_id;
                        if (territoryId && validTerritoryIds.has(territoryId)) {
                            const created = data.created_at?.toDate ? data.created_at.toDate().getTime() : (data.created_at ? new Date(data.created_at).getTime() : 0);
                            const returned = data.returned_at?.toDate ? data.returned_at.toDate().getTime() : (data.returned_at ? new Date(data.returned_at).getTime() : 0);

                            if (created > (latestAnyActivityMap.get(territoryId) || 0)) latestAnyActivityMap.set(territoryId, created);
                            if (returned > (latestWorkMap.get(territoryId) || 0)) latestWorkMap.set(territoryId, returned);
                            if (returned > (latestAnyActivityMap.get(territoryId) || 0)) latestAnyActivityMap.set(territoryId, returned);
                        }
                    });
                }

                // Calculate Coverage and Idle Lists
                const currentYear = getServiceYear();
                const { start: syStart, end: syEnd } = getServiceYearRange(currentYear);
                const idleList: any[] = [];
                let coveredCount = 0;

                validTerritories.forEach((data: any) => {
                    let lastWork = 0;
                    const manualLast = data.manualLastCompletedDate || data.manual_last_completed_date;
                    if (manualLast) lastWork = manualLast?.toDate ? manualLast.toDate().getTime() : new Date(manualLast).getTime();

                    const lastVisitField = data.lastVisit || data.last_visit;
                    if (lastVisitField && !lastWork) lastWork = lastVisitField?.toDate ? lastVisitField.toDate().getTime() : new Date(lastVisitField).getTime();

                    const historyWork = latestWorkMap.get(data.id) || 0;
                    if (historyWork > lastWork) lastWork = historyWork;

                    const lastWorkDate = lastWork > 0 ? new Date(lastWork) : null;
                    if (lastWorkDate && lastWorkDate >= syStart && lastWorkDate <= syEnd) {
                        coveredCount++;
                    }

                    let lastAny = lastWork;
                    const historyAny = latestAnyActivityMap.get(data.id) || 0;
                    if (historyAny > lastAny) lastAny = historyAny;

                    const cityId = data.cityId || data.city_id;
                    const lastAnyDate = lastAny > 0 ? new Date(lastAny) : null;
                    const cityName = (cityId && cityMap[cityId]) || 'Cidade Desconhecida';

                    if (data.assigned_to || data.assignedTo) return;

                    const rollingYearAgo = new Date();
                    rollingYearAgo.setDate(rollingYearAgo.getDate() - 180);

                    if (!lastAnyDate) {
                        idleList.push({
                            id: data.id,
                            name: data.name || 'Sem Nome',
                            description: data.notes || '',
                            city: cityName,
                            city_id: data.city_id,
                            lastVisit: null,
                            variant: 'danger'
                        });
                    } else if (lastAnyDate < rollingYearAgo) {
                        idleList.push({
                            id: data.id,
                            name: data.name || 'Sem Nome',
                            description: data.notes || '',
                            city: cityName,
                            city_id: data.city_id,
                            lastVisit: lastAnyDate,
                            variant: 'warning'
                        });
                    }
                });

                const mapsCount = validTerritories.length;
                let coverageVal = mapsCount > 0 ? Math.floor((coveredCount / mapsCount) * 100) : 0;

                idleList.sort((a, b) => {
                    if (!a.lastVisit && !b.lastVisit) return 0;
                    if (!a.lastVisit) return -1;
                    if (!b.lastVisit) return 1;
                    return a.lastVisit.getTime() - b.lastVisit.getTime();
                });

                setIdleTerritories(idleList);
                if (coverageVal >= 100 && mapsCount > 0) {
                    setCityCompletion({ cityName: "Território Completo", percentage: 100 });
                } else {
                    setCityCompletion(undefined);
                }

                setStats({
                    congregations: (role === 'ADMIN' && !congregationId) ? 0 : 1, // simplified
                    cities: citiesData?.length || 0,
                    maps: mapsCount,
                    visits: visitsCount || 0,
                    addresses: addressesCount || 0,
                    publicWitnessing: pointsCount || 0,
                    revisits: 0,
                    pubs: 0,
                    coverage: Math.floor(coverageVal)
                });

            } catch (error) {
                console.error("Critical Error fetching stats:", error);
            }
        };

        fetchStats();
        fetchSharedHistory();
    }, [congregationId, role, isElder, isServant, profileName, user?.uid, fetchSharedHistory]);

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
                if ((err as Error).name !== 'AbortError') {
                    console.error("Error sharing:", err);
                }
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
        try {
            const docRef = doc(db, 'shared_lists', id);
            await deleteDoc(docRef);
            toast.success("Cartão removido do histórico.");
            setSharedHistory(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            console.error("Error deleting share:", err);
            toast.error("Erro ao excluir cartão.");
        }
    };

    const handleRemoveResponsible = async (id: string) => {
        setConfirmModal(null);
        try {
            const docRef = doc(db, 'shared_lists', id);
            await updateDoc(docRef, {
                assigned_to: null,
                assignedTo: null,
                assigned_name: null,
                assignedName: null,
                updatedAt: serverTimestamp()
            });
            fetchSharedHistory();
            setMyAssignments(prev => prev.filter(item => item.id !== id));
            toast.success("Responsável removido.");
        } catch (err) {
            console.error("Error removing responsible:", err);
            toast.error("Erro ao remover responsável.");
        }
    };

    const handleQuickAssign = async (territory: any) => {
        router.push(`/share-setup?ids=${territory.id}&returnUrl=/dashboard`);
    };

    // --- HELPER COMPONENTS ---

    const SharedHistoryListComponent = ({ title, items, icon: Icon = HistoryIcon }: { title: string, items: any[], icon?: any }) => {
        const isMine = title === 'Meus Cartões';
        const targetLink = `/dashboard/cards?scope=${isMine ? 'mine' : 'managed'}`;
        const limit = 4;
        const visibleItems = items.slice(0, limit);
        const hasMore = items.length > limit;

        return (
            <div className="bg-surface p-6 rounded-lg shadow-sm border border-surface-border">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-main">{title}</h3>
                    </div>
                    {hasMore && (
                        <Link
                            href={targetLink}
                            className="text-[10px] font-extrabold text-primary uppercase tracking-widest hover:text-primary-dark transition-colors bg-primary-light/50 dark:bg-primary-dark/30 px-3 py-1.5 rounded-full"
                        >
                            Ver Tudo
                        </Link>
                    )}
                </div>

                {historyLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : hasError ? (
                    <div className="text-center py-6 flex flex-col items-center">
                        <AlertCircle className="w-8 h-8 text-orange-400 mb-2" />
                        <p className="text-sm font-bold text-main">Falha ao carregar.</p>
                        <button
                            onClick={() => {
                                setHasError(false);
                                setHistoryLoading(true);
                                fetchSharedHistory();
                            }}
                            className="mt-2 text-[10px] font-bold text-primary uppercase tracking-widest bg-primary-light/50 px-3 py-1.5 rounded-full"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-6 opacity-50">
                        <p className="text-sm text-muted">Nenhum cartão encontrado.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visibleItems.map((list) => (
                            <div key={list.id} className="p-4 rounded-lg bg-background border border-surface-border hover:border-primary/30 dark:hover:border-primary-dark/50 transition-colors group relative">
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
                                            <span className="bg-primary/20 dark:bg-primary-dark/40 text-primary dark:text-primary-light text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider border border-primary/10">Ativo</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-surface-border/10">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-muted" />
                                            <span className="text-[10px] text-muted font-medium">Início: {formatDate(list.created_at || list.createdAt)}</span>
                                        </div>
                                        {list.status === 'completed' && list.returned_at ? (
                                            <div className="flex items-center gap-1">
                                                <CheckCircleIcon className="w-3 h-3 text-green-600" />
                                                <span className="text-[10px] text-muted font-medium">Conclusão: {formatDate(list.returned_at)}</span>
                                            </div>
                                        ) : (
                                            list.status !== 'completed' && list.expires_at && formatExpirationTime(list.expires_at) && (
                                                <div className="flex items-center gap-1" title="Data de expiração">
                                                    <Clock className="w-3 h-3 text-orange-400" />
                                                    <span className={`text-[10px] font-bold ${(list.expires_at && (new Date(list.expires_at).getTime() - Date.now()) < 5 * 24 * 60 * 60 * 1000)
                                                        ? 'text-red-500 dark:text-red-400'
                                                        : 'text-orange-500 dark:text-orange-400'
                                                        }`}>
                                                        {formatExpirationTime(list.expires_at)}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === list.id ? null : list.id);
                                            }}
                                            className="p-1.5 text-muted hover:text-main hover:bg-surface rounded-lg transition-all shadow-sm"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {openMenuId === list.id && (
                                            <div className="absolute right-0 top-8 w-48 bg-surface rounded-lg shadow-xl border border-surface-border py-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                                                <button
                                                    onClick={() => {
                                                        handleOpenLink(list.id);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-main hover:bg-primary-light/50 dark:hover:bg-primary-dark/30 hover:text-primary dark:hover:text-primary-light flex items-center gap-2 transition-colors border-b border-surface-border"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    Abrir Link
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleCopyLink(list.id);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-main hover:bg-primary-light/50 dark:hover:bg-primary-dark/30 hover:text-primary dark:hover:text-primary-light flex items-center gap-2 transition-colors border-b border-surface-border"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                    Copiar Link
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleShareLink(list.id, list.title);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-main hover:bg-primary-light/50 dark:hover:bg-primary-dark/30 hover:text-primary dark:hover:text-primary-light flex items-center gap-2 transition-colors border-b border-surface-border"
                                                >
                                                    <Share2 className="w-3.5 h-3.5" />
                                                    Enviar Link
                                                </button>
                                                {(isElder || isServant || role === 'ADMIN') && (
                                                    <button
                                                        onClick={() => {
                                                            setConfirmModal({
                                                                title: 'Remover Responsável?',
                                                                message: 'Tem certeza que deseja remover o responsável deste cartão?',
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
            </div>
        );
    };

    if (loading) return null;

    return (
        <div className="bg-background min-h-screen pb-24 font-sans text-main">
            {/* Header */}
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-transparent p-0 rounded-lg">
                        <Image src="/app-icon.svg" alt="Logo" width={40} height={40} className="object-contain drop-shadow-md" priority />
                    </div>
                    <div>
                        <span className="font-bold text-lg text-main tracking-tight block leading-tight">Campo Branco</span>
                        <span className="text-[10px] text-muted font-bold uppercase tracking-widest">Início</span>
                    </div>
                </div>

                {/* Role Badge & Help */}
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1
                        ${isElder ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' :
                            isServant ? 'bg-primary-light/50 dark:bg-primary-dark/30 text-primary dark:text-primary-light' :
                                'bg-gray-100 dark:bg-gray-800 text-muted'}
                    `}>
                        <Shield className="w-3 h-3" />
                        {roleLabel}
                    </span>

                    <Link
                        href="/notifications"
                        className="relative p-1.5 text-muted hover:text-primary hover:bg-primary-light/50 dark:hover:bg-primary-dark/30 rounded-full transition-colors"
                        title="Notificações"
                    >
                        <Bell className="w-5 h-5" />
                        {totalNotifications > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-surface">
                                {totalNotifications}
                            </span>
                        )}
                    </Link>
                </div>
            </header>

            <main className="px-6 py-6 max-w-xl mx-auto space-y-10">
                {/* Greeting */}
                <div>
                    <h1 className="text-2xl font-bold text-main tracking-tight">
                        Olá, {(profileName || user?.displayName || user?.email)?.split(' ')[0] || 'Irmão'}
                    </h1>
                    <p className="text-muted text-sm">
                        Aqui está o resumo para sua função.
                    </p>
                </div>

                {/* SECTION 1: MINISTÉRIO */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-1 h-6 bg-primary rounded-full" />
                        <h2 className="text-lg font-bold text-main tracking-tight uppercase text-[12px]">Ministério</h2>
                    </div>

                    {(isElder || isServant || role === 'ADMIN') && (
                        <ActionCenter
                            userName={profileName || user?.displayName || user?.email || 'Publicador'}
                            pendingMapsCount={pendingMapsCount}
                            hasPendingAnnotation={false}
                            idleTerritories={isElder || isServant || role === 'ADMIN' ? idleTerritories : []}
                            cityCompletion={cityCompletion}
                            expiringMaps={expiringMaps}
                            onAssignTerritory={handleQuickAssign}
                            limit={3}
                        />
                    )}

                    <SharedHistoryListComponent
                        title="Meus Cartões"
                        items={myAssignments}
                        icon={User}
                    />

                    <VisitsHistory scope="mine" />
                </section>

                {/* SECTION 2: GESTÃO DE TERRITÓRIOS */}
                {(isElder || isServant || role === 'ADMIN') && (
                    <section className="space-y-6">
                        <div className="flex items-center gap-2 px-1">
                            <div className="w-1 h-6 bg-purple-600 rounded-full" />
                            <h2 className="text-lg font-bold text-main tracking-tight uppercase text-[12px]">Gestão de Territórios</h2>
                        </div>

                        <SharedHistoryListComponent
                            title="Cartões Enviados"
                            items={sharedHistory.filter(l => l.status !== 'completed' || isElder || isServant).slice(0, 15)}
                        />

                        <VisitsHistory scope="all" />
                    </section>
                )}

                {/* SECTION 3: A CONGREGAÇÃO */}
                {(isElder || isServant || role === 'ADMIN') && (
                    <section className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                                <h2 className="text-lg font-bold text-main tracking-tight uppercase text-[12px]">A Congregação</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {role === 'ADMIN' && !congregationId && (
                                <div className="col-span-2 bg-surface p-4 rounded-lg shadow-sm border border-surface-border flex flex-col justify-center">
                                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest line-clamp-1">CONGREGAÇÕES</p>
                                    <p className="text-2xl font-bold text-main">{stats.congregations}</p>
                                </div>
                            )}
                            <div className="bg-surface p-4 rounded-lg shadow-sm border border-surface-border flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">CIDADES</p>
                                <p className="text-2xl font-bold text-main">{stats.cities}</p>
                            </div>
                            <div className="bg-surface p-4 rounded-lg shadow-sm border border-surface-border flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">MAPAS</p>
                                <p className="text-2xl font-bold text-main">{stats.maps}</p>
                            </div>
                            <div className="bg-surface p-4 rounded-lg shadow-sm border border-surface-border flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">ENDEREÇOS</p>
                                <p className="text-2xl font-bold text-main">{stats.addresses}</p>
                            </div>
                            <div className="bg-surface p-4 rounded-lg shadow-sm border border-surface-border flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">VISITAS</p>
                                <p className="text-2xl font-bold text-main">{stats.visits}</p>
                            </div>
                            <div className="bg-surface p-4 rounded-lg shadow-sm border border-surface-border flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">T. PÚBLICO</p>
                                <p className="text-2xl font-bold text-main">{stats.publicWitnessing || 0}</p>
                            </div>
                            <div className="bg-surface p-4 rounded-lg shadow-sm border border-surface-border flex flex-col justify-center">
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest leading-tight mb-1">COBERTURA</p>
                                <p className="text-2xl font-bold text-main">{stats.coverage}%</p>
                            </div>
                        </div>
                    </section>
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
