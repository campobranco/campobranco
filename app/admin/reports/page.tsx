// app/admin/reports/page.tsx
// Página administrativa para gerenciar relatórios de erros visuais (Screenshots)
// Migrado de Supabase para Firebase Firestore (Client SDK)

"use client";

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Loader2, Bug, CheckCircle2, Clock, MapPin, Monitor } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';
import Link from 'next/link';

interface Report {
    id: string;
    description: string;
    screenshot: string;
    userId: string;
    userName: string;
    url: string;
    userAgent: string;
    createdAt: any;
    status: 'open' | 'resolved';
}

export default function AdminReportsPage() {
    const { isAdminRoleGlobal, loading: authLoading } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAdminRoleGlobal) {
            setLoading(true);
            const reportsRef = collection(db, 'error_reports');
            const q = query(reportsRef, orderBy('createdAt', 'desc'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Report[];
                setReports(data);
                setLoading(false);
            }, (error) => {
                console.error("Error listening to reports:", error);
                // Tenta buscar sem ordenação se falhar por índice
                const qSimple = query(reportsRef);
                onSnapshot(qSimple, (snap) => {
                    const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Report[];
                    setReports(data);
                    setLoading(false);
                });
            });

            return () => unsubscribe();
        }
    }, [isAdminRoleGlobal]);

    const handleResolve = async (id: string) => {
        try {
            const reportRef = doc(db, 'error_reports', id);
            await updateDoc(reportRef, { status: 'resolved' });
            toast.success("Relatório marcado como resolvido.");
        } catch (error) {
            console.error("Error resolving report:", error);
            toast.error("Erro ao resolver relatório.");
        }
    };

    if (authLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    if (!isAdminRoleGlobal) return <div className="p-8 text-center">Acesso Negado</div>;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 bg-background min-h-screen text-main font-sans">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
                        <Bug className="w-8 h-8 text-red-500" />
                        Relatórios de Erros
                    </h1>
                    <p className="text-muted mt-1 font-medium">Gerencie os bugs reportados visualmente pelos usuários.</p>
                </div>
                <Link href="/dashboard" className="px-5 py-2.5 rounded-xl bg-surface border border-surface-border text-sm font-bold hover:bg-surface-highlight transition-all active:scale-95 shadow-sm">
                    Voltar
                </Link>
            </header>

            {loading ? (
                <div className="text-center py-24">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-muted font-bold">Buscando relatórios no Firebase...</p>
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-surface-border">
                    <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
                    <h2 className="text-xl font-bold mb-2">Tudo Limpo!</h2>
                    <p className="text-muted">Nenhum relatório de erro encontrado no Firestore.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 pb-20">
                    {reports.map((report) => {
                        const date = report.createdAt?.toDate ? report.createdAt.toDate() : (report.createdAt ? new Date(report.createdAt) : new Date());
                        return (
                            <div key={report.id} className={`bg-surface rounded-3xl border transition-all duration-300 ${report.status === 'resolved' ? 'border-emerald-100 dark:border-emerald-900/10 opacity-60 grayscale-[0.5]' : 'border-red-50 dark:border-red-900/10 shadow-lg shadow-black/5 hover:shadow-xl'}`}>
                                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                                    {/* Screenshot Preview */}
                                    <div className="md:w-1/3 shrink-0">
                                        <div className="aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-surface-border relative group shadow-inner">
                                            <img src={report.screenshot} alt="Screenshot" className="w-full h-full object-contain" />
                                            <a
                                                href={report.screenshot}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold text-white text-xs backdrop-blur-sm"
                                            >
                                                Ver Imagem Original
                                            </a>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 space-y-5">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${report.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-50 text-red-600 dark:bg-red-900/30'}`}>
                                                        {report.status === 'resolved' ? 'Resolvido' : 'Pendente'}
                                                    </span>
                                                    <span className="text-[11px] text-muted flex items-center gap-1.5 font-bold">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {date.toLocaleString('pt-BR')}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-xl leading-tight text-main">{report.description}</h3>
                                            </div>
                                            {report.status !== 'resolved' && (
                                                <button
                                                    onClick={() => handleResolve(report.id)}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 shrink-0"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Marcar como Resolvido
                                                </button>
                                            )}
                                        </div>

                                        <div className="bg-background/50 rounded-2xl p-5 text-[11px] space-y-3 font-mono text-muted border border-surface-border">
                                            <div className="flex items-center gap-2.5">
                                                <MapPin className="w-4 h-4 text-primary opacity-60" />
                                                <span className="truncate max-w-md hover:text-primary transition-colors cursor-default" title={report.url}>{report.url}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <Monitor className="w-4 h-4 text-primary opacity-60" />
                                                <span className="truncate max-w-md" title={report.userAgent}>{report.userAgent}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5 border-t border-surface-border pt-3 mt-3">
                                                <span className="font-bold text-main px-2 py-0.5 rounded bg-surface border border-surface-border">Reportado por:</span>
                                                <span className="font-bold">{report.userName}</span>
                                                <span className="opacity-40 font-sans">({report.userId})</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
