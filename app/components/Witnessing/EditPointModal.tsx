// app/components/Witnessing/EditPointModal.tsx
// Modal para edição de pontos de testemunho público existentes
// Salva alterações diretamente no Firestore

"use client";

import { useState, useEffect } from 'react';
import { X, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateWitnessingPointDetails } from '@/lib/services/witnessing';

// Tipagem com campos camelCase (padrão Firestore)
interface WitnessingPoint {
    id: string;
    name: string;
    address: string;
    cityId: string;
    congregationId: string;
    lat?: number;
    lng?: number;
    googleMapsLink?: string;
    wazeLink?: string;
    status: 'AVAILABLE' | 'OCCUPIED';
    schedule?: string;
    currentPublishers?: string[];
}

interface EditPointModalProps {
    isOpen: boolean;
    onClose: () => void;
    point: WitnessingPoint | null;
    cityName: string;
    onSuccess?: () => void;
}

export default function EditPointModal({ isOpen, onClose, point, cityName, onSuccess }: EditPointModalProps) {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [googleMapsLink, setGoogleMapsLink] = useState('');
    const [wazeLink, setWazeLink] = useState('');
    const [schedule, setSchedule] = useState('');
    const [loading, setLoading] = useState(false);

    // Preenche o formulário com os dados atuais do ponto ao abrir
    useEffect(() => {
        if (point) {
            setName(point.name || '');
            setAddress(point.address || '');
            setGoogleMapsLink(point.googleMapsLink || '');
            setWazeLink(point.wazeLink || '');
            setSchedule(point.schedule || '');
        }
    }, [point, isOpen]);

    // Atualiza o ponto no Firestore
    const handleUpdatePoint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!point || !name.trim()) return;

        setLoading(true);
        try {
            const result = await updateWitnessingPointDetails(point.id, {
                name: name.trim(),
                address: address.trim(),
                latitude: 0,
                longitude: 0,
                schedule: schedule.trim() || '',
            });

            if (!result.success) throw new Error(result.error);

            toast.success("Ponto atualizado com sucesso!");
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Erro ao atualizar ponto:", error);
            toast.error("Erro ao atualizar ponto. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !point) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-lg w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Pencil className="w-6 h-6 text-primary" />
                        Editar Ponto
                    </h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                <form onSubmit={handleUpdatePoint} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nome do Local</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-lg p-4 font-bold text-gray-900 focus:ring-2 focus:ring-primary-light/50 outline-none"
                            placeholder="Ex: Praça Central"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Endereço</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-lg p-4 font-medium text-gray-900 focus:ring-2 focus:ring-primary-light/50 outline-none"
                            placeholder="Rua..."
                        />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Google Maps</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={googleMapsLink}
                                    onChange={(e) => setGoogleMapsLink(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-lg p-3 pr-10 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-primary-light/50 outline-none"
                                    placeholder="Link..."
                                />
                                <img
                                    src="/icons/google-maps.svg"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full object-cover pointer-events-none"
                                    alt=""
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Waze</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={wazeLink}
                                    onChange={(e) => setWazeLink(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-lg p-3 pr-10 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-primary-light/50 outline-none"
                                    placeholder="Link..."
                                />
                                <img
                                    src="/icons/waze.svg"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full object-cover pointer-events-none"
                                    alt=""
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Horário (Opcional)</label>
                        <input
                            type="text"
                            value={schedule}
                            onChange={(e) => setSchedule(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-xl p-4 font-medium text-gray-900 focus:ring-2 focus:ring-primary-light/50 outline-none"
                            placeholder="Ex: Segundas, 08:00 - 12:00"
                        />
                    </div>

                    <button type="submit" className="w-full py-3.5 bg-gray-900 text-white rounded-lg font-bold shadow-lg mt-2 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                    </button>
                </form>
            </div>
        </div>
    );
}
