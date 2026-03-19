"use client";

import { useState, useEffect, Suspense } from 'react';
import {
    Map as MapIcon,
    Search,
    Loader2,
    Store,
    ArrowRight,
    AlertCircle
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import BottomNav from '@/app/components/BottomNav';

interface City {
    id: string;
    name: string;
    uf: string;
    congregationId: string; // camelCase no Firestore
}

function WitnessingCityListContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const congregationId = searchParams.get('congregationId');
    const { congregationId: userCongregationId, loading: authLoading } = useAuth();
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (authLoading) return;

        // Security Check: Ensure user is accessing their own congregation
        if (userCongregationId && congregationId && congregationId !== userCongregationId) {
            console.warn("Security Alert: User tried to access different congregation. Redirecting to authorized one.");
            router.replace(`/witnessing/congregation?congregationId=${userCongregationId}`);
            return;
        }

        if (!congregationId && userCongregationId) {
            router.replace(`/witnessing/congregation?congregationId=${userCongregationId}`);
            return;
        }

        if (!congregationId) {
            setLoading(false);
            return;
        }

        // Timeout de segurança
        const timer = setTimeout(() => {
            if (loading) {
                console.warn("Witnessing cities fetch timed out");
                setHasError(true);
                setLoading(false);
            }
        }, 12000);

        let isMounted = true;

        // onSnapshot: busca cidades e ouve mudanças em tempo real via Firestore
        const citiesQuery = query(
            collection(db, 'cities'),
            where('congregationId', '==', congregationId),
            orderBy('name')
        );

        const unsubscribe = onSnapshot(
            citiesQuery,
            (snapshot) => {
                if (!isMounted) return;
                const citiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as City));
                setCities(citiesData);
                setLoading(false);
                clearTimeout(timer);
            },
            (error) => {
                console.error("Error fetching cities:", error);
                if (isMounted) {
                    setHasError(true);
                    setLoading(false);
                }
                clearTimeout(timer);
            }
        );

        return () => {
            isMounted = false;
            clearTimeout(timer);
            unsubscribe();
        };
    }, [congregationId, authLoading, userCongregationId, router, loading]);

    const filteredCities = cities.filter(city =>
        city.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!congregationId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p>Congregação não especificada.</p>
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen pb-24 font-sans text-main">
            {/* Header */}
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border flex justify-between items-center shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-500 p-2 rounded-lg text-white shadow-md">
                        <Store className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                        <span className="font-bold text-lg text-main tracking-tight block leading-tight">Cidades</span>
                        <span className="text-[10px] text-muted font-bold uppercase tracking-widest block">Selecione para T. Público</span>
                    </div>
                </div>
            </header>

            {/* Search */}
            <div className="px-6 pt-6 pb-2">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5 group-focus-within:text-amber-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar cidade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface border-0 text-main text-sm font-medium rounded-lg py-4 pl-12 pr-4 shadow-[0_4px_30px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all placeholder:text-muted"
                    />
                </div>
            </div>

            {/* List */}
            <main className="px-6 py-4 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    </div>
                ) : hasError ? (
                    <div className="bg-surface p-6 rounded-lg shadow-sm border border-surface-border flex flex-col items-center justify-center text-center">
                        <AlertCircle className="w-8 h-8 text-orange-400 mb-2" />
                        <p className="text-sm font-bold text-main">O carregamento está demorando muito.</p>
                        <p className="text-[10px] text-muted mb-4 px-4 text-pretty leading-relaxed">Verifique sua conexão ou tente recarregar.</p>
                        <button
                            onClick={() => {
                                setHasError(false);
                                setLoading(true);
                                window.location.reload();
                            }}
                            className="bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2 px-6 rounded-full transition-colors flex items-center gap-2"
                        >
                            Recarregar Página
                        </button>
                    </div>
                ) : filteredCities.length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                        <MapIcon className="w-12 h-12 mx-auto mb-3 text-muted" />
                        <p className="text-muted font-medium">Nenhuma cidade encontrada</p>
                    </div>
                ) : (
                    filteredCities.map(city => (
                        <Link
                            key={city.id}
                            href={`/witnessing/city?congregationId=${congregationId}&cityId=${city.id}`}
                            className="group bg-surface rounded-lg p-4 border border-surface-border shadow-sm hover:shadow-md transition-all flex items-center gap-4"
                        >
                            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center shrink-0">
                                <Store className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-main text-base truncate">{city.name}</h3>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">VER PONTOS</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted group-hover:text-amber-500 transition-colors" />
                        </Link>
                    ))
                )}
            </main>

            <BottomNav />
        </div>
    );
}

export default function WitnessingCityList() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <WitnessingCityListContent />
        </Suspense>
    );
}
