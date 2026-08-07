// app/admin/logs/page.tsx
// Visualização administrativa de Logs do Sistema (Integração Datatable + Drawer de Detalhes)

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getSystemLogsQuery as getSystemLogs, SystemLog, LogLevel, LogCategory } from '@/lib/contracts/mutations/auditMutations';
import {
    Terminal,
    ChevronLeft,
    Search,
    AlertTriangle,
    Info,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Calendar,
    User as UserIcon,
    Loader2,
    FileSpreadsheet,
    FileCode,
    Filter,
    Clock,
    Fingerprint,
    Globe,
    X,
    ArrowRight,
    Tag
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import BottomNav from '@/app/components/BottomNav';

const LEVEL_CONFIG: Record<LogLevel, { label: string, badge: string, icon: any }> = {
    'INFO': { label: 'INFO', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800', icon: Info },
    'WARN': { label: 'WARN', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800', icon: AlertTriangle },
    'ERROR': { label: 'ERROR', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800', icon: AlertCircle },
    'SUCCESS': { label: 'SUCCESS', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', icon: CheckCircle2 }
};

export default function SystemLogsAdminPage() {
    const { isAdminRoleGlobal, loading: authLoading } = useAuth();
    const router = useRouter();
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'ALL'>('ALL');
    const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'ALL'>('ALL');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

    useEffect(() => {
        if (!authLoading && !isAdminRoleGlobal) {
            router.push('/');
        } else if (!authLoading && isAdminRoleGlobal) {
            // Reinicia sempre que filtros de categoria ou level mudam (nova query no Firestore)
            fetchLogs(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAdminRoleGlobal, router, selectedCategory, selectedLevel]);

    const fetchLogs = async (reset = false) => {
        const isFirstPage = reset || lastDoc === null;
        if (isFirstPage) {
            setLoadingLogs(true);
            setLogs([]);
            setLastDoc(null);
        } else {
            setLoadingMore(true);
        }

        const opts: { pageSize: number; startAfterDoc?: any; category?: LogCategory; level?: LogLevel } = {
            pageSize: 50,
        };
        if (!isFirstPage && lastDoc) opts.startAfterDoc = lastDoc;
        if (selectedCategory !== 'ALL') opts.category = selectedCategory as LogCategory;
        if (selectedLevel !== 'ALL') opts.level = selectedLevel as LogLevel;

        const res = await getSystemLogs(opts);
        if (res.success && res.logs) {
            setLogs(prev => isFirstPage ? res.logs! : [...prev, ...res.logs!]);
            setLastDoc(res.lastDoc ?? null);
            setHasMore(res.hasMore ?? false);
        } else {
            toast.error(res.error || 'Erro ao carregar logs');
        }

        setLoadingLogs(false);
        setLoadingMore(false);
    };

    const filteredLogs = logs.filter(log => {
        // Busca textual em memória (sem índice Firestore)
        const matchesSearch = !searchTerm ||
            log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.user && log.user.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.correlationId && log.correlationId.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));

        // Filtro de datas em memória (sem índice composto)
        let matchesDate = true;
        if (log.timestampMs) {
            if (startDate) {
                const startMs = new Date(startDate).getTime();
                if (log.timestampMs < startMs) matchesDate = false;
            }
            if (endDate) {
                const endMs = new Date(endDate + 'T23:59:59').getTime();
                if (log.timestampMs > endMs) matchesDate = false;
            }
        }

        return matchesSearch && matchesDate;
    });

    const exportToCSV = () => {
        if (filteredLogs.length === 0) {
            toast.error("Nenhum log para exportar.");
            return;
        }

        const headers = ["ID", "TimestampMs", "Nível", "Categoria", "Ação", "Mensagem", "Usuário", "Role", "CorrelationID", "UserAgent", "Detalhes"];
        const rows = filteredLogs.map(l => [
            `"${l.id || ''}"`,
            `"${l.timestampMs || ''}"`,
            `"${l.level}"`,
            `"${l.category}"`,
            `"${l.action}"`,
            `"${l.message.replace(/"/g, '""')}"`,
            `"${l.user || ''}"`,
            `"${l.role || ''}"`,
            `"${l.correlationId || ''}"`,
            `"${(l.userAgent || '').replace(/"/g, '""')}"`,
            `"${(l.details || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `system_logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Logs exportados em CSV com sucesso!");
    };

    const exportToJSON = () => {
        if (filteredLogs.length === 0) {
            toast.error("Nenhum log para exportar.");
            return;
        }

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(filteredLogs, null, 2))}`;
        const link = document.createElement("a");
        link.setAttribute("href", jsonString);
        link.setAttribute("download", `system_logs_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Logs exportados em JSON com sucesso!");
    };

    const renderDiffPills = (detailsStr: string) => {
        if (!detailsStr) return null;

        // 1. Formatações de diffs (ex: Cargo: "PUBLICADOR" -> "ANCIAO")
        const diffRegex = /([a-zA-Z0-9_-]+):\s*"([^"]*)"\s*->\s*"([^"]*)"/g;
        const matches = Array.from(detailsStr.matchAll(diffRegex));

        if (matches.length > 0) {
            const formatIfDate = (val: string) => {
                if (!val || val === 'Vazio') return val;
                // Detecta se é ISO String (ex: 2026-08-06T14:28:41.413Z)
                if (val.includes('T') && val.endsWith('Z')) {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) return d.toLocaleString('pt-BR');
                }
                return val;
            };

            return (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-muted uppercase tracking-wider">Alterações Visuais (Diff)</p>
                    <div className="flex flex-wrap gap-2">
                        {matches.map((m, idx) => {
                            const oldFormatted = formatIfDate(m[2]);
                            const newFormatted = formatIfDate(m[3]);

                            return (
                                <div key={idx} className="flex items-center gap-1.5 bg-surface border border-surface-border px-2.5 py-1 rounded-lg text-xs font-mono">
                                    <span className="font-semibold text-main">{m[1]}:</span>
                                    <span className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded text-[11px] line-through">
                                        {oldFormatted || 'Vazio'}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-muted" />
                                    <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[11px] font-bold">
                                        {newFormatted || 'Vazio'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // 2. Formatação de exclusão em cascata (Itens Removidos em Lista)
        if (detailsStr.includes('Itens Removidos ->')) {
            const parts = detailsStr.split('|').map(s => s.trim());
            const subItems = parts.slice(0, -1);
            const idPart = parts[parts.length - 1];

            const parsedItems = subItems.map(item => {
                const cleanText = item.replace('Itens Removidos ->', '').trim();
                const [label, countStr] = cleanText.split(':').map(s => s.trim());
                return { label, count: Number(countStr) || 0 };
            }).filter(i => i.label);

            const activeDeletions = parsedItems.filter(i => i.count > 0);

            return (
                <div className="space-y-3 bg-background border border-surface-border p-4 rounded-xl">
                    <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
                        <p className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Relatório de Exclusão em Cascata
                        </p>
                        {idPart && idPart.startsWith('ID:') && (
                            <span className="font-mono text-[10px] text-muted bg-surface px-2 py-0.5 rounded border border-surface-border">
                                {idPart}
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        {activeDeletions.length === 0 ? (
                            <p className="text-xs text-muted font-medium py-1">
                                Nenhuma entidade vinculada foi afetada (cidade/bairro estava sem territórios cadastrados).
                            </p>
                        ) : (
                            activeDeletions.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-surface border border-surface-border px-3 py-2 rounded-lg text-xs font-mono">
                                    <span className="font-medium text-main flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        {item.label}
                                    </span>
                                    <span className="font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                        {item.count} {item.count === 1 ? 'item removido' : 'itens removidos'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-background border border-surface-border p-3 rounded-xl text-xs font-mono text-muted break-all">
                {detailsStr}
            </div>
        );
    };

    if (authLoading || (!isAdminRoleGlobal && !authLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24 font-sans text-main">
            {/* Header */}
            <header className="bg-surface border-b border-surface-border sticky top-0 z-30 px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/settings" className="p-2 hover:bg-background rounded-full transition-colors">
                            <ChevronLeft className="w-6 h-6 text-muted" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/30">
                                <Terminal className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-main tracking-tight">Logs do Sistema</h1>
                                <p className="text-xs text-muted font-medium">Auditoria centralizada e histórico de segurança</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={exportToCSV}
                            className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            CSV
                        </button>
                        <button 
                            onClick={exportToJSON}
                            className="flex items-center gap-1.5 text-xs font-bold bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 px-3 py-2 rounded-lg transition-colors"
                        >
                            <FileCode className="w-3.5 h-3.5" />
                            JSON
                        </button>
                        <button 
                            onClick={() => fetchLogs(true)}
                            disabled={loadingLogs}
                            className="flex items-center gap-2 text-xs font-bold bg-surface border border-surface-border hover:bg-background px-3 py-2 rounded-lg transition-colors text-muted hover:text-main disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                            Atualizar
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
                {/* Filters Panel */}
                <div className="bg-surface border border-surface-border p-4 rounded-2xl shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2 relative">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar por mensagem, usuário, CID ou detalhes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-background border border-surface-border rounded-xl text-sm focus:outline-none focus:border-primary text-main placeholder:text-muted"
                            />
                        </div>

                        <div>
                            <select
                                value={selectedLevel}
                                onChange={(e) => {
                                    setSelectedLevel(e.target.value as LogLevel | 'ALL');
                                }}
                                className="w-full py-2 px-3 bg-background border border-surface-border rounded-xl text-sm focus:outline-none focus:border-primary text-main"
                            >
                                <option value="ALL">Todos os Níveis (Severity)</option>
                                <option value="INFO">INFO</option>
                                <option value="WARN">WARN</option>
                                <option value="ERROR">ERROR</option>
                                <option value="SUCCESS">SUCCESS</option>
                            </select>
                        </div>

                        <div>
                            <select
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value as LogCategory | 'ALL');
                                }}
                                className="w-full py-2 px-3 bg-background border border-surface-border rounded-xl text-sm focus:outline-none focus:border-primary text-main"
                            >
                                <option value="ALL">Todas as Categorias</option>
                                <option value="TERRITORY">TERRITORY (Territórios/Endereços)</option>
                                <option value="CONGREGATION">CONGREGATION (Congregações)</option>
                                <option value="MEMBERS">MEMBERS (Membros/Privilégios)</option>
                                <option value="ASSIGNMENTS">ASSIGNMENTS (Designações)</option>
                                <option value="WITNESSING">WITNESSING (Testemunho)</option>
                                <option value="REPORTS">REPORTS (Relatórios S-13)</option>
                                <option value="AUTH">AUTH (Autenticação/Segurança)</option>
                                <option value="ADMIN">ADMIN (Administração)</option>
                            </select>
                        </div>
                    </div>

                    {/* Date Range Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-surface-border text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="font-bold flex items-center gap-1 text-muted">
                                <Filter className="w-3.5 h-3.5 text-primary" />
                                Período:
                            </span>
                            <div className="flex items-center gap-1.5">
                                <label className="text-muted">De:</label>
                                <input 
                                    type="date" 
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="py-1 px-2 bg-background border border-surface-border rounded-lg text-xs text-main cursor-pointer"
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label className="text-muted">Até:</label>
                                <input 
                                    type="date" 
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="py-1 px-2 bg-background border border-surface-border rounded-lg text-xs text-main cursor-pointer"
                                />
                            </div>
                            {(startDate || endDate) && (
                                <button
                                    onClick={() => { setStartDate(''); setEndDate(''); }}
                                    className="text-xs text-red-500 hover:underline font-semibold"
                                >
                                    Limpar Datas
                                </button>
                            )}
                        </div>

                        <span className="text-muted font-mono font-medium">
                            {filteredLogs.length} evento{filteredLogs.length !== 1 ? 's' : ''} carregados
                            {hasMore && <span className="text-primary"> · há mais</span>}
                        </span>
                    </div>
                </div>

                {/* Datatable Compacta */}
                <div className="bg-surface border border-surface-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-surface-border bg-background/50 text-[11px] font-bold text-muted uppercase tracking-wider">
                                    <th className="py-3 px-4">Nível</th>
                                    <th className="py-3 px-4">Data / Hora</th>
                                    <th className="py-3 px-4">Módulo</th>
                                    <th className="py-3 px-4">Mensagem / Ação</th>
                                    <th className="py-3 px-4">Usuário</th>
                                    <th className="py-3 px-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border text-xs font-medium">
                                {loadingLogs ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-muted">
                                            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                                            <p className="text-sm font-medium">Carregando logs...</p>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-muted">
                                            <Terminal className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                            <p className="font-bold text-sm">Nenhum evento registrado</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => {
                                        const levelInfo = LEVEL_CONFIG[log.level] || LEVEL_CONFIG['INFO'];
                                        const LevelIcon = levelInfo.icon;

                                        return (
                                            <tr 
                                                key={log.id} 
                                                onClick={() => setSelectedLog(log)}
                                                className="hover:bg-background/60 cursor-pointer transition-colors"
                                            >
                                                <td className="py-2.5 px-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${levelInfo.badge}`}>
                                                        <LevelIcon className="w-3 h-3" />
                                                        {levelInfo.label}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px] text-muted">
                                                    {log.timestamp}
                                                    {log.timestampMs && (
                                                        <span className="ml-1 text-[10px] text-muted/60">
                                                            ({log.timestampMs % 1000}ms)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-4 whitespace-nowrap">
                                                    <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                                                        {log.category}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4 text-main font-medium leading-relaxed">
                                                    {log.message}
                                                </td>
                                                <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px] text-muted">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{log.user || 'Sistema'}</span>
                                                        {log.role && (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                                                log.role === 'ADMIN' ? 'bg-red-500/15 text-red-400' :
                                                                log.role === 'ANCIAO' ? 'bg-purple-500/15 text-purple-400' :
                                                                log.role === 'SERVO' ? 'bg-blue-500/15 text-blue-400' :
                                                                'bg-emerald-500/15 text-emerald-400'
                                                            }`}>
                                                                {log.role}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4 whitespace-nowrap text-right text-primary font-bold text-[11px]">
                                                    Inspecionar
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Botão Carregar Mais */}
                {hasMore && (
                    <div className="flex justify-center pt-2 pb-4">
                        <button
                            onClick={() => fetchLogs(false)}
                            disabled={loadingMore}
                            className="flex items-center gap-2 text-sm font-bold bg-surface border border-surface-border hover:bg-background px-6 py-3 rounded-xl transition-colors text-muted hover:text-main disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</>
                            ) : (
                                <><RefreshCw className="w-4 h-4" /> Carregar mais 50 eventos</>
                            )}
                        </button>
                    </div>
                )}
            </main>

            {/* Modal / Drawer de Detalhes do Log */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
                    <div className="w-full max-w-xl bg-surface h-full shadow-2xl border-l border-surface-border flex flex-col p-6 overflow-y-auto space-y-6">
                        <div className="flex items-center justify-between border-b border-surface-border pb-4">
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${LEVEL_CONFIG[selectedLog.level]?.badge}`}>
                                    {selectedLog.level}
                                </span>
                                <span className="font-mono text-xs font-bold text-muted bg-background px-2 py-1 rounded border border-surface-border">
                                    {selectedLog.category}
                                </span>
                            </div>
                            <button 
                                onClick={() => setSelectedLog(null)}
                                className="p-1.5 hover:bg-background rounded-lg transition-colors text-muted"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <h2 className="text-base font-bold text-main">{selectedLog.message}</h2>
                            <p className="text-xs text-muted font-mono mt-1">ID Evento: {selectedLog.id || 'N/A'}</p>
                        </div>

                        {/* Informações Técnicas */}
                        <div className="bg-background border border-surface-border rounded-xl p-4 space-y-3 text-xs font-mono">
                            <div className="flex items-center justify-between">
                                <span className="text-muted flex items-center gap-1">
                                    <UserIcon className="w-3.5 h-3.5 text-primary" /> Usuário / Ator:
                                </span>
                                <span className="font-bold text-main">{selectedLog.user || 'Sistema'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted flex items-center gap-1">
                                    <Tag className="w-3.5 h-3.5 text-primary" /> Privilégio no Momento da Ação:
                                </span>
                                <span className="font-bold text-primary uppercase">{selectedLog.role || 'Não registrado'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-primary" /> Data / Hora:
                                </span>
                                <span className="text-main">{selectedLog.timestamp}</span>
                            </div>
                            {/* Timestamp legível exibido acima em Data / Hora */}
                            {selectedLog.correlationId && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted flex items-center gap-1">
                                        <Fingerprint className="w-3.5 h-3.5 text-primary" /> Correlation ID:
                                    </span>
                                    <span className="text-primary font-bold">{selectedLog.correlationId}</span>
                                </div>
                            )}
                            {selectedLog.userAgent && (
                                <div className="space-y-1 pt-2 border-t border-surface-border">
                                    <span className="text-muted flex items-center gap-1">
                                        <Globe className="w-3.5 h-3.5 text-primary" /> User-Agent / Origem:
                                    </span>
                                    <p className="text-[11px] text-muted break-all bg-surface p-2 rounded border border-surface-border">
                                        {selectedLog.userAgent}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Diff Visual / Detalhes */}
                        {selectedLog.details && (
                            <div className="space-y-2">
                                {renderDiffPills(selectedLog.details)}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <BottomNav />
        </div>
    );
}
