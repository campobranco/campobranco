"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    History,
    User,
    Calendar,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { getTerritoryHistory } from '@/lib/services/territories';

interface TerritoryHistoryModalProps {
    territoryId: string;
    territoryName: string;
    congregationId: string | null;
    onClose: () => void;
}

interface HistoryEntry {
    id: string;
    created_by: string;
    user_name?: string;
    created_at: string;
    returned_at: string | null;
    status: string;
}

export default function TerritoryHistoryModal({ territoryId, territoryName, congregationId: targetCongregationId, onClose }: TerritoryHistoryModalProps) {
    const { congregationId: authCongregationId } = useAuth();
    const congregationId = targetCongregationId || authCongregationId;
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                if (!congregationId || !territoryId) return;

                const res = await getTerritoryHistory(congregationId, territoryId);
                
                if (!res.success) throw new Error(res.error || "Erro ao buscar histórico");

                const entries: HistoryEntry[] = (res.data || []).map((item: any) => ({
                    id: item.id,
                    created_by: item.created_by || item.createdBy,
                    user_name: item.assigned_name || item.assignedName || 'Usuário',
                    created_at: item.created_at || item.createdAt || item.assignedAt,
                    returned_at: item.returned_at || item.returnedAt,
                    status: item.status || 'active'
                }));

                setHistory(entries);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching territory history:", error);
                setLoading(false);
            }
        };

        fetchHistory();
    }, [territoryId, congregationId]);

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        const d = date.toDate ? date.toDate() : new Date(date);
        if (isNaN(d.getTime())) return 'N/A';
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    if (!isMounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface rounded-lg w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-main">Histórico do Território</h2>
                        <p className="text-sm text-muted font-medium">{territoryName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-background rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-light/500" />
                            <p className="text-sm text-muted font-medium">Carregando histórico...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-12 opacity-50 bg-background rounded-lg border-2 border-dashed border-surface-border">
                            <History className="w-12 h-12 mx-auto mb-3 text-muted" />
                            <p className="text-muted font-medium">Nenhum registro de fechamento encontrado.</p>
                        </div>
                    ) : (
                        history.map((entry) => (
                            <div key={entry.id} className="bg-background p-5 rounded-lg border border-surface-border shadow-sm hover:border-primary-light/500/30 transition-all">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-primary-light/50 dark:bg-primary-light/500/10 rounded-lg flex items-center justify-center text-primary dark:text-blue-400 shadow-sm">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest leading-none mb-1">Responsável</p>
                                        <p className="font-bold text-main truncate">{entry.user_name}</p>
                                    </div>
                                    <div className="ml-auto">
                                        {entry.status === 'completed' ? (
                                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">Concluído</span>
                                        ) : (
                                            <span className="bg-primary-light dark:bg-blue-900/30 text-primary-dark dark:text-blue-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">Em andamento</span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-border">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-muted">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Início</span>
                                        </div>
                                        <p className="text-sm font-bold text-main pl-5">{formatDate(entry.created_at)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-muted">
                                            <CheckCircle2 className={`w-3.5 h-3.5 ${entry.status === 'completed' ? 'text-green-500' : 'text-muted'}`} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Devolução</span>
                                        </div>
                                        <p className="text-sm font-bold text-main pl-5">{entry.status === 'completed' ? formatDate(entry.returned_at) : 'Pendente'}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-surface-border shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white font-bold py-3.5 rounded-lg transition-all active:scale-95 shadow-lg shadow-gray-200 dark:shadow-none"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
