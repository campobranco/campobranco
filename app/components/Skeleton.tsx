"use client";

import { cn } from "../../lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-gray-200 dark:bg-gray-800", className)}
            {...props}
        />
    );
}

export function MapSkeleton() {
    return (
        <div className="w-full h-full min-h-[300px] bg-slate-100 dark:bg-slate-900 rounded-xl flex flex-col items-center justify-center p-8 text-center animate-pulse border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full mb-4 flex items-center justify-center">
                <div className="w-8 h-8 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
            <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded opacity-50" />
        </div>
    );
}

function SkeletonBottomNav() {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-border pb-safe pt-2 z-50 flex justify-center">
            <div className="flex justify-between items-center w-full max-w-lg px-6 py-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1">
                        <div className="p-2 rounded-lg">
                            <Skeleton className="w-6 h-6 rounded" />
                        </div>
                        <Skeleton className="h-2.5 w-10 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function PageSkeleton({ showBottomNav = true }: { showBottomNav?: boolean }) {
    return (
        <div
            role="status"
            aria-busy="true"
            className="bg-background min-h-screen pb-24 font-sans"
        >
            <span className="sr-only">Carregando...</span>
            <header className="bg-surface sticky top-0 z-30 px-4 sm:px-6 py-3 sm:py-4 border-b border-surface-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg shrink-0" />
                    <div className="min-w-0 space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-2.5 w-14 hidden sm:block" />
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="w-8 h-8 rounded-full" />
                </div>
            </header>

            <main className="px-6 py-6 max-w-xl mx-auto space-y-6">
                {Array.from({ length: 3 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="bg-surface border border-surface-border rounded-lg p-4 space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-44" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                ))}
            </main>
            {showBottomNav && <SkeletonBottomNav />}
        </div>
    );
}

export function ActionCenterSkeleton({
    cards = 4,
    showViewAll = false,
}: {
    cards?: number;
    showViewAll?: boolean;
}) {
    return (
        <div role="status" aria-busy="true" className="mb-8">
            <span className="sr-only">Carregando...</span>
            <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="h-3 w-28" />
                </div>
                {showViewAll && <Skeleton className="h-3 w-24" />}
            </div>
            <div className="space-y-4">
                {Array.from({ length: cards }).map((_, idx) => (
                    <div
                        key={idx}
                        className="bg-surface rounded-lg p-2.5 md:p-5 border border-surface-border flex flex-col md:flex-row md:items-center gap-2 md:gap-4"
                    >
                        <Skeleton className="w-9 h-9 md:w-12 md:h-12 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-5/6" />
                        </div>
                        <Skeleton className="h-8 md:h-10 w-full md:w-28 rounded-md shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function NotificationsPageSkeleton() {
    return (
        <div
            role="status"
            aria-busy="true"
            className="bg-background min-h-screen pb-24 font-sans"
        >
            <span className="sr-only">Carregando...</span>
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <Skeleton className="h-5 w-44" />
            </header>
            <main className="px-6 py-6 max-w-xl mx-auto">
                <ActionCenterSkeleton cards={5} />
            </main>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div
            role="status"
            aria-busy="true"
            className="bg-background min-h-screen pb-24 font-sans"
        >
            <span className="sr-only">Carregando...</span>
            <header className="bg-surface sticky top-0 z-30 px-4 sm:px-6 py-3 sm:py-4 border-b border-surface-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg shrink-0" />
                    <div className="min-w-0">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-2.5 w-12 hidden sm:block mt-1" />
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="w-8 h-8 rounded-full" />
                </div>
            </header>

            <main className="px-6 py-6 max-w-xl mx-auto space-y-10">
                <div>
                    <Skeleton className="h-8 w-36" />
                    <div className="flex items-center gap-1.5 mt-1">
                        <Skeleton className="w-4 h-4 rounded shrink-0" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>

                <section className="space-y-6">
                    <div className="flex items-center gap-2 px-1">
                        <Skeleton className="w-1 h-6 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                    </div>

                    <ActionCenterSkeleton cards={2} showViewAll={true} />

                    <div className="bg-surface p-6 rounded-lg border border-surface-border space-y-4">
                        <Skeleton className="h-5 w-32" />
                        <div className="space-y-3">
                            {Array.from({ length: 2 }).map((_, idx) => (
                                <div key={idx} className="p-4 rounded-lg bg-background border border-surface-border space-y-2">
                                    <Skeleton className="h-4 w-2/3" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-lg border border-surface-border space-y-4">
                        <Skeleton className="h-5 w-40" />
                        <div className="space-y-3">
                            {Array.from({ length: 2 }).map((_, idx) => (
                                <div key={idx} className="p-4 rounded-lg bg-background border border-surface-border space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <SkeletonBottomNav />
        </div>
    );
}

interface ListPageSkeletonProps {
    showSearch?: boolean;
    showBottomNav?: boolean;
    showBack?: boolean;
    showSubtitle?: boolean;
    rightActions?: number;
    headerMaxWidthClass?: string;
    contentMaxWidthClass?: string;
    gridClassName?: string;
    surfaceList?: boolean;
    cards?: number;
}

export function ListPageSkeleton({
    showSearch = true,
    showBottomNav = true,
    showBack = false,
    showSubtitle = true,
    rightActions = 1,
    headerMaxWidthClass = "",
    contentMaxWidthClass = "",
    gridClassName = "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4",
    surfaceList = false,
    cards = 6,
}: ListPageSkeletonProps) {
    return (
        <div
            role="status"
            aria-busy="true"
            className={cn(
                "min-h-screen font-sans",
                surfaceList ? "bg-surface" : "bg-background",
                showBottomNav ? "pb-24" : "pb-10"
            )}
        >
            <span className="sr-only">Carregando...</span>
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border">
                <div className={cn("flex items-center justify-between gap-4", headerMaxWidthClass)}>
                    <div className="flex items-center gap-3 min-w-0">
                        <Skeleton
                            className={cn(
                                "w-9 h-9 shrink-0",
                                showBack && !showSubtitle ? "rounded-full" : "rounded-lg"
                            )}
                        />
                        <div className="space-y-1.5 min-w-0">
                            <Skeleton className="h-5 w-36" />
                            {showSubtitle && <Skeleton className="h-2.5 w-24" />}
                        </div>
                    </div>
                    {rightActions > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                            {Array.from({ length: rightActions }).map((_, idx) => (
                                <Skeleton key={idx} className="w-9 h-9 rounded-lg" />
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <div className={cn("px-6 pt-6 pb-4 space-y-4", contentMaxWidthClass)}>
                {showSearch && <Skeleton className="h-[52px] w-full rounded-lg" />}
                <div className={cn("grid", gridClassName)}>
                    {Array.from({ length: cards }).map((_, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "rounded-lg p-4 border border-surface-border flex items-center justify-between gap-4",
                                surfaceList ? "bg-background" : "bg-surface"
                            )}
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                                <div className="space-y-2 flex-1 min-w-0">
                                    <Skeleton className="h-4 w-3/5" />
                                    <Skeleton className="h-3 w-2/5" />
                                </div>
                            </div>
                            <Skeleton className="w-5 h-5 rounded shrink-0" />
                        </div>
                    ))}
                </div>
            </div>
            {showBottomNav && <SkeletonBottomNav />}
        </div>
    );
}

export function AddressPageSkeleton() {
    return (
        <div
            role="status"
            aria-busy="true"
            className="bg-background min-h-screen pb-24 font-sans"
        >
            <span className="sr-only">Carregando...</span>
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-2.5 w-28" />
                    </div>
                </div>
                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
            </header>

            <div className="px-6 pt-6 pb-2">
                <div className="max-w-6xl mx-auto">
                    <Skeleton className="h-[52px] w-full rounded-lg" />
                </div>
            </div>

            <div className="px-6 pb-6 pt-2 space-y-3 max-w-6xl mx-auto">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="bg-surface rounded-lg p-4 border border-surface-border space-y-2.5"
                    >
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                ))}
            </div>

            <div className="w-full h-96 border-t border-surface-border p-4">
                <MapSkeleton />
            </div>
            <SkeletonBottomNav />
        </div>
    );
}

export function SettingsSkeleton() {
    return (
        <div
            role="status"
            aria-busy="true"
            className="min-h-screen bg-background pb-24 font-sans"
        >
            <span className="sr-only">Carregando...</span>
            <header className="bg-surface border-b border-surface-border sticky top-0 z-30 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-3 w-44" />
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
                <section>
                    <Skeleton className="h-3.5 w-28 mb-4 ml-1" />
                    <div className="bg-surface p-6 rounded-lg border border-surface-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-3.5 w-52" />
                                <Skeleton className="h-3 w-36" />
                                <Skeleton className="h-6 w-28 rounded-full" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full md:w-44">
                            <Skeleton className="h-12 w-full rounded-lg" />
                            <Skeleton className="h-12 w-full rounded-lg" />
                        </div>
                    </div>
                </section>

                <section>
                    <Skeleton className="h-3.5 w-24 mb-4 ml-1" />
                    <div className="bg-surface p-6 rounded-lg border border-surface-border space-y-6">
                        {Array.from({ length: 2 }).map((_, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-48" />
                                    </div>
                                </div>
                                <Skeleton className="h-10 w-full sm:w-72 rounded-lg" />
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <Skeleton className="h-3.5 w-32 mb-4 ml-1" />
                    <div className="bg-surface p-6 rounded-lg border border-surface-border space-y-4">
                        <Skeleton className="h-10 w-full rounded-lg" />
                        <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                </section>
            </main>
            <SkeletonBottomNav />
        </div>
    );
}

const REPORT_BAR_HEIGHTS = [
    "h-12", "h-20", "h-16", "h-24", "h-14", "h-28",
    "h-20", "h-10", "h-24", "h-16", "h-28", "h-20"
];

export function ReportsContentSkeleton() {
    return (
        <div role="status" aria-busy="true" className="space-y-8">
            <span className="sr-only">Carregando...</span>
            <div className="grid grid-cols-3 gap-4 mb-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="bg-surface p-4 sm:p-5 rounded-lg border border-surface-border flex flex-col items-center"
                    >
                        <Skeleton className="w-5 h-5 rounded mb-3" />
                        <Skeleton className="h-7 sm:h-9 w-12 mb-1" />
                        <Skeleton className="h-2.5 w-16" />
                    </div>
                ))}
            </div>

            <div className="bg-surface p-6 rounded-lg border border-surface-border">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="w-5 h-5 rounded" />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="p-4 rounded-lg border border-surface-border flex flex-col items-center space-y-2"
                        >
                            <Skeleton className="h-2.5 w-12" />
                            <Skeleton className="h-7 w-10" />
                            <Skeleton className="h-2.5 w-14" />
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-surface p-6 rounded-lg border border-surface-border">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-6 w-32 rounded-full" />
                </div>
                <div className="h-40 grid grid-cols-12 items-end gap-1 sm:gap-2 mt-6">
                    {REPORT_BAR_HEIGHTS.map((heightClass, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-2 w-full">
                            <Skeleton className={cn("w-full rounded-t-xl", heightClass)} />
                            <Skeleton className="h-2.5 w-6" />
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <Skeleton className="h-5 w-40 mb-4" />
                <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="p-5 rounded-lg bg-surface border border-surface-border flex gap-4"
                        >
                            <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-3 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function RegistryTableSkeleton() {
    return (
        <div role="status" aria-busy="true">
            <span className="sr-only">Carregando...</span>
            <div className="border border-surface-border bg-surface rounded-lg overflow-hidden min-w-[700px]">
                <div className="flex border-b border-surface-border bg-surface-highlight h-14">
                    <div className="w-[50px] border-r border-surface-border flex items-center justify-center p-2">
                        <Skeleton className="h-3 w-6" />
                    </div>
                    <div className="w-[80px] border-r border-surface-border flex items-center justify-center p-2">
                        <Skeleton className="h-3 w-12" />
                    </div>
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="flex-1 border-r border-surface-border last:border-r-0 flex items-center justify-center p-2">
                            <Skeleton className="h-3 w-20" />
                        </div>
                    ))}
                </div>

                <div className="h-7 border-b border-surface-border bg-surface-highlight/60 flex items-center justify-center">
                    <Skeleton className="h-3 w-32" />
                </div>

                {Array.from({ length: 8 }).map((_, rowIdx) => (
                    <div key={rowIdx} className="flex border-b border-surface-border last:border-b-0 h-11">
                        <div className="w-[50px] border-r border-surface-border flex items-center justify-center p-2">
                            <Skeleton className="h-3 w-5" />
                        </div>
                        <div className="w-[80px] border-r border-surface-border flex items-center justify-center p-2">
                            <Skeleton className="h-3 w-12" />
                        </div>
                        {Array.from({ length: 4 }).map((_, colIdx) => (
                            <div key={colIdx} className="flex-1 border-r border-surface-border last:border-r-0 flex items-center justify-center p-2">
                                <Skeleton className="h-3 w-3/4" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function VisitsHistoryCardSkeleton() {
    return (
        <div role="status" aria-busy="true" className="bg-surface p-6 rounded-lg border border-surface-border space-y-4">
            <span className="sr-only">Carregando...</span>
            <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-5 w-36" />
            </div>
            <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-background border border-surface-border space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SharePageSkeleton() {
    return (
        <div role="status" aria-busy="true" className="bg-background min-h-screen font-sans pb-24">
            <span className="sr-only">Carregando...</span>
            <header className="px-6 py-6 bg-surface border-b border-surface-border flex items-center justify-center sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <Skeleton className="h-5 w-40" />
                </div>
            </header>

            <main className="max-w-xl mx-auto px-5 py-8 space-y-6">
                <div className="bg-surface rounded-lg p-6 space-y-6 border border-surface-border">
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full rounded-full" />
                        <div className="flex justify-between">
                            <Skeleton className="h-3 w-36" />
                            <Skeleton className="h-3 w-10" />
                        </div>
                        <div className="flex flex-wrap gap-3 pt-2">
                            {Array.from({ length: 5 }).map((_, idx) => (
                                <Skeleton key={idx} className="h-3 w-16" />
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Skeleton className="flex-1 h-12 rounded-lg" />
                        <Skeleton className="flex-1 h-12 rounded-lg" />
                    </div>
                </div>

                <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="bg-surface p-4 rounded-lg border border-surface-border flex items-center gap-4"
                        >
                            <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                        </div>
                    ))}
                </div>

                <div className="flex justify-center">
                    <Skeleton className="h-9 w-52 rounded-full" />
                </div>
            </main>
            <SkeletonBottomNav />
        </div>
    );
}

export function SharePreviewPageSkeleton() {
    return (
        <div role="status" aria-busy="true" className="bg-background min-h-screen font-sans pb-10">
            <span className="sr-only">Carregando...</span>
            <header className="px-6 py-6 bg-surface border-b border-surface-border flex items-center gap-4 sticky top-0 z-20">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="space-y-1.5">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-3 w-28" />
                </div>
            </header>

            <main className="max-w-xl mx-auto px-5 py-8 space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="bg-surface p-4 rounded-lg border border-surface-border flex items-center gap-4"
                    >
                        <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="w-6 h-6 rounded shrink-0" />
                    </div>
                ))}
            </main>

            <div className="h-[40vh] w-full border-t border-surface-border mt-4 p-4">
                <MapSkeleton />
            </div>
        </div>
    );
}

export function ShareSetupPageSkeleton() {
    return (
        <div role="status" aria-busy="true" className="min-h-screen bg-background font-sans pb-20">
            <span className="sr-only">Carregando...</span>
            <header className="sticky top-0 z-30 bg-surface border-b border-surface-border px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <Skeleton className="h-5 w-36" />
            </header>

            <main className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
                <section className="space-y-4">
                    <Skeleton className="h-3.5 w-36" />
                    <div className="bg-surface rounded-2xl border border-surface-border p-4 space-y-3">
                        {Array.from({ length: 2 }).map((_, idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <Skeleton className="h-3.5 w-32" />
                    <div className="bg-surface rounded-2xl border border-surface-border p-5 space-y-4">
                        <Skeleton className="h-11 w-full rounded-lg" />
                        <Skeleton className="h-11 w-full rounded-lg" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                </section>
            </main>
        </div>
    );
}

export function InviteCardSkeleton() {
    return (
        <div
            role="status"
            aria-busy="true"
            className="bg-surface max-w-md w-full rounded-[2.5rem] p-8 space-y-8 border border-surface-border"
        >
            <span className="sr-only">Carregando...</span>
            <Skeleton className="w-24 h-24 rounded-full mx-auto" />
            <div className="space-y-3">
                <Skeleton className="h-6 w-56 mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto" />
                <Skeleton className="h-6 w-40 mx-auto" />
            </div>
            <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
    );
}
