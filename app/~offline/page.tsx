"use client";

import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-main p-6 text-center">
      <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-6">
        <WifiOff className="w-16 h-16 text-gray-400" />
      </div>
      
      <h1 className="text-2xl font-bold mb-2">Sem Conexão</h1>
      
      <p className="text-muted mb-8 max-w-md">
        Parece que você está offline no momento e esta página não está disponível no cache. Verifique sua conexão com a internet e tente novamente.
      </p>
      
      <button 
        onClick={() => window.location.reload()}
        className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 transition-transform active:scale-95"
      >
        <RefreshCw className="w-5 h-5" />
        Tentar Novamente
      </button>

      <div className="mt-12 text-sm text-muted">
        <p>Dica: O Campo Branco salva dados localmente.</p>
        <p>Páginas que você já visitou podem ser abertas sem internet.</p>
      </div>
    </div>
  );
}
