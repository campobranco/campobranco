"use client";

import { useState, useEffect } from 'react';
import { 
    Plus, 
    Upload, 
    ChevronDown,
    ExternalLink,
    Copy,
    Share2,
    Download,
    FileSpreadsheet
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import CSVImportModal from './CSVImportModal';
import { exportDataToCSV } from '@/lib/services/export';



interface AddressActionsMenuProps {
    congregationId: string;
    cityId: string;
    territoryId: string;
    onImportSuccess: () => void;
    onCreateClick: () => void;
    isElder: boolean;
    isServant: boolean;
    isAdmin: boolean;
    isAdminRoleGlobal: boolean;
}

export default function AddressActionsMenu({
    congregationId,
    cityId,
    territoryId,
    onImportSuccess,
    onCreateClick,
}: AddressActionsMenuProps) {
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isCSVMenuOpen, setIsCSVMenuOpen] = useState(false);
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const router = useRouter();

    // Fecha os menus ao clicar fora
    useEffect(() => {
        const handleClickOutside = () => {
            setIsCSVMenuOpen(false);
            setIsShareMenuOpen(false);
        };
        if (isCSVMenuOpen || isShareMenuOpen) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [isCSVMenuOpen, isShareMenuOpen]);

    const handleOpenShareSetup = () => {
        const currentPath = window.location.pathname + window.location.search;
        router.push(`/share-setup?ids=${territoryId}&returnUrl=${encodeURIComponent(currentPath)}`);
    };

    const handleCopyLink = async () => {
        try {
            const shareUrl = `${window.location.origin}/s/${territoryId}`;
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Link copiado para a área de transferência!");
            setIsShareMenuOpen(false);
        } catch (err) {
            toast.error("Erro ao copiar link.");
        }
    };

    const handleNativeShare = async () => {
        const shareUrl = `${window.location.origin}/s/${territoryId}`;
        const shareData = {
            title: 'Território Campo Branco',
            text: 'Confira os mapas deste território:',
            url: shareUrl,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                handleCopyLink();
            }
        } catch (err) {
            console.error('Erro ao compartilhar:', err);
        }
        setIsShareMenuOpen(false);
    };

    const handleExport = async () => {
        setIsCSVMenuOpen(false);
        const toastId = toast.loading("Gerando arquivo de exportação...");
        try {
            const result = await exportDataToCSV(congregationId, cityId, territoryId);
            if (!result.success) {
                throw new Error(result.error || "Erro exportação");
            }
            toast.success("Download iniciado!", { id: toastId });
        } catch (e: any) {
            toast.error("Erro ao gerar exportação: " + e.message, { id: toastId });
        }
    };


    const downloadTemplate = () => {
        const header = "Cidade;UF;Número do Mapa;Descrição;Endereço;Quantidade de residentes;Nome;Link do Maps;Link do Waze;Status;Surdo;Menor de idade;Estudante;Neurodivergente;Gênero;Observações;Resultado da ultima visita;Ordem na listagem";
        const example = "Catanduva;SP;01;Centro;Rua Álamo, 225;1;João Silva;https://maps.google.com/...;https://waze.com/...;true;false;false;false;false;Homem;Exemplo de observação;not_contacted;0";
        const csvContent = "\ufeff" + [header, example].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `template_importacao_campo_branco.csv`;
        link.click();
        toast.info("Template baixado.");
        setIsCSVMenuOpen(false);
    };

    return (
        <div className="flex items-center gap-1.5">
            {/* 1. Share Menu */}
            <div className="relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsShareMenuOpen(!isShareMenuOpen);
                        setIsCSVMenuOpen(false);
                    }}
                    className={`p-2.5 rounded-xl transition-all shadow-sm border flex items-center gap-1 ${
                        isShareMenuOpen 
                        ? 'bg-green-600 text-white border-green-600' 
                        : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/40'
                    }`}
                    title="Opções de Compartilhamento"
                >
                    <Share2 className="w-5 h-5" />
                    <ChevronDown className={`w-3 h-3 transition-transform ${isShareMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isShareMenuOpen && (
                    <div 
                        className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-surface-border dark:border-slate-700 p-1.5 z-50 min-w-[220px] animate-in fade-in slide-in-from-top-2 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-3 py-2">
                             <p className="text-[10px] font-black text-muted uppercase tracking-[0.15em] opacity-50">Distribuição</p>
                        </div>

                        <button
                            onClick={handleOpenShareSetup}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all w-full text-left rounded-xl group"
                        >
                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                <ExternalLink className="w-4 h-4" />
                            </div>
                            Abrir
                        </button>

                        <button
                            onClick={handleCopyLink}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all w-full text-left rounded-xl group"
                        >
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                <Copy className="w-4 h-4" />
                            </div>
                            Copiar
                        </button>

                        <button
                            onClick={handleNativeShare}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all w-full text-left rounded-xl group"
                        >
                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                <Share2 className="w-4 h-4" />
                            </div>
                            Compartilhar
                        </button>
                    </div>
                )}
            </div>

            {/* 2. CSV Menu (Movidi para o meio) */}
            <div className="relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsCSVMenuOpen(!isCSVMenuOpen);
                        setIsShareMenuOpen(false);
                    }}
                    className={`p-2.5 rounded-xl transition-all shadow-sm border flex items-center gap-1 ${
                        isCSVMenuOpen 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                    }`}
                    title="Opções de CSV"
                >
                    <Upload className="w-5 h-5" />
                    <ChevronDown className={`w-3 h-3 transition-transform ${isCSVMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCSVMenuOpen && (
                    <div 
                        className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-surface-border dark:border-slate-700 p-1.5 z-50 min-w-[220px] animate-in fade-in slide-in-from-top-2 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-3 py-2">
                             <p className="text-[10px] font-black text-muted uppercase tracking-[0.15em] opacity-50">Dados & CSV</p>
                        </div>

                        <button
                            onClick={() => {
                                setIsImportModalOpen(true);
                                setIsCSVMenuOpen(false);
                            }}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all w-full text-left rounded-xl group"
                        >
                            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                <Upload className="w-4 h-4" />
                            </div>
                            Importar CSV
                        </button>

                        <button
                            onClick={handleExport}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-all w-full text-left rounded-xl group"
                        >
                            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                <Download className="w-4 h-4" />
                            </div>
                            Exportar para CSV
                        </button>

                        <button
                            onClick={downloadTemplate}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all w-full text-left rounded-xl group"
                        >
                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            Planilha Modelo
                        </button>
                    </div>
                )}
            </div>

            {/* 3. Create Button (Verde sólido solicitado #16A34A) */}
            <button
                onClick={onCreateClick}
                className="p-2.5 bg-[#16A34A] text-white rounded-xl hover:bg-[#15803d] hover:scale-105 active:scale-95 transition-all shadow-md border border-[#16A34A]"
                title="Novo Endereço"
            >
                <Plus className="w-5 h-5" />
            </button>

            <CSVImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                congregationId={congregationId}
                cityId={cityId}
                territoryId={territoryId}
                onSuccess={onImportSuccess}
            />
        </div>
    );
}
