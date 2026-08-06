// app/components/VisitHistoryModal.tsx
// Modal para exibição do histórico de visitas de um endereço
// Migrado de Supabase para Firebase Firestore (Client SDK)

"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, documentId } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import {
    X,
    ThumbsUp,
    ThumbsDown,
    Home,
    Hand,
    Loader2,
    Calendar,
    User,
    Ear,
    Baby,
    GraduationCap,
    Brain
} from 'lucide-react';

interface VisitHistoryModalProps {
    addressId: string;
    onClose: () => void;
    address?: string;
    isSharedView?: boolean;
    shareId?: string;
    sharedVisits?: any[];
    congregationType?: 'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE' | null;
}

export default function VisitHistoryModal({ 
    addressId, 
    onClose, 
    address, 
    isSharedView = false, 
    shareId,
    sharedVisits,
    congregationType 
}: VisitHistoryModalProps) {
    const [loading, setLoading] = useState(true);
    const [visits, setVisits] = useState<any[]>([]);
    const { user, congregationId } = useAuth();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!addressId) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                let rawVisits: any[] = [];
                
                if (isSharedView && sharedVisits) {
                    rawVisits = sharedVisits.filter((v: any) => v.addressId === addressId);
                } else {
                    const visitsRef = collection(db, 'visits');
                    const q = query(
                        visitsRef,
                        where('addressId', '==', addressId)
                    );

                    const snapshot = await getDocs(q);
                    rawVisits = snapshot.docs.map(d => ({
                        id: d.id,
                        ...d.data()
                    }));

                    // Se não houver visitas na coleção 'visits', consulta o documento do próprio endereço
                    if (rawVisits.length === 0) {
                        const addrSnap = await getDoc(doc(db, 'addresses', addressId));
                        if (addrSnap.exists()) {
                            const addrData = addrSnap.data();
                            if (addrData.visitStatus && addrData.visitStatus !== 'none') {
                                const visitDate = addrData.updatedAt?.toDate?.()?.toISOString() 
                                    || addrData.lastVisitedAt 
                                    || new Date().toISOString();
                                rawVisits.push({
                                    id: `addr-status-${addressId}`,
                                    addressId,
                                    status: addrData.visitStatus,
                                    visitDate,
                                    notes: addrData.observations || (addrData.visitStatus === 'doNotVisit' ? 'Endereço marcado como Pediu para não ser visitado' : 'Registro de status de visita'),
                                    publisherName: addrData.updatedBy || 'Sistema'
                                });
                            }
                        }
                    }
                }

                // Deduplicar visitas por ID único do documento
                const seenVisitIds = new Set<string>();
                rawVisits = rawVisits.filter((v: any) => {
                    if (!v.id || seenVisitIds.has(v.id)) return false;
                    seenVisitIds.add(v.id);
                    return true;
                });

                // Ordenação local descente por data da visita
                rawVisits.sort((a: any, b: any) => {
                    const dateA = new Date(a.visitDate || 0).getTime();
                    const dateB = new Date(b.visitDate || 0).getTime();
                    return dateB - dateA;
                });

                // Limita a 50
                rawVisits = rawVisits.slice(0, 50);

                // Busca nomes reais para os usuários de forma otimizada
                const userIds = Array.from(new Set(rawVisits.map((v: any) => v.userId).filter(id => id)));
                const userNamesMap = new Map<string, string>();

                if (userIds.length > 0) {
                    try {
                        // Nota: Firestore não tem 'in' para documentos simples, buscamos um por um ou via 'in' na coleção
                        const usersRef = collection(db, 'users');
                        // O limite de 'in' no Firestore é 30, o que é seguro aqui para 50 visitas
                        const userQuery = query(usersRef, where(documentId(), 'in', userIds.slice(0, 30)));
                        const userSnapshot = await getDocs(userQuery);

                        userSnapshot.docs.forEach(d => {
                            userNamesMap.set(d.id, d.data().name);
                        });
                    } catch (e) {
                        console.warn("[VISIT_HISTORY] Could not fetch real user names (possibly restricted shared view):", e);
                    }
                }

                const mergedVisits = rawVisits.map((v: any) => ({
                    ...v,
                    displayName: userNamesMap.get(v.userId) || v.userName || v.publisherName || 'Publicador',
                    visitDate: v.visitDate,
                    tagsSnapshot: v.tagsSnapshot
                }));

                setVisits(mergedVisits);
            } catch (error) {
                console.error("[VISIT_HISTORY] Error fetching from Firestore:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [addressId, isSharedView, user, congregationId, sharedVisits]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'contacted': return <ThumbsUp className="w-4 h-4 text-green-600" />;
            case 'notContacted': return <ThumbsDown className="w-4 h-4 text-red-600" />;
            case 'moved': return <Home className="w-4 h-4 text-blue-600" />;
            case 'doNotVisit': return <Hand className="w-4 h-4 text-red-600" />;
            default: return <div className="w-4 h-4 bg-gray-200 rounded-full" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'contacted': return congregationType === 'TRADITIONAL' ? 'Concluído' : 'Contatado';
            case 'notContacted': return 'Não Contatado';
            case 'moved': return 'Mudou-se';
            case 'doNotVisit': return 'Não Visitar';
            default: return status;
        }
    };

    if (!addressId || !isMounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface rounded-lg w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Histórico</h2>
                        {address && <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-[200px]">{address}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary-light/500" /></div>
                    ) : visits.length === 0 ? (
                        <div className="text-center py-8 opacity-50">
                            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum registro encontrado.</p>
                        </div>
                    ) : (
                        visits.map((visit) => (
                            <div key={visit.id} className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700`}>
                                            {getStatusIcon(visit.status)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">{getStatusLabel(visit.status)}</p>
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                                                    {visit.visitDate ? new Date(visit.visitDate).toLocaleDateString() : 'Data desconhecida'}
                                                </p>
                                                {/* Tags Snapshot Display */}
                                                {visit.tagsSnapshot?.isDeaf && <span title="Surdo"><Ear className="w-3 h-3 text-yellow-600 dark:text-yellow-400" /></span>}
                                                {visit.tagsSnapshot?.isMinor && <span title="Menor"><Baby className="w-3 h-3 text-primary dark:text-blue-400" /></span>}
                                                {visit.tagsSnapshot?.isStudent && <span title="Estudante"><GraduationCap className="w-3 h-3 text-purple-600 dark:text-purple-400" /></span>}
                                                {visit.tagsSnapshot?.isNeurodivergent && <span title="Neurodivergente"><Brain className="w-3 h-3 text-teal-600 dark:text-teal-400" /></span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] bg-white dark:bg-slate-800 px-2 py-1 rounded-full text-gray-500 dark:text-gray-400 font-bold border border-gray-200 dark:border-slate-700">
                                        <User className="w-3 h-3" />
                                        <span className="truncate max-w-[80px] uppercase tracking-wider">{visit.displayName}</span>
                                    </div>
                                </div>
                                {visit.notes && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 mt-2 italic">
                                        &quot;{visit.notes}&quot;
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
