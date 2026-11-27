"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, LogIn } from 'lucide-react';

interface LoginRequestModalProps {
    onClose: () => void;
    message?: string;
}

export default function LoginRequestModal({ onClose, message }: LoginRequestModalProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleLogin = () => {
        // Redirect to login with current URL as callback
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = `/login?callbackUrl=${currentUrl}`;
    };

    if (!isMounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-lg w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                <div className="flex justify-end mb-2">
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-primary-light/50 rounded-full flex items-center justify-center text-primary">
                        <LogIn className="w-8 h-8 ml-1" />
                    </div>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-2">Autenticação Necessária</h2>
                <p className="text-gray-500 mb-6">
                    {message || "Para registrar uma visita e atualizar o status deste endereço, você precisa estar logado."}
                </p>

                <button
                    onClick={handleLogin}
                    className="w-full bg-primary hover:bg-primary-dark active:scale-95 text-white py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-light/500/20"
                >
                    Fazer Login
                </button>
            </div>
        </div>,
        document.body
    );
}
