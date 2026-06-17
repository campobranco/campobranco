"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message?: string;
    description?: string; // Support both
    confirmText?: string;
    cancelText?: string;
    onCancel?: () => void;
    variant?: 'danger' | 'info';
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    description,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onCancel,
    variant = 'danger',
    isLoading = false
}: ConfirmationModalProps) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const textContent = message || description || "";
    if (!isOpen || !isMounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface border border-surface-border rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                <div className="flex justify-end">
                    <button onClick={onClose} className="p-2 hover:bg-background rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted hover:text-main" />
                    </button>
                </div>

                <div className="flex justify-center mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-50 dark:bg-red-950/20 text-red-500' : 'bg-primary-light/50 dark:bg-primary-dark/20 text-primary'}`}>
                        <AlertCircle className="w-8 h-8" />
                    </div>
                </div>

                <h2 className="text-xl font-bold text-main mb-2">{title}</h2>
                <p className="text-muted mb-6 text-sm leading-relaxed">
                    {textContent}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel || onClose}
                        disabled={isLoading}
                        className="flex-1 bg-surface-highlight hover:bg-background text-main border border-surface-border py-3.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            if (isLoading) return;
                            onConfirm();
                        }}
                        disabled={isLoading}
                        className={`flex-1 text-white py-3.5 rounded-lg font-bold text-sm transition-all shadow-lg active:scale-95 disabled:scale-100 disabled:opacity-70 flex items-center justify-center gap-2 ${variant === 'danger'
                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                            : 'bg-primary hover:bg-primary-dark shadow-primary-light/20'
                            }`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processando...
                            </>
                        ) : confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
