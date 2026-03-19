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
import ActionCenter, { IdleTerritory } from "@/app/components/Dashboard/ActionCenter";

export default function NotificationsPage() {
    const { user, role, isElder, isServant, congregationId, loading, profileName } = useAuth();
    const router = useRouter();

    // State mirroring Dashboard
    const [pendingMapsCount, setPendingMapsCount] = useState(0);
    const [idleTerritories, setIdleTerritories] = useState<{ id: string; name: string; city: string; lastVisit?: any }[]>([]);
    const [cityCompletion, setCityCompletion] = useState<{ cityName: string; percentage: number } | undefined>();
    const [expiringMaps, setExpiringMaps] = useState<{ id: string, title: string, daysLeft: number }[]>([]);

    // 1. Fetch User Assignments (Pending & Expiring)
    useEffect(() => {
        if (!user) return;
        const fetchAssignments = async () => {
            try {
                const listsRef = collection(db, 'shared_lists');
                const q = query(
                    listsRef,
                    or(
                        where('assignedTo', '==', user.uid),
                        where('assigned_to', '==', user.uid)
                    )
                );

                const querySnapshot = await getDocs(q);
                const lists = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter((l: any) => l.status !== 'completed' && l.status !== 'archived');

                setPendingMapsCount(lists.length);

                const expiring = lists.filter((l: any) => {
                    if (!l.expiresAt && !l.expires_at) return false;
                    const expires = new Date(l.expiresAt || l.expires_at);
                    const now = new Date();
                    const diffMs = expires.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    return diffDays > 0 && diffDays <= 10;
                }).map((l: any) => {
                    const expires = new Date(l.expiresAt || l.expires_at);
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
            } catch (e) { console.error(e); }
        };
        fetchAssignments();
    }, [user]);

    // 2. Fetch Idle Territories & Stats (Simplified for notifications)
    useEffect(() => {
        if (!congregationId) return; // Always require congregationId now

        const fetchIdleAndCompletion = async () => {
            try {
                // Fetch Territories - restricted to congregation
                const terrRef = collection(db, 'territories');
                const qTerr = query(terrRef, or(
                    where('congregationId', '==', congregationId),
                    where('congregation_id', '==', congregationId)
                ));
                const terrSnap = await getDocs(qTerr);
                const territories = terrSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const mapsCount = territories.length || 0;

                if (mapsCount > 0) {
                    // 1. Get ALL shared lists history - restricted to congregation
                    const listsRef = collection(db, 'shared_lists');
                    const qLists = query(listsRef, or(
                        where('congregationId', '==', congregationId),
                        where('congregation_id', '==', congregationId)
                    ));
                    const listsSnap = await getDocs(qLists);
                    const history = listsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

                    // Map History Dates
                    const latestActivityMap = new Map<string, number>();
                    const workedMapIds = new Set<string>();

                    history?.forEach(item => {
                        const datesToCheck: number[] = [];
                        const createdAt = item.createdAt || item.created_at;
                        const returnedAt = item.returnedAt || item.returned_at;

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
                        const tId = item.territoryId || item.territory_id;
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
                    const qCities = query(citiesRef, or(
                        where('congregationId', '==', congregationId),
                        where('congregation_id', '==', congregationId)
                    ));
                    const citiesSnap = await getDocs(qCities);

                    const cityMap: Record<string, string> = {};
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
                        const cityName = cityMap[t.cityId || t.city_id] || t.city || 'Cidade Desconhecida';

                        if (!lastActivityDate) {
                            idleList.push({
                                id: t.id,
                                name: t.name || 'Sem Nome',
                                description: t.notes || '',
                                city: cityName,
                                cityId: t.cityId || t.city_id,
                                congregationId: t.congregationId || t.congregation_id,
                                lastVisit: null,
                                variant: 'danger'
                            });
                        } else if (lastActivityDate < oneYearAgo) {
                            idleList.push({
                                id: t.id,
                                name: t.name || 'Sem Nome',
                                description: t.notes || '',
                                city: cityName,
                                cityId: t.cityId || t.city_id,
                                congregationId: t.congregationId || t.congregation_id,
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
                        setCityCompletion({ cityName: "Território Completo", percentage: 100 });
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };

        if (isElder || isServant || role === 'ADMIN') {
            fetchIdleAndCompletion();
        }
    }, [congregationId, role, isElder, isServant]);

    const handleQuickAssign = async (territory: IdleTerritory) => {
        router.push(`/share-setup?ids=${territory.id}&returnUrl=/notifications`);
    };

    if (loading) return null;

    return (
        <div className="bg-background min-h-screen pb-24 font-sans text-main">
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-main" />
                </button>
                <h1 className="font-bold text-lg text-main tracking-tight">Todas as Notificações</h1>
            </header>

            <main className="px-6 py-6 max-w-xl mx-auto">
                <ActionCenter
                    userName={profileName || 'Publicador'}
                    pendingMapsCount={pendingMapsCount}
                    hasPendingAnnotation={false}
                    idleTerritories={isElder || isServant || role === 'ADMIN' ? idleTerritories : []}
                    cityCompletion={cityCompletion}
                    expiringMaps={expiringMaps}
                    onAssignTerritory={handleQuickAssign}
                // No limit here
                />
            </main>
        </div>
    );
}
