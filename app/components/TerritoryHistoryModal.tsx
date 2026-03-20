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
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';

interface TerritoryHistoryModalProps {
    territoryId: string;
    territoryName: string;
    congregationId: string | null;
    onClose: () => void;
}

interface HistoryEntry {
    id: string;
    createdBy: string;
    userName?: string;
    createdAt: string;
    returnedAt: string | null;
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

                const rawData = res.data || [];
                
                // Busca nomes reais para os usuários de forma otimizada
                const userIds = Array.from(new Set(rawData.map((item: any) => item.assignedTo).filter(id => id)));
                const userNamesMap = new Map<string, string>();

                if (userIds.length > 0) {
                    const usersRef = collection(db, 'users');
                    // O limite de 'in' no Firestore é 30
                    const userQuery = query(usersRef, where(documentId(), 'in', userIds.slice(0, 30)));
                    const userSnapshot = await getDocs(userQuery);

                    userSnapshot.docs.forEach(d => {
                        userNamesMap.set(d.id, d.data().name);
                    });
                }

                const entries: HistoryEntry[] = rawData.map((item: any) => ({
                    id: item.id,
                    createdBy: item.createdBy,
                    userName: item.assignedName || userNamesMap.get(item.assignedTo) || '',
                    createdAt: item.createdAt || item.assignedAt,
                    returnedAt: item.returnedAt,
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

    if (!isMounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-xl">
                            <History className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-main">Histórico</h2>
                            <p className="text-xs text-muted font-medium">Território: {territoryName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-muted hover:text-main"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm font-medium">Carregando histórico...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted text-center">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full">
                                <History className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-sm font-medium">Nenhum histórico encontrado para este território.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 before:border-l-2 before:border-gray-100 dark:before:border-gray-800 before:pointer-events-none">
                            {history.map((entry, index) => (
                                <div key={entry.id} className="relative pl-10 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                                    {/* Icon Indicator */}
                                    <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center z-10 ${
                                        entry.status === 'completed' 
                                        ? 'bg-green-500 shadow-sm shadow-green-200 dark:shadow-none' 
                                        : 'bg-primary shadow-sm shadow-blue-200 dark:shadow-none'
                                    }`}>
                                        {entry.status === 'completed' 
                                            ? <CheckCircle2 className="w-4 h-4 text-white" />
                                            : <User className="w-4 h-4 text-white" />
                                        }
                                    </div>

                                    {/* Entry Card */}
                                    <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-100 dark:border-gray-800 hover:border-primary/30 transition-colors">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-main">{entry.userName}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                                    entry.status === 'completed'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                    {entry.status === 'completed' ? 'Concluído' : 'Em Aberto'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2 text-muted">
                                                <Calendar className="w-4 h-4" />
                                                <span className="text-xs font-medium">
                                                    Saída: {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '---'}
                                                </span>
                                            </div>
                                            {entry.returnedAt && (
                                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span className="text-xs font-bold">
                                                        Retorno: {new Date(entry.returnedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-main hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
