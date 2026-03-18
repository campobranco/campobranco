// app/components/FloatingReportButton.tsx
// Botão flutuante para capturar erro visual e relatar bug
// Migrado de Supabase para Firebase Firestore (Client SDK)

"use client";

import { useState, useEffect } from 'react';
import { Camera, X, CheckCircle2, Loader2, Bug } from 'lucide-react';
import html2canvas from 'html2canvas';
import Image from 'next/image';
import { db } from '@/lib/firebase';
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

    // Escuta o evento customizado disparado pelo logger quando um erro ocorre
    useEffect(() => {
        const handleConsoleError = (e: CustomEvent) => {
            setErrorCount(e.detail.count);
            setIsPulsing(true);
        };

        window.addEventListener('console-error', handleConsoleError as EventListener);
        return () => window.removeEventListener('console-error', handleConsoleError as EventListener);
    }, []);

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
                user_id: user?.uid || null, // Legado
                title: `Relato via Botão Flutuante - ${new Date().toLocaleDateString('pt-BR')}`,
                description: description,
                deviceInfo: deviceInfo,
                device_info: deviceInfo, // Legado
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
            <div id="floating-report-button" className="fixed bottom-24 right-6 z-[9999] animate-in slide-in-from-bottom duration-300">
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
            onClick={handleOpen}
            disabled={loading}
            className={`fixed bottom-24 right-6 z-50 p-3 rounded-full shadow-lg border transition-all group print:hidden
                ${isPulsing
                    ? 'bg-red-500 text-white border-red-600 shadow-red-500/40 animate-pulse scale-110'
                    : 'bg-white dark:bg-slate-800 text-red-500 hover:text-red-600 border-gray-200 dark:border-slate-700 hover:scale-110'
                }`}
            title="Reportar Erro"
        >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Bug className="w-6 h-6" />}

            {/* Badge com contador de erros */}
            {errorCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-black text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                    {errorCount > 9 ? '9+' : errorCount}
                </span>
            )}

            {/* Tooltip */}
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {isPulsing ? `${errorCount} erro(s) detectado(s)!` : 'Reportar Erro'}
            </span>
        </button>
    );
}

