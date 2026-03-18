// app/components/Witnessing/NewPointModal.tsx
// Modal para criação de novos pontos de testemunho público
// Salva diretamente no Firestore (coleção witnessing_points)

"use client";

import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createWitnessingPoint } from '@/lib/services/witnessing';

interface NewPointModalProps {
    isOpen: boolean;
    onClose: () => void;
    cityId: string;
    congregationId: string;
    cityName: string;
    onSuccess?: () => void;
}

export default function NewPointModal({ isOpen, onClose, cityId, congregationId, cityName, onSuccess }: NewPointModalProps) {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [googleMapsLink, setGoogleMapsLink] = useState('');
    const [wazeLink, setWazeLink] = useState('');
    const [schedule, setSchedule] = useState('');
    const [loading, setLoading] = useState(false);

    // Cria um novo ponto de testemunho no Firestore
    const handleCreatePoint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            const result = await createWitnessingPoint({
                name: name.trim(),
                address: address.trim(),
                cityId,
                congregationId,
                latitude: 0, // Campos provisionais se não houver no modal
                longitude: 0,
                schedule: schedule.trim() || '',
            });

            if (!result.success) throw new Error(result.error);

            toast.success("Ponto criado com sucesso!");
            setName('');
            setAddress('');
            setGoogleMapsLink('');
            setWazeLink('');
            setSchedule('');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Erro ao criar ponto:", error);
            toast.error("Erro ao criar ponto. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-lg w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Plus className="w-6 h-6 text-amber-600" />
                        Novo Ponto
                    </h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
                </div>

                <form onSubmit={handleCreatePoint} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nome do Local</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-lg p-4 font-bold text-gray-900 focus:ring-2 focus:ring-amber-500/20 outline-none"
                            placeholder="Ex: Praça Central"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Endereço</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full bg-gray-50 border-none rounded-lg p-4 font-medium text-gray-900 focus:ring-2 focus:ring-amber-500/20 outline-none"
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
                                    className="w-full bg-gray-50 border-none rounded-lg p-3 pr-10 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-amber-500/20 outline-none"
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
                                    className="w-full bg-gray-50 border-none rounded-lg p-3 pr-10 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-amber-500/20 outline-none"
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
                            className="w-full bg-gray-50 border-none rounded-xl p-4 font-medium text-gray-900 focus:ring-2 focus:ring-amber-500/20 outline-none"
                            placeholder="Ex: Segundas, 08:00 - 12:00"
                        />
                    </div>

                    <button type="submit" className="w-full py-3.5 bg-gray-900 text-white rounded-lg font-bold shadow-lg mt-2 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Ponto'}
                    </button>
                </form>
            </div>
        </div>
    );
}
