
"use client";

import { useState, useEffect } from 'react';
import {
    MoreHorizontal,
    Download,
    Upload,
    FileSpreadsheet,
    ChevronDown
} from 'lucide-react';
import CSVImportModal from './CSVImportModal';
import { toast } from 'sonner';
import { getAddresses } from '@/lib/services/addresses';
import { getTerritories } from '@/lib/services/territories';
import { getCities } from '@/lib/services/cities';

interface CSVActionButtonsProps {
    congregationId: string;
    cityId?: string;
    territoryId?: string;
    onImportSuccess?: () => void;
    className?: string;
}

export default function CSVActionButtons({
    congregationId,
    cityId,
    territoryId,
    onImportSuccess,
    className = ''
}: CSVActionButtonsProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = () => setIsMenuOpen(false);
        if (isMenuOpen) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [isMenuOpen]);

    const handleExport = async () => {
        toast.info("Preparando exportação...");
        try {
            // 1. Buscar dados necessários em paralelo
            const [addrRes, terrRes, cityRes] = await Promise.all([
                getAddresses(congregationId, cityId, territoryId),
                getTerritories(congregationId, cityId),
                getCities(congregationId)
            ]);

            if (!addrRes.success) throw new Error(addrRes.error);
            const addresses = addrRes.addresses || [];

            if (addresses.length === 0) {
                toast.error("Nenhum endereço encontrado para exportar.");
                return;
            }

            const territoryMap = new Map((terrRes.territories || []).map((t: any) => [t.id, t]));
            const cityMap = new Map((cityRes.cities || []).map((c: any) => [c.id, c]));

            // 2. Cabeçalho do CSV
            const headers = [
                'Cidade', 'UF', 'Número do Mapa', 'Descrição', 'Endereço',
                'Quantidade de residentes', 'Nome', 'Link do Maps', 'Link do Waze',
                'Status', 'Surdo', 'Menor de idade', 'Estudante', 'Neurodivergente',
                'Gênero', 'Observações', 'Resultado da ultima visita', 'Ordem na listagem'
            ];

            // 3. Formatar linhas
            const rows = addresses.map((addr: any) => {
                const city = cityMap.get(addr.cityId || addr.city_id) || { name: '', uf: '' };
                const territory = territoryMap.get(addr.territoryId || addr.territory_id) || { name: '', notes: '' };

                return [
                    city.name || '',
                    city.uf || '',
                    territory.name || '',
                    territory.notes || territory.description || '',
                    addr.street || '',
                    addr.residentsCount || addr.residents_count || 1,
                    addr.residentName || addr.resident_name || '',
                    addr.googleMapsLink || addr.google_maps_link || '',
                    addr.wazeLink || addr.waze_link || '',
                    (addr.isActive ?? addr.is_active) !== false ? 'true' : 'false',
                    (addr.isDeaf ?? addr.is_deaf) ? 'true' : 'false',
                    (addr.isMinor ?? addr.is_minor) ? 'true' : 'false',
                    (addr.isStudent ?? addr.is_student) ? 'true' : 'false',
                    (addr.isNeurodivergent ?? addr.is_neurodivergent) ? 'true' : 'false',
                    addr.gender || '',
                    addr.observations || '',
                    addr.visitStatus || addr.visit_status || 'not_contacted',
                    addr.sortOrder ?? addr.sort_order ?? 0
                ];
            });

            // 4. Escapar e gerar CSV
            const escapeCell = (cell: any): string => {
                const text = String(cell ?? '');
                if (text.includes(';') || text.includes('"') || text.includes('\n')) {
                    return `"${text.replace(/"/g, '""')}"`;
                }
                return text;
            };

            const csvContent = [
                headers.join(';'),
                ...rows.map(row => row.map(escapeCell).join(';'))
            ].join('\n');

            // 5. Download
            const BOM = '\ufeff';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const fileName = `export_campo_branco_${new Date().getTime()}.csv`;
            
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
            
            toast.success("Dados exportados com sucesso!");
        } catch (error: any) {
            console.error("Export error:", error);
            toast.error("Erro ao exportar dados: " + error.message);
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
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                }}
                className="p-2.5 bg-surface border border-surface-border text-muted hover:text-primary hover:border-primary-light rounded-xl shadow-sm transition-all flex items-center justify-center group"
                title="Ações de Dados"
            >
                <MoreHorizontal className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            {isMenuOpen && (
                <div
                    className="absolute right-0 top-full mt-2 w-52 bg-surface border border-surface-border rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-4 py-2 border-b border-surface-border mb-1">
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest">Manutenção CSV</p>
                    </div>

                    <button
                        onClick={() => {
                            setIsImportModalOpen(true);
                            setIsMenuOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-main hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Importar Dados
                    </button>

                    <button
                        onClick={() => {
                            handleExport();
                            setIsMenuOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-main hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Exportar Dados
                    </button>

                    <button
                        onClick={() => {
                            downloadTemplate();
                            setIsMenuOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-main hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Baixar Template
                    </button>
                </div>
            )}

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
