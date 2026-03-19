"use client";

import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                <div className="relative p-6">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-2">
                <p className="text-main font-bold text-lg tracking-tight animate-pulse">
                    Carregando...
                </p>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                </div>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-20 flex flex-col items-center gap-1">
                <p className="text-[10px] font-mono tracking-[0.3em] uppercase">Sincronizando Dados</p>
                <p className="text-[8px] font-mono uppercase">{process.env.NEXT_PUBLIC_APP_NAME || "Campo Branco"}</p>
            </div>
        </div>
    );
}
