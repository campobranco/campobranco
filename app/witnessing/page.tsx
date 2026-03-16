"use client";

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Building2, ChevronRight, Search, Store } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/app/components/BottomNav';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface Congregation {
    id: string;
    name: string;
}

export default function WitnessingPage() {
    const { user, congregationId, isAdminRoleGlobal, loading: authLoading } = useAuth();
    const router = useRouter();
    const [congregations, setCongregations] = useState<Congregation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        // Sempre redireciona para a congregação atribuída se ela existir
        if (congregationId) {
            router.push(`/witnessing/congregation?congregationId=${congregationId}`);
            return;
        }

        if (isAdminRoleGlobal && !congregationId) {
            router.replace('/admin/congregations');
            return;
        }

        if (!isAdminRoleGlobal && !congregationId) {
            router.push('/sem-congregacao');
            return;
        }

        const fetchCongregations = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'congregations'));
                const congs = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name
                }));
                // Ordenar por nome localmente
                congs.sort((a, b) => a.name.localeCompare(b.name));
                setCongregations(congs);
            } catch (error) {
                console.error("Erro ao buscar congregações:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCongregations();

    }, [user, congregationId, authLoading, router, isAdminRoleGlobal]);

    const filteredCongregations = congregations.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading || (isAdminRoleGlobal && loading)) {
        return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (!isAdminRoleGlobal && !congregationId) {
        return (
            <div className="bg-background min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-surface p-4 rounded-full mb-6 shadow-sm border border-surface-border">
                    <Store className="w-12 h-12 text-muted-foreground" />
                </div>
                <h1 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h1>
                <p className="text-muted-foreground max-w-xs mx-auto">Você não está associado a nenhuma congregação no momento.</p>
                <div className="mt-8">
                    <BottomNav />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen pb-24 font-sans text-foreground">
            {/* Header */}
            <div className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border/50 backdrop-blur-md bg-surface/80 supports-[backdrop-filter]:bg-surface/60">
                <div className="flex items-center gap-3">
                    <div className="bg-amber-500/10 dark:bg-amber-500/20 p-2 rounded-lg text-amber-600 dark:text-amber-500 border border-amber-500/10">
                        <Store className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight block leading-tight">Testemunho Público</h1>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Painel Administrativo</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="px-6 pt-6 pb-2">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 group-focus-within:text-amber-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar congregação..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface border border-surface-border text-sm font-medium rounded-lg py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 focus:outline-none transition-all placeholder:text-muted-foreground/50"
                    />
                </div>
            </div>

            <main className="px-6 py-4 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                {filteredCongregations.length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                        <p className="text-muted-foreground font-medium">Nenhuma congregação encontrada.</p>
                    </div>
                ) : (
                    filteredCongregations.map(cong => (
                        <Link
                            key={cong.id}
                            href={`/witnessing/congregation?congregationId=${cong.id}`}
                            className="block bg-surface rounded-lg p-4 border border-surface-border shadow-sm hover:shadow-md hover:border-amber-500/20 transition-all active:scale-[0.98] group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/5 dark:bg-primary/10 text-primary p-3 rounded-lg group-hover:bg-amber-500/10 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-semibold text-base">{cong.name}</h3>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        </Link>
                    ))
                )}
            </main>

            <BottomNav />
        </div>
    );
}
