"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    limit,
    or
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft } from "lucide-react";
import { useRouter } from 'next/navigation';
import ActionCenter, { IdleTerritory, DoNotVisitAddress } from "@/app/components/Dashboard/ActionCenter";
import { ActionCenterSkeleton, NotificationsPageSkeleton } from "@/app/components/Skeleton";
import { useTranslation } from "@/app/context/I18nContext";

export default function NotificationsPage() {
    const { t } = useTranslation();
    const { user, role, isElder, isServant, congregationId, loading, profileName } = useAuth();
    const router = useRouter();

    // State mirroring Dashboard
    const [pendingMapsCount, setPendingMapsCount] = useState(0);
    const [idleTerritories, setIdleTerritories] = useState<{ id: string; name: string; city: string; lastVisit?: any }[]>([]);
    const [doNotVisitAddresses, setDoNotVisitAddresses] = useState<DoNotVisitAddress[]>([]);
    const [cityCompletion, setCityCompletion] = useState<{ cityName: string; percentage: number } | undefined>();
    const [expiringMaps, setExpiringMaps] = useState<{ id: string, title: string, daysLeft: number }[]>([]);
    const [assignmentsLoading, setAssignmentsLoading] = useState(true);
    const [congregationDataLoading, setCongregationDataLoading] = useState(true);

    // 1. Fetch User Assignments (Pending & Expiring)
    useEffect(() => {
        if (loading) return;
        if (!user) {
            setAssignmentsLoading(false);
            return;
        }
        const fetchAssignments = async () => {
            setAssignmentsLoading(true);
            try {
                const listsRef = collection(db, 'shared_lists');
                const q = query(
                    listsRef,
                    where('assignedTo', '==', user.uid)
                );

                const querySnapshot = await getDocs(q);
                const lists = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter((l: any) => l.status !== 'completed' && l.status !== 'archived');

                setPendingMapsCount(lists.length);

                const expiring = lists.filter((l: any) => {
                    if (!l.expiresAt) return false;
                    const expires = new Date(l.expiresAt);
                    const now = new Date();
                    const diffMs = expires.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    return diffDays > 0 && diffDays <= 10;
                }).map((l: any) => {
                    const expires = new Date(l.expiresAt);
                    const now = new Date();
                    const diffMs = expires.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    return {
                        id: l.id,
                        title: l.title || t('dashboard.territoryCardFallback'),
                        daysLeft: diffDays
                    };
                });
                setExpiringMaps(expiring);
            } catch (e) {
                console.error(e);
            } finally {
                setAssignmentsLoading(false);
            }
        };
        fetchAssignments();
    }, [user, loading]);

    // 2. Fetch Idle Territories & Stats (Simplified for notifications)
    useEffect(() => {
        if (loading) return;
        if (!congregationId || !(isElder || isServant || role === 'ADMIN')) {
            setCongregationDataLoading(false);
            return;
        }

        const fetchIdleAndCompletion = async () => {
            setCongregationDataLoading(true);
            try {
                // Fetch Territories - restricted to congregation
                const terrRef = collection(db, 'territories');
                const qTerr = query(terrRef, where('congregationId', '==', congregationId));
                const terrSnap = await getDocs(qTerr);
                const territories = terrSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const mapsCount = territories.length || 0;
                const cityMap: Record<string, string> = {};

                if (mapsCount > 0) {
                    // 1. Get ALL shared lists history - restricted to congregation
                    const listsRef = collection(db, 'shared_lists');
                    const qLists = query(listsRef, where('congregationId', '==', congregationId));
                    const listsSnap = await getDocs(qLists);
                    const history = listsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

                    // Map History Dates
                    const latestActivityMap = new Map<string, number>();
                    const workedMapIds = new Set<string>();

                    history?.forEach(item => {
                        const datesToCheck: number[] = [];
                        const createdAt = item.createdAt;
                        const returnedAt = item.returnedAt;

                        if (createdAt) {
                            const d = createdAt.toDate ? createdAt.toDate().getTime() : new Date(createdAt).getTime();
                            datesToCheck.push(d);
                        }
                        if (returnedAt) {
                            const d = returnedAt.toDate ? returnedAt.toDate().getTime() : new Date(returnedAt).getTime();
                            datesToCheck.push(d);
                        }

                        const maxDate = datesToCheck.length > 0 ? Math.max(...datesToCheck) : 0;

                        const updateMap = (id: string) => {
                            const current = latestActivityMap.get(id) || 0;
                            if (maxDate > current) latestActivityMap.set(id, maxDate);
                        };

                        // Support both single territory and collections (items array)
                        const tId = item.territoryId;
                        if (tId) updateMap(tId);
                        if (item.items && Array.isArray(item.items)) {
                            item.items.forEach((id: string) => updateMap(id));
                        }

                        if (item.status === 'completed') {
                            if (tId) workedMapIds.add(tId);
                            if (item.items && Array.isArray(item.items)) {
                                item.items.forEach((id: string) => workedMapIds.add(id));
                            }
                        }
                    });

                    // Fetch Cities for names - restricted to congregation
                    const citiesRef = collection(db, 'cities');
                    const qCities = query(citiesRef, where('congregationId', '==', congregationId));
                    const citiesSnap = await getDocs(qCities);

                    citiesSnap.docs.forEach(docSnap => {
                        const c = docSnap.data();
                        if (c.name) cityMap[docSnap.id] = c.name;
                    });

                    const now = new Date();
                    const oneYearAgo = new Date();
                    oneYearAgo.setFullYear(now.getFullYear() - 1);

                    const idleList: any[] = [];

                    territories.forEach((t: any) => {
                        if (t.status === 'ASSIGNED' || t.status === 'OCUPADO') return;

                        const historyActivity = latestActivityMap.get(t.id) || 0;
                        const lastActivityDate = historyActivity > 0 ? new Date(historyActivity) : null;
                        const cityName = cityMap[t.cityId] || t.city || t('notifications.unknownCity');

                        if (!lastActivityDate) {
                            idleList.push({
                                id: t.id,
                                name: t.name || t('notifications.unnamed'),
                                description: t.notes || '',
                                city: cityName,
                                cityId: t.cityId,
                                congregationId: t.congregationId,
                                lastVisit: null,
                                variant: 'danger'
                            });
                        } else if (lastActivityDate < oneYearAgo) {
                            idleList.push({
                                id: t.id,
                                name: t.name || t('notifications.unnamed'),
                                description: t.notes || '',
                                city: cityName,
                                cityId: t.cityId,
                                congregationId: t.congregationId,
                                lastVisit: lastActivityDate,
                                variant: 'warning'
                            });
                        }
                    });

                    idleList.sort((a, b) => {
                        if (!a.lastVisit && !b.lastVisit) return 0;
                        if (!a.lastVisit) return -1;
                        if (!b.lastVisit) return 1;
                        return a.lastVisit.getTime() - b.lastVisit.getTime();
                    });
                    setIdleTerritories(idleList);

                    const coverageVal = (workedMapIds.size / mapsCount) * 100;
                    if (coverageVal >= 100) {
                        setCityCompletion({ cityName: t('notifications.completeTerritory'), percentage: 100 });
                    }
                }

                // 2. Fetch Do Not Visit addresses for congregation
                const addrRef = collection(db, 'addresses');
                const qDnv = query(addrRef, where('congregationId', '==', congregationId), where('visitStatus', '==', 'doNotVisit'));
                const dnvSnap = await getDocs(qDnv);

                const territoryMap: Record<string, { name: string; description: string; cityId: string }> = {};
                territories.forEach((t: any) => {
                    territoryMap[t.id] = { name: t.name || '', description: t.notes || t.description || '', cityId: t.cityId || '' };
                });

                const dnvList: DoNotVisitAddress[] = dnvSnap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() as any }))
                    .filter(addr => addr.isActive !== false)
                    .map(addr => {
                        const terr = territoryMap[addr.territoryId];
                        return {
                            id: addr.id,
                            street: addr.street || t('notifications.addressFallback'),
                            number: addr.number || 'S/N',
                            neighborhood: addr.neighborhood || '',
                            territoryId: addr.territoryId || '',
                            territoryName: terr ? (terr.description ? `${terr.name} • ${terr.description}` : terr.name) : '',
                            cityId: terr?.cityId || '',
                            city: terr?.cityId ? (cityMap[terr.cityId] || '') : '',
                            congregationId: addr.congregationId || congregationId || '',
                            observations: addr.observations || addr.notes || '',
                            markedAt: addr.lastVisitedAt || null
                        };
                    });

                setDoNotVisitAddresses(dnvList);
            } catch (e) {
                console.error(e);
            } finally {
                setCongregationDataLoading(false);
            }
        };

        fetchIdleAndCompletion();
    }, [congregationId, role, isElder, isServant, loading]);

    const handleQuickAssign = async (territory: IdleTerritory) => {
        router.push(`/share-setup?ids=${territory.id}&returnUrl=/notifications`);
    };

    if (loading) return <NotificationsPageSkeleton />;

    return (
        <div className="bg-background min-h-screen pb-24 font-sans text-main">
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-main" />
                </button>
                <h1 className="font-bold text-lg text-main tracking-tight">{t('notifications.title')}</h1>
            </header>

            <main className="px-6 py-6 max-w-xl mx-auto">
                {assignmentsLoading || congregationDataLoading ? (
                    <ActionCenterSkeleton cards={5} />
                ) : (
                    <ActionCenter
                        userName={profileName || 'Publicador'}
                        pendingMapsCount={pendingMapsCount}
                        hasPendingAnnotation={false}
                        doNotVisitAddresses={isElder || isServant || role === 'ADMIN' ? doNotVisitAddresses : []}
                        idleTerritories={isElder || isServant || role === 'ADMIN' ? idleTerritories : []}
                        cityCompletion={cityCompletion}
                        expiringMaps={expiringMaps}
                        onAssignTerritory={handleQuickAssign}
                        onReviewDoNotVisit={(addr) => {
                            if (addr.territoryId) {
                                const params = new URLSearchParams();
                                if (addr.congregationId) params.set('congregationId', addr.congregationId);
                                if (addr.cityId) params.set('cityId', addr.cityId);
                                params.set('territoryId', addr.territoryId);
                                params.set('highlight', addr.id);
                                router.push(`/my-maps/address?${params.toString()}`);
                            } else {
                                router.push('/my-maps');
                            }
                        }}
                    // No limit here
                    />
                )}
            </main>
        </div>
    );
}
