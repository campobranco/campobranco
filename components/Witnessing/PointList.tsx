"use client";

import { useState } from 'react';
import { MapPin, Clock, MoreVertical, Edit, Trash2, ExternalLink, User, CheckCircle, AlertCircle } from 'lucide-react';
import { updateWitnessingPointStatus, deleteWitnessingPoint } from '@/lib/services/witnessing';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ConfirmationModal from '@/app/components/ConfirmationModal';

interface WitnessingPoint {
    id: string;
    name: string;
    address: string;
    status: string;
    schedule: string | null;
    currentPublishers: string | null;
    latitude: number;
    longitude: number;
}

interface PointListProps {
    points: WitnessingPoint[];
    isAdmin: boolean;
    currentUserId?: string;
    currentUserParams?: { name: string };
}

export default function PointList({ points, isAdmin, currentUserParams }: PointListProps) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    const handleCheckIn = async (point: WitnessingPoint) => {
        if (!currentUserParams?.name) {
            toast.error("Erro: Usuário não identificado");
            return;
        }
        setLoadingId(point.id);
        try {
            // Simple logic: if empty, add user. if occupied, append? 
            // Requirements imply "Em uso" by publishers.
            // Let's assume we overwrite or append. For prototype, we just set "Em uso" and current user.
            // For proper multi-user, we need to parse JSON.
            // Simplified: Set status OCCUPIED and name.

            // If already occupied, maybe join?
            // "Publicadores Atuais: Jady, Lídia"

            const currentNames = point.currentPublishers ? point.currentPublishers.split(', ') : [];
            if (!currentNames.includes(currentUserParams.name)) {
                currentNames.push(currentUserParams.name);
            }

            await updateWitnessingPointStatus(point.id, 'OCCUPIED', currentNames.join(', '));
            toast.success("Check-in realizado com sucesso!");
        } catch (postError) {
            toast.error("Erro ao fazer check-in");
        } finally {
            setLoadingId(null);
        }
    };

    const handleCheckOut = async (point: WitnessingPoint) => {
        if (!currentUserParams?.name) return;
        setLoadingId(point.id);
        try {
            // Remove user from list
            const currentNames = point.currentPublishers ? point.currentPublishers.split(', ') : [];
            const newNames = currentNames.filter(n => n !== currentUserParams.name);

            const newStatus = newNames.length === 0 ? 'AVAILABLE' : 'OCCUPIED';
            const newPublishers = newNames.length === 0 ? null : newNames.join(', ');

            await updateWitnessingPointStatus(point.id, newStatus, newPublishers);
            toast.success("Checkout realizado!");
        } catch (err) {
            toast.error("Erro ao sair");
        } finally {
            setLoadingId(null);
        }
    };

    const [pointToDelete, setPointToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClick = (id: string) => {
        setPointToDelete(id);
    };

    const confirmDelete = async () => {
        if (!pointToDelete) return;
        setIsDeleting(true);
        try {
            await deleteWitnessingPoint(pointToDelete);
            toast.success("Ponto de testemunho excluído!");
            router.refresh();
        } catch (e) {
            toast.error("Erro ao excluir");
        } finally {
            setIsDeleting(false);
            setPointToDelete(null);
        }
    };

    const toggleMenu = (id: string) => {
        setMenuOpenId(menuOpenId === id ? null : id);
    };

    return (
        <div className="space-y-4 pb-20">
            {points.map(point => {
                const isOccupied = point.status === 'OCCUPIED';
                const isUserCheckedIn = point.currentPublishers?.includes(currentUserParams?.name || '###'); // unlikely match default

                return (
                    <div key={point.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                                <div className={`p-3 rounded-2xl ${isOccupied ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                    <StoreIcon isOccupied={isOccupied} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 leading-tight mb-1">{point.name}</h3>
                                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                        <MapPin className="w-3 h-3" />
                                        <span className="truncate max-w-[180px]">{point.address}</span>
                                    </div>

                                    {/* Active Publishers */}
                                    {isOccupied && point.currentPublishers && (
                                        <div className="mt-2 flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg w-fit">
                                            <User className="w-3 h-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-wide">
                                                Ativo: {point.currentPublishers}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions Menu (Admin) */}
                            {isAdmin && (
                                <div className="relative">
                                    <button onClick={() => toggleMenu(point.id)} className="p-2 text-gray-300 hover:bg-gray-50 rounded-xl transition-colors">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>

                                    {menuOpenId === point.id && (
                                        <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-200">
                                            <button
                                                onClick={() => router.push(`${window.location.pathname}/edit/${point.id}`)}
                                                className="w-full text-left px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                            >
                                                <Edit className="w-3 h-3" /> Editar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(point.id)}
                                                className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <Trash2 className="w-3 h-3" /> Excluir
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 text-gray-300" />
                                <span className="text-xs font-bold text-gray-400">{point.schedule || 'Sem horário'}</span>
                            </div>

                            <div className="flex gap-2">
                                {/* External Map */}
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>

                                {/* Status Toggle (Simple Check-in logic) */}
                                {isOccupied ? (
                                    <button
                                        onClick={() => isUserCheckedIn ? handleCheckOut(point) : handleCheckIn(point)}
                                        disabled={loadingId === point.id}
                                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all
                                            ${loadingId === point.id ? 'opacity-50' : ''}
                                            bg-amber-100 text-amber-700
                                        `}
                                    >
                                        EM USO
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleCheckIn(point)}
                                        disabled={loadingId === point.id}
                                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all
                                             ${loadingId === point.id ? 'opacity-50' : ''}
                                            bg-green-100 text-green-700 hover:bg-green-200
                                        `}
                                    >
                                        DISPONÍVEL
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
            {/* Modal de Confirmação para Exclusão */}
            <ConfirmationModal
                isOpen={!!pointToDelete}
                onClose={() => setPointToDelete(null)}
                onConfirm={confirmDelete}
                title="Excluir Ponto"
                message="Tem certeza que deseja excluir este ponto de testemunho? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                isLoading={isDeleting}
                variant="danger"
            />
        </div>
    );
}

function StoreIcon({ isOccupied }: { isOccupied: boolean }) {
    // Lucide doesn't have a perfect "Cart" icon for witnessing, using Store or similar.
    // SVG path manually? Or just an icon passed as prop.
    // Using simple SVG for "Cart" representation or generic Store icon.
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
            <path d="M2 7h20" />
            <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
        </svg>
    )
}
