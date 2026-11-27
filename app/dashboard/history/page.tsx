"use client";

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import VisitsHistory from '@/app/components/Dashboard/VisitsHistory';
import { ArrowLeft, History } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/app/components/BottomNav';
import { ListPageSkeleton } from '@/app/components/Skeleton';

function HistoryContent() {
    const searchParams = useSearchParams();
    const scope = (searchParams.get('scope') as 'mine' | 'all') || 'all';

    return (
        <div className="bg-background min-h-screen font-sans pb-24 transition-colors duration-300">
            {/* Header */}
            <header className="px-6 py-4 bg-surface border-b border-surface-border flex items-center gap-4 sticky top-0 z-20">
                <Link href="/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <div className="flex flex-col">
                    <h1 className="font-bold text-lg text-main leading-tight">Histórico Completo</h1>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-widest">
                        {scope === 'mine' ? 'Minhas Atividades' : 'Todas as Atividades'}
                    </span>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-6 py-8">
                <div className="mb-6 bg-surface p-4 rounded-3xl border border-surface-border flex items-center gap-3 shadow-sm">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-2xl text-purple-600 dark:text-purple-400">
                        <History className="w-5 h-5" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-muted font-medium leading-tight">
                        Abaixo você encontra o histórico detalhado de todas as visitas{scope === 'mine' ? ' feitas por você' : ''}.
                    </p>
                </div>

                {/* Using the same component but disabling the "Ver Tudo" button */}
                <VisitsHistory scope={scope} showViewAll={false} />

                <div className="mt-8 text-center bg-surface/50 p-6 rounded-3xl border border-dashed border-surface-border">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2 italic">Fim do Histórico</p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600">Apenas os registros mais recentes são carregados por padrão para garantir a velocidade do aplicativo.</p>
                </div>
            </main>

            <BottomNav />
        </div>
    );
}

export default function HistoryPage() {
    return (
        <Suspense fallback={<ListPageSkeleton showSearch={false} showBack={true} rightActions={0} contentMaxWidthClass="max-w-xl mx-auto" gridClassName="grid-cols-1 gap-3" cards={4} />}>
            <HistoryContent />
        </Suspense>
    );
}
