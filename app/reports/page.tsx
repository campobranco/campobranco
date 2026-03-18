"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/app/components/BottomNav";
import { useAuth } from "@/app/context/AuthContext";
import {
    FileText,
    Lock,
    Send,
    Users,
    BarChart3,
    TrendingUp,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Map as MapIcon,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Building2,
    AlertCircle,
    Lightbulb,
    X,
    Plus,
    Loader2
} from "lucide-react";
import { getServiceYear, getServiceYearLabel, getServiceYearRange } from "@/lib/serviceYearUtils";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { getRegistryData } from "@/lib/services/reports";


export default function ReportsPage() {
    const router = useRouter();
    const { user, role, isElder, isServant, isAdminRoleGlobal, congregationId: userCongregationId, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [selectedCongregationId, setSelectedCongregationId] = useState<string | null>(null);

    // Redirect if not Elder/Servant or if Admin has no congregation
    useEffect(() => {
        if (!authLoading && user) {
            if (isAdminRoleGlobal && !userCongregationId) {
                router.replace('/admin/congregations');
            } else if (!userCongregationId) {
                router.push('/sem-congregacao');
            } else if (!isElder && !isServant) {
                router.replace('/dashboard');
            }
        }
    }, [user, authLoading, isElder, isServant, isAdminRoleGlobal, userCongregationId, router]);
    const [selectedServiceYear, setSelectedServiceYear] = useState<number>(getServiceYear());
    const [error, setError] = useState<string | null>(null);

    // Stats State
    const [kpis, setKpis] = useState({
        totalMaps: 0,
        coveredPercentage: 0,
        avgRotationDays: 0,
        stuckMapsCount: 0
    });

    const [chartData, setChartData] = useState<{ month: string, count: number, height: number }[]>([]);
    const [insights, setInsights] = useState<{ type: 'warning' | 'info' | 'success', message: string, detail?: string }[]>([]);
    const [stuckMapsList, setStuckMapsList] = useState<any[]>([]);
    const [isStuckMapsModalOpen, setIsStuckMapsModalOpen] = useState(false);

    // Visit Periods State
    const [visitPeriods, setVisitPeriods] = useState({
        morning: { total: 0, found: 0 },
        afternoon: { total: 0, found: 0 },
        night: { total: 0, found: 0 }
    });

    // Initialize selectedCongregationId
    useEffect(() => {
        if (!authLoading && userCongregationId && !selectedCongregationId) {
            setSelectedCongregationId(userCongregationId);
        }
    }, [userCongregationId, authLoading]);



    useEffect(() => {
        const targetCongId = selectedCongregationId || userCongregationId;
        if (!targetCongId || (!isElder && !isServant && !isAdminRoleGlobal)) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setError(null);
            setLoading(true);
            try {
                // Fetch all data via Client Service (consistent with registry page)
                const resData = await getRegistryData(targetCongId);

                if (!resData.success) throw new Error(resData.error || "Erro ao buscar dados do servidor");

                const territories = resData.territories || [];
                const history = resData.sharedLists || [];



                // --- CALCULATE KPIS ---

                // A. Total Maps
                const totalMaps = territories.length;

                // B. Coverage (Selected Service Year)
                const { start, end } = getServiceYearRange(selectedServiceYear);
                const workedMapIds = new Set<string>();

                // 1. From History
                history.forEach((h: any) => {
                    let d = h.returned_at ? new Date(h.returned_at) : null;
                    if (!d && h.status === 'completed') {
                        d = new Date();
                    }
                    if (d && d >= start && d <= end) {
                        if (h.territory_id) workedMapIds.add(h.territory_id);
                    }
                });

                // 2. From Manual Dates (Territories)
                territories.forEach((t: any) => {
                    if (t.manual_last_completed_date) {
                        const d = new Date(t.manual_last_completed_date);
                        if (d >= start && d <= end) {
                            workedMapIds.add(t.id);
                        }
                    }
                });

                const coveredPercentage = totalMaps > 0 ? Math.floor((workedMapIds.size / totalMaps) * 100) : 0;

                // C. Rotation (Avg days to complete)
                let totalDays = 0;
                let completedCount = 0;
                history.forEach((h: any) => {
                    if (h.created_at && h.returned_at) {
                        const start = new Date(h.created_at);
                        const end = new Date(h.returned_at);
                        const diffTime = Math.abs(end.getTime() - start.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        totalDays += diffDays;
                        completedCount++;
                    }
                });
                const avgRotationDays = completedCount > 0 ? Math.round(totalDays / completedCount) : 0;

                // --- CHARTS (Monthly History) ---
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const chartLabels: string[] = [];
                const monthCounts: Record<string, number> = {};

                const { start: syStart, end: syEnd } = getServiceYearRange(selectedServiceYear);
                const now = new Date();

                let current = new Date(syStart);
                while (current <= syEnd) {
                    if (current > now && selectedServiceYear === getServiceYear()) break;
                    const mName = months[current.getMonth()];
                    monthCounts[mName] = 0;
                    chartLabels.push(mName);
                    current.setMonth(current.getMonth() + 1);
                }

                history.forEach((h: any) => {
                    if (h.returned_at) {
                        const date = new Date(h.returned_at);
                        if (date >= syStart && date <= (current > now ? now : syEnd)) {
                            const key = months[date.getMonth()];
                            if (monthCounts[key] !== undefined) {
                                monthCounts[key]++;
                            }
                        }
                    }
                });

                const maxVal = Math.max(...Object.values(monthCounts), 1);
                const chart = chartLabels.map(month => ({
                    month,
                    count: monthCounts[month],
                    height: Math.round((monthCounts[month] / maxVal) * 100)
                }));

                // --- INSIGHTS (Comprehensive Stuck Maps Check) ---
                const newInsights: any[] = [];
                const stuckMaps: any[] = [];

                territories.forEach((t: any) => {
                    // 1. Get last completion date (manual or history)
                    let lastTouch = t.manual_last_completed_date ? new Date(t.manual_last_completed_date) : new Date(0);

                    // 2. Find relevant history for this territory
                    const tHistory = history.filter((h: any) => h.territory_id === t.id || (h.items && h.items.includes(t.id)));

                    let activeAssign: any = null;
                    tHistory.forEach((h: any) => {
                        const d = h.returned_at ? new Date(h.returned_at) : null;
                        if (d && d > lastTouch) lastTouch = d;

                        if (h.status !== 'completed' && h.status !== 'expired') {
                            if (!activeAssign || new Date(h.created_at) > new Date(activeAssign.created_at)) {
                                activeAssign = h;
                            }
                        }
                    });

                    // The reference date is the assignment date if it's out, or the last completion if it's in
                    const referenceDate = activeAssign ? new Date(activeAssign.created_at) : lastTouch;
                    const diffTime = Math.abs(new Date().getTime() - referenceDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays > 180) {
                        stuckMaps.push({
                            name: t.name,
                            description: t.notes || '',
                            days: diffDays,
                            assignee: activeAssign ? (activeAssign.assigned_name || 'Publicador') : 'Disponível'
                        });
                    }
                });

                if (stuckMaps.length > 0) {
                    newInsights.push({
                        type: 'warning',
                        message: `${stuckMaps.length} mapas sem trabalho há mais de 6 meses`,
                        detail: 'Verifique a lista abaixo e considere designar ou cobrar a devolução.'
                    });
                } else if (territories.length > 0) {
                    newInsights.push({
                        type: 'success',
                        message: 'Nenhum mapa parado!',
                        detail: 'O giro do território está saudável.'
                    });
                }

                setKpis({
                    totalMaps,
                    coveredPercentage,
                    avgRotationDays,
                    stuckMapsCount: stuckMaps.length
                });

                setChartData(chart);
                setInsights(newInsights);
                setStuckMapsList(stuckMaps);

                // --- VISITS BY PERIOD (Firestore) ---
                const visitsRef = collection(db, 'visits');
                const visitsQuery = query(
                    visitsRef,
                    where('congregationId', '==', targetCongId),
                    where('date', '>=', syStart.toISOString()),
                    where('date', '<=', syEnd.toISOString())
                );

                const visitsSnap = await getDocs(visitsQuery);
                const visits = visitsSnap.docs.map(doc => doc.data());

                let morningArr = { total: 0, found: 0 };
                let afternoonArr = { total: 0, found: 0 };
                let nightArr = { total: 0, found: 0 };

                visits.forEach((v: any) => {
                    const date = new Date(v.date);
                    const hour = date.getHours();
                    const minute = date.getMinutes();
                    const totalMinutes = hour * 60 + minute;
                    const isFound = v.status === 'contacted';

                    if (totalMinutes < 720) {
                        morningArr.total++;
                        if (isFound) morningArr.found++;
                    } else if (totalMinutes <= 1110) {
                        afternoonArr.total++;
                        if (isFound) afternoonArr.found++;
                    } else {
                        nightArr.total++;
                        if (isFound) nightArr.found++;
                    }
                });

                setVisitPeriods({ morning: morningArr, afternoon: afternoonArr, night: nightArr });

            } catch (error: any) {
                console.error("Error fetching reports (General):", error?.message || error);
                setError(error?.message || "Erro desconhecido ao carregar relatórios.");
                if (error?.details) console.error("Details:", error.details);
                if (error?.hint) console.error("Hint:", error.hint);
                if (error?.code) console.error("Code:", error.code);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedCongregationId, userCongregationId, isElder, isServant, isAdminRoleGlobal, selectedServiceYear]);

    // Role Guard
    if (!loading && !isElder && !isServant && role !== 'ADMIN') {
        return (
            <div className="bg-background min-h-screen pb-24 font-sans text-main flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                    <Lock className="w-8 h-8 text-muted" />
                </div>
                <h1 className="font-bold text-lg text-main">Acesso Restrito</h1>
                <p className="text-muted text-sm mt-2 max-w-xs">
                    Esta área contém relatórios gerenciais disponíveis apenas para Superintendentes de Serviço e Servos de Territórios.
                </p>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="bg-background min-h-screen pb-24 font-sans text-main">
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-600 p-2 rounded-lg text-white shadow-lg shadow-purple-500/20">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-main tracking-tight leading-tight">Relatórios</h1>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">Inteligência de Território</p>
                    </div>
                </div>



                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 border border-transparent dark:border-gray-800">
                    <button
                        onClick={() => setSelectedServiceYear(prev => prev - 1)}
                        className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded-md shadow-sm transition-all text-main"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold min-w-[90px] text-center text-main">
                        {getServiceYearLabel(selectedServiceYear)}
                    </span>
                    <button
                        onClick={() => setSelectedServiceYear(prev => prev + 1)}
                        className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded-md shadow-sm transition-all text-main"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </header>



            <main className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {error && (
                    <div className={`border p-4 rounded-lg flex items-start gap-3 animate-in zoom-in-95 ${error.includes('building') ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                        {error.includes('building') ? (
                            <Loader2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5 animate-spin" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                            <h3 className={`font-bold text-sm ${error.includes('building') ? 'text-blue-800 dark:text-blue-400' : 'text-red-800 dark:text-red-400'}`}>
                                {error.includes('building') ? 'Preparando Banco de Dados' : 'Erro de Dados'}
                            </h3>
                            <p className={`text-xs mt-1 break-all ${error.includes('building') ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>
                                {error?.includes('https://') ? (
                                    <>
                                        {error.includes('building') ? 'O Firebase está criando um índice necessário para esta consulta. Isso pode levar alguns minutos.' : error.split('https://')[0]}
                                        <a
                                            href={`https://${error.split('https://')[1]}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`underline font-extrabold transition-colors block mt-2 p-2 rounded border ${error.includes('building') ? 'bg-blue-500/10 border-blue-500/20 hover:text-blue-800' : 'bg-red-500/10 border-red-500/20 hover:text-red-800'}`}
                                        >
                                            {error.includes('building') ? 'Ver progresso no Firebase Console' : 'Clique aqui para criar o índice no Firebase Console'}
                                        </a>
                                    </>
                                ) : error}
                            </p>
                            {!error.includes('building') && (
                                <p className="text-red-500 dark:text-red-400 text-[10px] mt-2 leading-relaxed">
                                    Isso pode ocorrer se o esquema do banco de dados estiver incompleto ou se uma consulta exigir um índice composto que ainda não foi criado no Firebase Console.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted font-bold text-sm animate-pulse uppercase tracking-widest">Calculando Métricas...</p>
                    </div>
                ) : (
                    <>
                        {/* KPI Cards Row */}
                        <div className="grid grid-cols-3 gap-4 mb-2">
                            {/* Card 1: Total Maps */}
                            <div className="bg-surface p-4 sm:p-5 rounded-lg shadow-sm border border-surface-border flex flex-col items-center">
                                <div className="flex items-center gap-2 mb-3 text-primary dark:text-primary-light font-bold">
                                    <MapIcon className="w-5 h-5" />
                                </div>
                                <p className="text-xl sm:text-3xl font-black text-main mb-1">{kpis.totalMaps}</p>
                                <p className="text-[8px] sm:text-[10px] font-bold text-muted uppercase tracking-widest text-center">Mapas Totais</p>
                            </div>

                            {/* Card 2: Coverage */}
                            <div className="bg-surface p-4 sm:p-5 rounded-lg shadow-sm border border-surface-border flex flex-col items-center">
                                <div className="flex items-center gap-2 mb-3 text-primary dark:text-primary-light">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <p className="text-xl sm:text-3xl font-black text-main mb-1">{kpis.coveredPercentage}%</p>
                                <p className="text-[8px] sm:text-[10px] font-bold text-muted uppercase tracking-widest text-center">Cobertura</p>
                            </div>

                            {/* Card 3: Rotation (Alert if high) */}
                            <div className={`p-4 sm:p-5 rounded-lg shadow-sm border flex flex-col items-center ${kpis.avgRotationDays > 120 ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'bg-surface border-surface-border'}`}>
                                <div className={`flex items-center gap-2 mb-3 ${kpis.avgRotationDays > 120 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                    <Clock className="w-5 h-5" />
                                    {kpis.avgRotationDays > 120 && <AlertTriangle className="w-4 h-4" />}
                                </div>
                                <p className={`text-xl sm:text-3xl font-black mb-1 ${kpis.avgRotationDays > 120 ? 'text-red-900 dark:text-red-100' : 'text-main'}`}>{kpis.avgRotationDays}</p>
                                <p className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-center ${kpis.avgRotationDays > 120 ? 'text-red-400 dark:text-red-300' : 'text-muted'}`}>Giro (Dias)</p>
                            </div>
                        </div>

                        {/* Visits by Period */}
                        <div className="bg-surface p-6 rounded-lg shadow-sm border border-surface-border mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-bold text-main">Visitas por Período</h2>
                                <Clock className="w-5 h-5 text-muted" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-orange-500/5 dark:bg-orange-500/10 p-4 rounded-lg border border-surface-border flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Manhã</span>
                                    <span className="text-2xl font-black text-orange-500">{visitPeriods.morning.total}</span>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="text-[10px] text-orange-400 font-bold">
                                            {visitPeriods.morning.total > 0
                                                ? Math.round((visitPeriods.morning.found / visitPeriods.morning.total) * 100)
                                                : 0}%
                                        </span>
                                        <span className="text-[10px] text-orange-300 dark:text-orange-500/70">Aprov.</span>
                                    </div>
                                </div>
                                <div className="bg-primary-light/10 dark:bg-primary-dark/10 p-4 rounded-lg border border-surface-border flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-primary dark:text-primary-light uppercase tracking-widest mb-1">Tarde</span>
                                    <span className="text-2xl font-black text-primary dark:text-primary-light">{visitPeriods.afternoon.total}</span>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="text-[10px] text-primary font-bold dark:text-primary-light">
                                            {visitPeriods.afternoon.total > 0
                                                ? Math.round((visitPeriods.afternoon.found / visitPeriods.afternoon.total) * 100)
                                                : 0}%
                                        </span>
                                        <span className="text-[10px] text-primary-light/70">Aprov.</span>
                                    </div>
                                </div>
                                <div className="bg-blue-500/5 dark:bg-blue-500/10 p-4 rounded-lg border border-surface-border flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Noite</span>
                                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{visitPeriods.night.total}</span>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="text-[10px] text-blue-400 font-bold">
                                            {visitPeriods.night.total > 0
                                                ? Math.round((visitPeriods.night.found / visitPeriods.night.total) * 100)
                                                : 0}%
                                        </span>
                                        <span className="text-[10px] text-blue-300 dark:text-blue-500/70">Aprov.</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div className="bg-surface p-6 rounded-lg shadow-sm border border-surface-border">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="font-bold text-main">Histórico de Trabalho</h2>
                                <span className="text-xs font-bold text-muted bg-surface-border text-primary dark:text-primary-light px-2 py-1 rounded-full">Ano de Serviço {getServiceYearLabel(selectedServiceYear)}</span>
                            </div>

                            <div className="h-40 grid grid-cols-12 items-end gap-1 sm:gap-2">
                                {chartData.map((item, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-2 w-full group cursor-pointer">
                                        <div className="w-full relative h-32 bg-gray-50 dark:bg-gray-800 rounded-t-xl flex items-end">
                                            <div
                                                style={{ height: `${item.height}%` }}
                                                className={`w-full transition-all duration-700 ease-out rounded-t-xl relative group-hover:opacity-90
                                                    ${idx === chartData.length - 1 ? 'bg-purple-600' : 'bg-purple-200'}
                                                `}
                                            >
                                                {/* Tooltip */}
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                    {item.count} Mapas
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-muted uppercase">{item.month}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Insights Section */}
                        <div>
                            <h2 className="font-bold text-main text-lg mb-4 px-1">Insights Inteligentes</h2>
                            <div className="space-y-4">
                                {insights.map((insight, idx) => (
                                    <div key={idx} className={`p-5 rounded-lg border flex gap-4 ${insight.type === 'warning' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' :
                                        insight.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30' :
                                            'bg-primary-light/50 dark:bg-primary-dark/20 border-primary-light dark:border-primary-dark/30'
                                        }`}>
                                        <div className={`p-2 rounded-lg h-fit shrink-0 ${insight.type === 'warning' ? 'bg-surface text-red-500 shadow-sm' :
                                            insight.type === 'success' ? 'bg-surface text-green-500 shadow-sm' :
                                                'bg-surface text-primary shadow-sm'
                                            }`}>
                                            {insight.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
                                                insight.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                                                    <Lightbulb className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className={`font-bold text-sm mb-1 ${insight.type === 'warning' ? 'text-red-900 dark:text-red-100' :
                                                insight.type === 'success' ? 'text-green-900 dark:text-green-100' :
                                                    'text-primary-dark dark:text-primary-light'
                                                }`}>{insight.message}</h3>
                                            <p className={`text-xs leading-relaxed ${insight.type === 'warning' ? 'text-red-700 dark:text-red-300' :
                                                insight.type === 'success' ? 'text-green-700 dark:text-green-300' :
                                                    'text-primary-dark dark:text-primary-light'
                                                }`}>{insight.detail}</p>
                                        </div>
                                    </div>
                                ))}

                                {/* Stuck Maps List Detail */}
                                {stuckMapsList.length > 0 && (
                                    <div className="bg-surface rounded-lg border border-surface-border overflow-hidden shadow-sm">
                                        <div className="bg-red-50 dark:bg-red-900/20 px-5 py-3 border-b border-red-100 dark:border-red-900/30 flex justify-between items-center">
                                            <span className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-widest">Mapas Parados</span>
                                            <span className="text-xs font-bold bg-surface text-red-600 px-2 py-0.5 rounded-full">{stuckMapsList.length}</span>
                                        </div>
                                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {stuckMapsList.slice(0, 5).map((map, idx) => (
                                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                    <div>
                                                        <p className="font-bold text-main text-sm">
                                                            {map.name}{map.description ? ` - ${map.description}` : ''}
                                                        </p>
                                                        <p className="text-xs text-muted mt-0.5">Com: {map.assignee}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-red-600 dark:text-red-400 text-sm">{map.days} dias</p>
                                                        <p className="text-[10px] text-muted font-bold uppercase">Parado</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {stuckMapsList.length > 5 && (
                                                <div className="p-3 text-center border-t border-gray-50 dark:border-gray-800">
                                                    <button
                                                        onClick={() => setIsStuckMapsModalOpen(true)}
                                                        className="text-xs font-bold text-primary dark:text-primary-light hover:text-primary-dark flex items-center justify-center gap-1 mx-auto"
                                                    >
                                                        Ver Todos <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Registry Section */}
                        <div>
                            <h2 className="font-bold text-main text-lg mb-4 px-1">Registros</h2>
                            <a href="/reports/registry" className="block bg-surface p-6 rounded-lg shadow-sm border border-surface-border hover:border-primary-light dark:hover:border-primary-dark transition-all group">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary-light/50 rounded-lg text-primary dark:bg-primary-dark/30 dark:text-primary-light group-hover:scale-110 transition-transform">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-main group-hover:text-primary dark:group-hover:text-primary-light transition-colors">Registro de Designação de Território</h3>
                                            <p className="text-xs text-muted">Acesse o formulário S-13 com histórico de designações.</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full">
                                        <ArrowRight className="w-5 h-5 text-gray-400" />
                                    </div>
                                </div>
                            </a>
                        </div>
                    </>
                )}
            </main>
            <BottomNav />

            {/* Stuck Maps Full List Modal */}
            {isStuckMapsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-surface rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 border border-surface-border">
                        <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-2xl">
                            <div>
                                <h2 className="font-bold text-main">Lista Completa de Mapas Parados</h2>
                                <p className="text-[10px] text-muted font-bold uppercase tracking-widest">{stuckMapsList.length} Territórios Identificados</p>
                            </div>
                            <button
                                onClick={() => setIsStuckMapsModalOpen(false)}
                                className="p-2 text-muted hover:text-main hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                {stuckMapsList.map((map, idx) => (
                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <div>
                                            <p className="font-bold text-main text-sm">
                                                {map.name}{map.description ? ` - ${map.description}` : ''}
                                            </p>
                                            <p className="text-xs text-muted mt-0.5">Com: {map.assignee}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-red-600 dark:text-red-400 text-sm">{map.days} dias</p>
                                            <p className="text-[10px] text-muted font-bold uppercase">Sem trabalho</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t border-surface-border bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
                            <button
                                onClick={() => setIsStuckMapsModalOpen(false)}
                                className="w-full bg-primary py-3 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-transform"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
