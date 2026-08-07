// app/components/FloatingReportButton.tsx
// Botão flutuante para capturar erro visual e relatar bug
// Migrado de Supabase para Firebase Firestore (Client SDK)

"use client";

import { useState, useEffect } from 'react';
import { Camera, X, CheckCircle2, Loader2, Bug } from 'lucide-react';
import html2canvas from 'html2canvas';
import Image from 'next/image';
import { db } from '@/lib/firebase';
// TODO(mutations): migrate to mutation layer - legacy module (admin/report/dashboard)
// eslint-disable-next-line no-restricted-imports
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';
import { getConsoleLogs, resetErrorCount } from '@/lib/logger';
import { APP_VERSION } from '@/lib/version';

export default function FloatingReportButton() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [description, setDescription] = useState('');

    // Estado de alerta: contador de erros capturados no console
    const [errorCount, setErrorCount] = useState(0);
    const [isPulsing, setIsPulsing] = useState(false);
    
    // Estado para controle do esconde/mostra parcial na borda direita
    const [isExpanded, setIsExpanded] = useState(false);

    // Escuta o evento customizado disparado pelo logger quando um erro ocorre
    useEffect(() => {
        const handleConsoleError = (e: CustomEvent) => {
            setErrorCount(e.detail.count);
            setIsPulsing(true);
        };

        window.addEventListener('console-error', handleConsoleError as EventListener);
        
        // Fecha/recolhe o botão ao clicar fora dele
        const handleClickOutside = (e: MouseEvent) => {
            const btn = document.getElementById('floating-report-button');
            if (btn && !btn.contains(e.target as Node)) {
                setIsExpanded(false);
            }
        };

        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('console-error', handleConsoleError as EventListener);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleButtonClick = async () => {
        // 1º Clique: Se não estiver expandido, apenas expande totalmente
        if (!isExpanded) {
            setIsExpanded(true);
            return;
        }

        // 2º Clique (já expandido): Dispara o fluxo de captura e relatório
        handleOpen();
    };

    const handleOpen = async () => {
        // Ao abrir, reseta o estado de alerta
        setIsPulsing(false);
        setErrorCount(0);
        resetErrorCount();

        try {
            setLoading(true);
            const canvas = await html2canvas(document.documentElement, {
                useCORS: true,
                allowTaint: false,
                logging: false,      // silencia console.error interno do html2canvas
                imageTimeout: 2000,  // desiste de imagens bloqueadas após 2s
                scale: 2,
                scrollX: 0,
                scrollY: 0,
                x: window.scrollX,
                y: window.scrollY,
                width: window.innerWidth,
                height: window.innerHeight,
                ignoreElements: (element) => {
                    if (element.id === 'floating-report-button') return true;
                    // Ignora avatares do Google para evitar erros CORS/429 durante o html2canvas
                    if (element.tagName === 'IMG') {
                        const img = element as HTMLImageElement;
                        if (img.src && img.src.includes('googleusercontent.com')) return true;
                    }
                    return false;
                }
            });
            setScreenshot(canvas.toDataURL('image/png'));
            setIsOpen(true);
        } catch (error) {
            console.error("Screenshot failed:", error);
            toast.error("Não foi possível capturar a tela.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!description.trim()) {
            toast.error("Por favor, descreva o problema.");
            return;
        }

        setLoading(true);
        try {
            const deviceInfo = {
                platform: window.navigator.platform,
                userAgent: window.navigator.userAgent,
                screen: `${window.screen.width}x${window.screen.height}`,
                pixelRatio: window.devicePixelRatio,
                language: window.navigator.language,
                appVersion: APP_VERSION,
                url: window.location.href,
                screenshot: screenshot,
                consoleLogs: getConsoleLogs()
            };

            // Inserção no Firestore
            await addDoc(collection(db, 'bug_reports'), {
                userId: user?.uid || null,
                title: `Relato via Botão Flutuante - ${new Date().toLocaleDateString('pt-BR')}`,
                description: description,
                deviceInfo: deviceInfo,
                status: 'NEW',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            setSuccess(true);
            toast.success("Bug relatado com sucesso! Obrigado.");

            setTimeout(() => {
                setSuccess(false);
                setIsOpen(false);
                setScreenshot(null);
                setDescription('');
            }, 2000);
        } catch (error) {
            console.error("Report submit error:", error);
            toast.error("Erro ao enviar relatório. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div id="floating-report-button" className="fixed top-1/2 -translate-y-1/2 right-6 z-[9999] animate-in slide-in-from-bottom duration-300">
                <div className="bg-green-500 text-white p-4 rounded-full shadow-lg flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
            </div>
        );
    }

    if (isOpen) {
        return (
            <div id="floating-report-button" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 rounded-md w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                            <Bug className="w-5 h-5 text-red-500" />
                            Reportar Problema
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-gray-500 dark:text-gray-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted uppercase">Captura de Tela</label>
                            {screenshot && (
                                <div className="rounded-md overflow-hidden border border-gray-200 dark:border-slate-700 w-full h-48 bg-gray-100 dark:bg-slate-800 relative group">
                                    <img src={screenshot} alt="Screenshot" className="w-full h-full object-contain" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted uppercase">Descrição</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descreva o que aconteceu..."
                                className="w-full bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-md p-4 text-sm min-h-[100px] focus:ring-2 focus:ring-primary-light/500/20 focus:outline-none dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-3">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-6 py-2.5 rounded-md font-bold text-sm text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2.5 rounded-md font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Relatório'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <button
            id="floating-report-button"
            onClick={handleButtonClick}
            disabled={loading}
            className={`fixed top-1/2 -translate-y-1/2 right-0 z-50 p-3 rounded-l-full shadow-2xl border-l border-t border-b transition-all duration-300 group print:hidden flex items-center gap-2
                ${isExpanded ? 'translate-x-0 shadow-red-500/20' : 'translate-x-1/2 opacity-90 hover:opacity-100'}
                ${isPulsing
                    ? 'bg-red-500 text-white border-red-600 shadow-red-500/40 animate-pulse'
                    : 'bg-white dark:bg-slate-800 text-red-500 hover:text-red-600 border-gray-200 dark:border-slate-700'
                }`}
            title={isExpanded ? "Clique para Reportar Erro" : "Expandir Botão de Erro"}
        >
            {loading ? <Loader2 className="w-6 h-6 animate-spin shrink-0" /> : <Bug className="w-6 h-6 shrink-0" />}

            {/* Badge com contador de erros */}
            {errorCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 bg-yellow-400 text-black text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                    {errorCount > 9 ? '9+' : errorCount}
                </span>
            )}

            {/* Tooltip explicativo quando expandido */}
            {isExpanded && (
                <span className="text-xs font-bold whitespace-nowrap pr-1 animate-in fade-in duration-200">
                    Reportar Erro
                </span>
            )}
        </button>
    );
}
