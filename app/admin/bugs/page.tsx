// app/admin/bugs/page.tsx
// Página administrativa para gerenciar relatos de erros (Bugs)
// Migrado de Supabase para Firebase Firestore (Client SDK)

"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import {
    Bug,
    ChevronLeft,
    Clock,
    CheckCircle2,
    AlertCircle,
    PauseCircle,
    MessageSquare,
    User as UserIcon,
    Monitor,
    Loader2,
    Search,
    Calendar,
    ArrowRight,
    X
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type BugStatus = 'NEW' | 'VIEWED' | 'DEFERRED' | 'ACCEPTED' | 'RESOLVED';

interface BugReport {
    id: string;
    userId: string;
    title: string;
    description: string;
    deviceInfo?: any;
    status: BugStatus;
    adminNotes?: string;
    createdAt: any;
    updatedAt: any;
    user?: {
        name: string;
        email: string;
    }
}

const STATUS_CONFIG: Record<BugStatus, { label: string, color: string, icon: any }> = {
    'NEW': { label: 'Novo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: AlertCircle },
    'VIEWED': { label: 'Visualizado', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: Clock },
    'DEFERRED': { label: 'Deferido', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: PauseCircle },
    'ACCEPTED': { label: 'Aceito', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: CheckCircle2 },
    'RESOLVED': { label: 'Resolvido', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
};

export default function BugReportsAdminPage() {
    const { isAdminRoleGlobal, loading: authLoading } = useAuth();
    const [reports, setReports] = useState<BugReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<BugStatus | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
    const [updating, setUpdating] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && isAdminRoleGlobal) {
            fetchReports();
        }
    }, [isAdminRoleGlobal, authLoading]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const reportsRef = collection(db, 'bug_reports');
            const q = query(reportsRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            const rawReports = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

            // Busca usuários envolvidos para o "join" manual
            const userIds = Array.from(new Set(rawReports.map(r => r.userId).filter(Boolean)));
            const userMap: Record<string, { name: string, email: string }> = {};

            // Busca perfis de usuários em paralelo
            await Promise.all(userIds.map(async (uid) => {
                const uDoc = await getDoc(doc(db, 'users', uid as string));
                if (uDoc.exists()) {
                    const ud = uDoc.data();
                    userMap[uid as string] = { name: ud.name || 'Usuário', email: ud.email || '' };
                }
            }));

            const dataWithUsers = rawReports.map(r => ({
                id: r.id,
                ...r,
                userId: r.userId,
                deviceInfo: r.deviceInfo,
                adminNotes: r.adminNotes || '',
                createdAt: r.createdAt,
                user: userMap[r.userId]
            })) as BugReport[];

            setReports(dataWithUsers);
        } catch (error: any) {
            console.error("Error fetching bugs:", error);
            // Fallback se orderBy falhar por falta de índice
            try {
                const snapshot = await getDocs(collection(db, 'bug_reports'));
                const rawReports = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
                setReports(rawReports);
            } catch (e) {
                toast.error("Erro ao carregar relatos de bugs.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: BugStatus) => {
        setUpdating(true);
        try {
            const reportRef = doc(db, 'bug_reports', id);
            await updateDoc(reportRef, {
                status: newStatus,
                adminNotes: adminNotes,
                updatedAt: new Date()
            });

            setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus, adminNotes: adminNotes } : r));
            if (selectedReport?.id === id) {
                setSelectedReport(prev => prev ? { ...prev, status: newStatus, adminNotes: adminNotes } : null);
            }
            toast.success("Status atualizado com sucesso!");
        } catch (error: any) {
            console.error("Error updating status:", error);
            toast.error("Erro ao atualizar status.");
        } finally {
            setUpdating(false);
        }
    };

    const filteredReports = reports.filter(r => {
        const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
        const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

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
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/settings" className="p-2 hover:bg-background rounded-full transition-colors">
                            <ChevronLeft className="w-6 h-6 text-muted" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-500 p-2 rounded-xl text-white shadow-lg shadow-orange-500/30">
                                <Bug className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-main tracking-tight">Bug Reports</h1>
                                <p className="text-xs text-muted font-medium">Gestão de erros relatados pelos usuários</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* List Sidebar */}
                    <div className="w-full lg:w-[400px] space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <input
                                type="text"
                                placeholder="Buscar nos relatos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-surface border border-surface-border rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <button
                                onClick={() => setFilterStatus('ALL')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${filterStatus === 'ALL' ? 'bg-primary text-white border-primary' : 'bg-surface text-muted border-surface-border hover:border-primary/50'}`}
                            >
                                Todos
                            </button>
                            {(Object.keys(STATUS_CONFIG) as BugStatus[]).map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${filterStatus === status ? 'bg-primary text-white border-primary' : 'bg-surface text-muted border-surface-border hover:border-primary/50'}`}
                                >
                                    {STATUS_CONFIG[status].label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto pr-2 custom-scrollbar">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="bg-surface p-4 rounded-xl border border-surface-border animate-pulse h-24" />
                                ))
                            ) : filteredReports.length === 0 ? (
                                <div className="text-center py-12 bg-surface rounded-xl border border-dashed border-surface-border">
                                    <Bug className="w-10 h-10 mx-auto mb-2 text-muted opacity-20" />
                                    <p className="text-sm text-muted">Nenhum bug encontrado</p>
                                </div>
                            ) : (
                                filteredReports.map(report => {
                                    const StatusIcon = STATUS_CONFIG[report.status].icon;
                                    const date = report.createdAt?.toDate ? report.createdAt.toDate() : (report.createdAt ? new Date(report.createdAt) : new Date());
                                    return (
                                        <button
                                            key={report.id}
                                            onClick={() => {
                                                setSelectedReport(report);
                                                setAdminNotes(report.adminNotes || '');
                                            }}
                                            className={`w-full text-left p-4 rounded-xl border transition-all ${selectedReport?.id === report.id ? 'bg-primary/5 border-primary shadow-sm' : 'bg-surface border-surface-border hover:border-primary/30'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1 ${STATUS_CONFIG[report.status].color}`}>
                                                    <StatusIcon className="w-2.5 h-2.5" />
                                                    {STATUS_CONFIG[report.status].label}
                                                </span>
                                                <span className="text-[10px] text-muted flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(date, 'dd/MM')}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-sm text-main line-clamp-1 mb-1">{report.title}</h3>
                                            <p className="text-xs text-muted line-clamp-2">{report.description}</p>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Report Content */}
                    <div className="flex-1 min-h-[500px]">
                        {selectedReport ? (
                            <div className="bg-surface rounded-2xl border border-surface-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="p-6 border-b border-surface-border">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-main mb-1">{selectedReport.title}</h2>
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted font-medium">
                                                <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md border border-surface-border">
                                                    <UserIcon className="w-3.5 h-3.5 text-primary" />
                                                    {selectedReport.user?.name || 'Sistema'}
                                                    <span className="opacity-50">•</span>
                                                    {selectedReport.user?.email}
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-background px-2 py-1 rounded-md border border-surface-border">
                                                    <Clock className="w-3.5 h-3.5 text-primary/60" />
                                                    {format(selectedReport.createdAt?.toDate ? selectedReport.createdAt.toDate() : new Date(selectedReport.createdAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={selectedReport.status}
                                                onChange={(e) => handleUpdateStatus(selectedReport.id, e.target.value as BugStatus)}
                                                disabled={updating}
                                                className={`text-sm font-bold py-2 px-4 rounded-xl border outline-none transition-all cursor-pointer ${STATUS_CONFIG[selectedReport.status].color} border-current`}
                                            >
                                                {(Object.keys(STATUS_CONFIG) as BugStatus[]).map(status => (
                                                    <option key={status} value={status} className="bg-surface text-main">
                                                        Mudar para: {STATUS_CONFIG[status].label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-background rounded-xl p-5 border border-surface-border">
                                        <div className="flex items-center gap-2 mb-3 text-primary">
                                            <MessageSquare className="w-4 h-4" />
                                            <h3 className="text-xs font-bold uppercase tracking-widest">Descrição do Problema</h3>
                                        </div>
                                        <p className="text-sm text-main leading-relaxed whitespace-pre-wrap">
                                            {selectedReport.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {selectedReport.deviceInfo && (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="bg-background/50 p-4 rounded-xl border border-surface-border">
                                                    <div className="flex items-center gap-2 mb-3 text-muted">
                                                        <Monitor className="w-4 h-4" />
                                                        <h3 className="text-[10px] font-bold uppercase tracking-widest">Informações do Dispositivo</h3>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-y-2">
                                                        {Object.entries(selectedReport.deviceInfo).map(([key, value]: [string, any]) => {
                                                            if (key === 'consoleLogs') return null;
                                                            return (
                                                                <div key={key}>
                                                                    <p className="text-[10px] text-muted uppercase font-bold">{key}</p>
                                                                    <p className="text-xs font-mono font-bold text-main">{String(value)}</p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="bg-background/50 p-4 rounded-xl border border-surface-border">
                                                    <div className="flex items-center gap-2 mb-3 text-muted">
                                                        <ArrowRight className="w-4 h-4" />
                                                        <h3 className="text-[10px] font-bold uppercase tracking-widest">Notas do Administrador</h3>
                                                    </div>
                                                    <textarea
                                                        value={adminNotes}
                                                        onChange={(e) => setAdminNotes(e.target.value)}
                                                        placeholder="Adicionar observações técnicas, causas ou soluções..."
                                                        className="w-full bg-surface border border-surface-border rounded-lg p-3 text-xs min-h-[100px] outline-none focus:ring-2 focus:ring-primary/20 transition-all text-main"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateStatus(selectedReport.id, selectedReport.status)}
                                                        disabled={updating || adminNotes === (selectedReport.adminNotes || '')}
                                                        className="mt-3 w-full bg-primary hover:bg-primary-dark text-white text-[10px] font-bold uppercase py-2 rounded-lg transition-all disabled:opacity-50"
                                                    >
                                                        {updating ? 'Salvando...' : 'Salvar Notas'}
                                                    </button>
                                                </div>
                                            </div>

                                            {selectedReport.deviceInfo?.consoleLogs && selectedReport.deviceInfo.consoleLogs.length > 0 && (
                                                <div className="bg-background/50 p-4 rounded-xl border border-surface-border">
                                                    <div className="flex items-center gap-2 mb-3 text-muted">
                                                        <MessageSquare className="w-4 h-4" />
                                                        <h3 className="text-[10px] font-bold uppercase tracking-widest">Conteúdo do Console (Últimos 50 logs)</h3>
                                                    </div>
                                                    <div className="bg-zinc-950 p-4 rounded-lg overflow-x-auto max-h-[300px] custom-scrollbar">
                                                        <pre className="text-[10px] font-mono leading-relaxed text-zinc-300">
                                                            {selectedReport.deviceInfo.consoleLogs.join('\n')}
                                                        </pre>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedReport.deviceInfo?.screenshot && (
                                                <div className="bg-background/50 p-4 rounded-xl border border-surface-border">
                                                    <div className="flex items-center gap-2 mb-3 text-muted">
                                                        <Monitor className="w-4 h-4" />
                                                        <h3 className="text-[10px] font-bold uppercase tracking-widest">Captura de Tela (Screenshot)</h3>
                                                    </div>
                                                    <div className="rounded-xl overflow-hidden border border-surface-border bg-black group relative cursor-zoom-in">
                                                        <img
                                                            src={selectedReport.deviceInfo.screenshot}
                                                            alt="Bug Screenshot"
                                                            className="w-full h-auto max-h-[600px] object-contain transition-transform duration-500 group-hover:scale-105"
                                                            onClick={() => setLightboxImage(selectedReport.deviceInfo.screenshot)}
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                            <p className="text-white text-xs font-bold bg-black/60 px-4 py-2 rounded-full">Clique para ampliar</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none py-20">
                                <Bug className="w-20 h-20 mb-4 text-muted" />
                                <h3 className="text-xl font-bold text-muted">Selecione um relato</h3>
                                <p className="text-sm text-muted">Clique em um item da lista para ver os detalhes</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Lightbox de Screenshot */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-7xl max-h-[95vh] w-full h-full flex items-center justify-center">
                        <button
                            onClick={() => setLightboxImage(null)}
                            className="absolute top-2 right-2 z-10 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img
                            src={lightboxImage}
                            alt="Screenshot ampliada"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
