"use client";

import React from 'react';
import { Map as MapIcon, X } from 'lucide-react';

/* 
 * Componente modal para seleção de aplicativo de mapa (Waze ou Google Maps)
 * Usado tanto na visualização administrativa quanto na compartilhada.
 */

interface MapAppSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    address: {
        street?: string;
        number?: string;
        googleMapsLink?: string;
        wazeLink?: string;
    };
}

export default function MapAppSelectModal({ isOpen, onClose, address }: MapAppSelectModalProps) {
    if (!isOpen) return null;

    const googleLink = address.googleMapsLink;
    const wazeLink = address.wazeLink;

    return (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800"
                onClick={e => e.stopPropagation()}
            >
                <div className="mb-6 text-center pt-2">
                    <div className="w-14 h-14 bg-primary-50 dark:bg-primary-900/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-100 dark:border-primary-800/50">
                        <MapIcon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-black text-main tracking-tight italic">Qual mapa usar?</h3>
                    <p className="text-sm text-muted mt-2 font-medium">Escolha seu aplicativo favorito para abrir a rota predefinida.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Botão Waze */}
                    <button
                        onClick={() => {
                            if (wazeLink) window.open(wazeLink, '_blank');
                            onClose();
                        }}
                        disabled={!wazeLink}
                        className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all shadow-sm group active:scale-95 border-2 ${wazeLink
                                ? 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/10 dark:hover:bg-sky-900/20 border-sky-100 dark:border-sky-800/30 hover:border-sky-300 dark:hover:border-sky-600'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-50 cursor-not-allowed'
                            }`}
                    >
                        <img src="/icons/waze.svg" alt="Waze" className="w-10 h-10 drop-shadow-sm group-hover:scale-110 transition-transform" />
                        <span className="font-extrabold text-[#33ccff] tracking-wide text-sm">Waze</span>
                    </button>

                    {/* Botão Google Maps */}
                    <button
                        onClick={() => {
                            if (googleLink) window.open(googleLink, '_blank');
                            onClose();
                        }}
                        disabled={!googleLink}
                        className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all shadow-sm group active:scale-95 border-2 ${googleLink
                                ? 'bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-gray-100 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 opacity-50 cursor-not-allowed'
                            }`}
                    >
                        <img src="/icons/google-maps.svg" alt="Google Maps" className="w-10 h-10 drop-shadow-sm group-hover:scale-110 transition-transform" />
                        <span className="font-extrabold text-main text-sm">Maps</span>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 font-bold py-3.5 rounded-2xl transition-colors text-sm"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
