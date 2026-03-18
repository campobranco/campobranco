"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Plus, Save, X, Edit2, Trash2, Calendar, User, FileText, Download, Printer, Building2 } from "lucide-react";
import ConfirmationModal from '@/app/components/ConfirmationModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getServiceYear, getServiceYearLabel, getServiceYearRange } from '@/lib/serviceYearUtils';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { getRegistryData } from '@/lib/services/reports';
import { deleteDoc } from 'firebase/firestore';
import { createSharedList } from '@/lib/services/shared_lists';

interface Territory {
    id: string;
    name: string;
    cityId: string;
    cityName?: string;
    manualLastCompletedDate?: Date;
}

interface Assignment {
    id: string; // shared_list id
    territoryId: string;
    publisherName: string;
    publisherId?: string;
    assignedDate: Date;
    completedDate?: Date;
    isManual?: boolean;
}

interface RegistryRow {
    territory: Territory;
    lastCompletedDate?: Date; // Reference date (start of sheet)
    assignments: Assignment[];
}

export default function RegistryPage() {
    const { user, congregationId, isElder, isServant, isAdminRoleGlobal, loading } = useAuth();
    const router = useRouter();

    const [currentServiceYear, setCurrentServiceYear] = useState<number>(getServiceYear());
    const [rows, setRows] = useState<RegistryRow[]>([]);
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [pageLoading, setPageLoading] = useState(true);

    // Edit/Add Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Partial<Assignment> | null>(null);
    const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'info';
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [selectedCongregationId, setSelectedCongregationId] = useState<string | null>(null);

    // Legacy Date Modal State
    const [isLegacyModalOpen, setIsLegacyModalOpen] = useState(false);
    const [editingLegacy, setEditingLegacy] = useState<{ territoryId: string; name: string; date?: Date } | null>(null);

    useEffect(() => {
        if (!loading && !isElder && !isServant && !isAdminRoleGlobal) {
            router.push('/dashboard');
        }
    }, [loading, isElder, isServant, isAdminRoleGlobal, router]);

    // Initialize selectedCongregationId
    useEffect(() => {
        if (!loading && congregationId && !selectedCongregationId) {
            setSelectedCongregationId(congregationId);
        }
    }, [congregationId, loading]);



    // Print Settings State
    const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
    const [printMode, setPrintMode] = useState<'page-break' | 'continuous'>('page-break');
    const [minColumns, setMinColumns] = useState<Record<string, number>>({});
    const COLUMNS_PER_PAGE = 4;
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [availableCities, setAvailableCities] = useState<string[]>([]);

    useEffect(() => {
        if (rows.length > 0) {
            const cities = Array.from(new Set(rows.map(r => (r.territory.cityName || 'Sem Cidade').trim()))).sort();
            setAvailableCities(cities);
            // Only set selected cities if not already set (to avoid resetting user selection on re-renders unless desired)
            if (selectedCities.length === 0) {
                setSelectedCities(cities);
            }
        }
    }, [rows, selectedCities.length]);


    const fetchData = useCallback(async () => {
        const targetCongId = selectedCongregationId || congregationId;
        if (!targetCongId) return;

        setPageLoading(true);
        try {
            const { start, end } = getServiceYearRange(currentServiceYear);

            // Fetch all data via Client Service
            const resData = await getRegistryData(targetCongId);

            if (!resData.success) throw new Error(resData.error || "Erro ao buscar dados do servidor");

            const terrData = resData.territories;
            const cityData = resData.cities;
            const listData = resData.sharedLists;

            const cityMap = new Map<string, string>();
            cityData?.forEach((d: any) => cityMap.set(d.id, d.name));

            const terrs: Territory[] = terrData?.map((d: any) => ({
                id: d.id,
                name: d.name,
                cityId: d.city_id,
                cityName: cityMap.get(d.city_id),
                manualLastCompletedDate: d.manual_last_completed_date ? new Date(d.manual_last_completed_date) : undefined
            })) || [];

            // Sort by City then Name (numeric aware)
            terrs.sort((a, b) => {
                if (a.cityName !== b.cityName) return (a.cityName || '').localeCompare(b.cityName || '');
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            });

            setTerritories(terrs);

            const assignmentsMap: Record<string, Assignment[]> = {};
            const completedDatesMap: Record<string, Date> = {}; // For the "Last completed" column

            listData?.forEach((data: any) => {
                if (data.type !== 'territory' || !data.items || data.items.length === 0) return;

                // Determine dates
                const createdDate = new Date(data.created_at || 0);
                const returnDate = data.returned_at ? new Date(data.returned_at) :
                    (data.status === 'completed' ? new Date() : undefined);

                // Check if this assignment belongs to the current service year
                const inRange = (createdDate >= start && createdDate <= end) || (returnDate && returnDate >= start && returnDate <= end);

                data.items.forEach((tId: string) => {
                    // Handle "Last Completed" calculation (automatic from history)
                    if (returnDate && returnDate < start) {
                        const existing = completedDatesMap[tId];
                        if (!existing || returnDate > existing) {
                            completedDatesMap[tId] = returnDate;
                        }
                    }

                    // Handle Assignments for this year
                    if (inRange) {
                        if (!assignmentsMap[tId]) assignmentsMap[tId] = [];
                        assignmentsMap[tId].push({
                            id: data.id,
                            territoryId: tId,
                            publisherName: data.assigned_name || data.title || 'Indefinido',
                            publisherId: data.assigned_to,
                            assignedDate: createdDate,
                            completedDate: returnDate,
                            isManual: data.title === 'Registro Manual' // Use title as marker instead
                        });
                    }
                });
            });

            // 3. Build Rows
            const newRows: RegistryRow[] = terrs.map(t => {
                const assigns = assignmentsMap[t.id] || [];
                // Sort assignments by date
                assigns.sort((a, b) => a.assignedDate.getTime() - b.assignedDate.getTime());

                // Determine Final Last Completed Date
                // Precedence: Manual Override > Calculated History
                const finalLastCompleted = t.manualLastCompletedDate || completedDatesMap[t.id];

                return {
                    territory: t,
                    lastCompletedDate: finalLastCompleted,
                    assignments: assigns
                };
            });

            setRows(newRows);

        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar registros.");
        } finally {
            setPageLoading(false);
        }
    }, [selectedCongregationId, congregationId, currentServiceYear]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveAssignment = async () => {
        if (!selectedTerritoryId) {
            toast.error("Território não selecionado.");
            return;
        }
        if (!editingAssignment?.publisherName?.trim()) {
            toast.error("O nome do publicador é obrigatório.");
            return;
        }
        if (!editingAssignment.assignedDate) {
            toast.error("A data da designação é obrigatória.");
            return;
        }

        try {
            const targetCongId = selectedCongregationId || congregationId;
            if (!targetCongId) throw new Error("Congregação não identificada.");

            const payload: any = {
                type: 'territory',
                items: [selectedTerritoryId],
                congregation_id: targetCongId,
                assigned_name: editingAssignment.publisherName,
                assigned_to: editingAssignment.publisherId || null,
                created_at: new Date(editingAssignment.assignedDate).toISOString(),
                status: editingAssignment.completedDate ? 'completed' : 'active',
                title: 'Registro Manual' // metadata marker
            };

            if (editingAssignment.completedDate) {
                payload.returned_at = new Date(editingAssignment.completedDate).toISOString();
                payload.expires_at = new Date(editingAssignment.completedDate.getTime() + 86400000).toISOString(); // +1 day just to be safe
            } else {
                // If active, give it 30 days default?
                const exp = new Date(editingAssignment.assignedDate);
                exp.setDate(exp.getDate() + 30);
                payload.expires_at = exp.toISOString();
            }

            if (editingAssignment.id) {
                // Update existing
                const listRef = doc(db, 'shared_lists', editingAssignment.id);
                await updateDoc(listRef, payload);
            } else {
                // Create new manual record via createSharedList equivalent parameters manually, or direct Firestore add
                await createSharedList(payload);
            }

            setIsModalOpen(false);
            setEditingAssignment(null);
            fetchData();
            toast.success(editingAssignment.id ? "Registro atualizado!" : "Registro salvo!");

        } catch (e: any) {
            console.error("Save Assignment Error:", e);
            const msg = e.message || (typeof e === 'string' ? e : JSON.stringify(e));
            toast.error(`Erro ao salvar registro: ${msg}`);
        }
    };

    const handleSaveLegacyDate = async () => {
        if (!editingLegacy || !editingLegacy.territoryId) return;

        try {
            const updatePayload = {
                manual_last_completed_date: editingLegacy.date ? editingLegacy.date.toISOString() : null
            };

            const territoryRef = doc(db, "territories", editingLegacy.territoryId);
            await updateDoc(territoryRef, updatePayload);

            setIsLegacyModalOpen(false);
            setEditingLegacy(null);
            fetchData();
        } catch (e) {
            console.error(e);
            toast.error("Erro ao salvar data histórica.");
        }
    };

    const handleDeleteAssignment = async (id: string) => {
        setConfirmModal({
            title: "Remover Registro?",
            message: "Esta ação não pode ser desfeita. O registro será excluído permanentemente do histórico.",
            variant: 'danger',
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    const listRef = doc(db, 'shared_lists', id);
                    await deleteDoc(listRef);

                    toast.success("Registro removido.");
                    fetchData();

                } catch (e: any) {
                    console.error(e);
                    toast.error("Erro ao excluir registro.");
                } finally {
                    setIsDeleting(false);
                    setConfirmModal(null);
                }
            }
        });
    };

    const formatDate = (date?: Date) => {
        if (!date || isNaN(date.getTime())) return '';
        return format(date, 'dd/MM/yyyy');
    };

    const formatDateInput = (date?: Date) => {
        if (!date || isNaN(date.getTime())) return '';
        return format(date, 'yyyy-MM-dd');
    };

    const handlePrintSingleCity = (city: string) => {
        const previousSelection = [...selectedCities];
        const previousTitle = document.title;

        // 1. Isolate City
        setSelectedCities([city]);

        // 2. Update Title for Filename
        const yearLabel = getServiceYearLabel(currentServiceYear).replace('/', '-');
        document.title = `S-13_T [${yearLabel} - ${city}]`;

        // 3. Wait and Print
        setTimeout(() => {
            window.print();

            // 4. Restore
            // Restore immediately after print dialog opens/closes
            setTimeout(() => {
                setSelectedCities(previousSelection);
                document.title = previousTitle;
            }, 500);
        }, 100);
    };

    return (
        <div className="min-h-screen bg-background dark:bg-gray-950 text-main pb-10 print:bg-white print:text-black print:min-h-0">
            {/* Header */}
            <header className="bg-surface dark:bg-gray-900 border-b border-surface-border dark:border-gray-800 sticky top-0 z-20 px-6 py-4 flex items-center justify-between no-print">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-surface-highlight dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-muted" />
                    </button>
                    <h1 className="text-xl font-bold text-main">Registro de Designação</h1>
                </div>

                <div className="flex items-center gap-4">


                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 border border-transparent dark:border-gray-800">
                        <button
                            onClick={() => setCurrentServiceYear(prev => prev - 1)}
                            className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded-md shadow-sm transition-all text-main"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold min-w-[100px] text-center text-main">
                            {getServiceYearLabel(currentServiceYear)}
                        </span>
                        <button
                            onClick={() => setCurrentServiceYear(prev => prev + 1)}
                            className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded-md shadow-sm transition-all text-main"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 no-print">
                        <button
                            onClick={() => setIsPrintSettingsOpen(true)}
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Imprimir
                        </button>
                    </div>
                </div>
            </header>



            <main className="max-w-[1200px] mx-auto p-8 overflow-x-auto print-container">
                <div className="text-center mb-6 hidden print:block">
                    {/* Only show this global header if we are NOT printing, or manage via CSS logic below */}
                </div>
                {/* On-Screen Header (Hidden on Print) */}
                <div className="text-center mb-6 print:hidden">
                    <h1 className="text-xl font-bold uppercase mb-1 font-sans text-main">REGISTRO DE DESIGNAÇÃO DE TERRITÓRIO</h1>
                    <div className="flex items-center justify-center gap-2 font-bold font-sans text-sm text-main">
                        <span>Ano de Serviço:</span>
                        <span className="border border-current px-2 py-0.5 min-w-[100px] rounded dark:border-gray-700">{getServiceYearLabel(currentServiceYear)}</span>
                    </div>
                </div>

                {pageLoading ? (
                    <div className="text-center py-20 flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted font-medium">Carregando registros...</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8 print:block">
                        {/* Filtered Cities Loop */}
                        {availableCities
                            .filter(city => selectedCities.includes(city))
                            .map((city, cityIndex) => {
                                const cityRows = rows.filter(r => (r.territory.cityName || 'Sem Cidade') === city);

                                // Determine number of pages needed for this city (assignments per page based on columnsPerPage)
                                const currentMinColumns = minColumns[city] || 4;
                                const maxAssignments = Math.max(...cityRows.map(r => r.assignments.length), currentMinColumns);
                                const totalPages = Math.ceil(maxAssignments / COLUMNS_PER_PAGE) || 1;

                                return Array.from({ length: totalPages }).map((_, pageIndex) => {
                                    const isFirstCity = cityIndex === 0;
                                    const isFirstPageOfCity = pageIndex === 0;
                                    const isLastPageOfCity = pageIndex === totalPages - 1;

                                    const isPageBreakMode = printMode === 'page-break';
                                    const isStrictFirst = isFirstCity && isFirstPageOfCity;
                                    const shouldBreak = isPageBreakMode && (!isStrictFirst);

                                    const showMainHeader = isStrictFirst || shouldBreak;
                                    const showTableHeaders = isPageBreakMode || pageIndex === 0;
                                    const showFooter = isPageBreakMode || (cityIndex === availableCities.length - 1 && isLastPageOfCity);
                                    const showCityName = selectedCities.length > 1;

                                    const startIndex = pageIndex * COLUMNS_PER_PAGE;

                                    return (
                                        <div key={`${city}-${pageIndex}`} className={`flex flex-col break-inside-avoid ${shouldBreak ? 'print:break-before-page' : ''} ${!isStrictFirst && !shouldBreak ? 'mt-8 print:mt-8' : ''}`}>

                                            {/* Print-Only Global Header */}
                                            {showMainHeader && (
                                                <div className={`mb-2 hidden print:block ${isStrictFirst || isPageBreakMode ? 'pt-2' : 'pt-8 border-t border-black mt-8'}`}>
                                                    <h1 className="text-center text-[18px] font-bold uppercase mb-6 font-sans text-black tracking-wide">REGISTRO DE DESIGNAÇÃO DE TERRITÓRIO</h1>
                                                    <div className="font-bold font-sans text-[14px] text-black text-left pl-0.5 mb-1">
                                                        Ano de Serviço: <span className="border-b border-black min-w-[150px] inline-block pl-2">{getServiceYearLabel(currentServiceYear)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`border border-black bg-white dark:bg-transparent shadow-sm print:shadow-none min-w-[700px] print:min-w-full print:border-black print:bg-white ${!showMainHeader && !isPageBreakMode && isFirstPageOfCity ? 'border-t-0' : ''}`}>
                                                {/* Table Column Headers */}
                                                {showTableHeaders && (
                                                    <div className="flex border-b border-black bg-gray-200 dark:bg-gray-900 print:bg-gray-200 font-bold text-[9px] text-center tracking-tight font-sans text-black dark:text-gray-300 print:text-black print:border-black">
                                                        <div className="w-[50px] border-r border-black print:border-black flex items-center justify-center p-1 flex-col leading-tight">
                                                            <span>Terr.</span>
                                                            <span>n.º</span>
                                                        </div>
                                                        <div className="w-[80px] border-r border-black print:border-black flex items-center justify-center p-1 leading-tight">
                                                            Última data concluída*
                                                        </div>

                                                        {Array.from({ length: 4 }).map((_, i) => (
                                                            <div key={i} className="flex-1 flex flex-col border-r border-black print:border-black last:border-r-0">
                                                                <div className="h-6 flex items-center justify-center border-b border-black print:border-black w-full text-black dark:text-gray-300 print:text-black bg-gray-200 dark:bg-gray-900 print:bg-gray-200">
                                                                    Designado para
                                                                </div>
                                                                <div className="flex flex-1 h-8">
                                                                    <div className="w-1/2 p-1 border-r border-black print:border-black flex items-center justify-center leading-tight text-black dark:text-gray-300 print:text-black bg-gray-200 dark:bg-gray-900 print:bg-gray-200 text-[8px]">
                                                                        Data da designação
                                                                    </div>
                                                                    <div className="w-1/2 p-1 flex items-center justify-center leading-tight text-black dark:text-gray-300 print:text-black bg-gray-200 dark:bg-gray-900 print:bg-gray-200 text-[8px]">
                                                                        Data da conclusão
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {/* Spacer for Right Action Button Alignment */}
                                                        <div className="w-8 bg-transparent no-print"></div>
                                                    </div>
                                                )}

                                                {/* City Name Row */}
                                                {showCityName && (
                                                    <div className={`bg-gray-100 dark:bg-gray-800 print:bg-gray-100 border-b border-black print:border-black p-1 font-bold text-xs text-center tracking-wide text-black dark:text-gray-200 print:text-black relative group/header ${showTableHeaders ? 'border-t-black print:border-t-black' : ''}`}>
                                                        {city} {totalPages > 1 && `(Parte ${pageIndex + 1})`}

                                                        {/* Individual Print Button - Only on first page to imply Group Print */}
                                                        {pageIndex === 0 && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handlePrintSingleCity(city); }}
                                                                className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/50 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors no-print"
                                                                title={`Imprimir arquivo de ${city}`}
                                                            >
                                                                <Printer className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Rows */}
                                                {cityRows.map((row) => {
                                                    let referenceDate = row.lastCompletedDate;

                                                    if (pageIndex > 0) {
                                                        const prevBatchLastAssign = row.assignments[startIndex - 1];
                                                        if (prevBatchLastAssign?.completedDate) {
                                                            referenceDate = prevBatchLastAssign.completedDate;
                                                        } else {
                                                            referenceDate = undefined;
                                                        }
                                                    }

                                                    return (
                                                        <div key={row.territory.id} className="flex border-b border-black print:border-black text-xs h-[40px] hover:bg-yellow-50/30 dark:hover:bg-white/5 transition-colors group/row font-sans page-break-inside-avoid text-black dark:text-gray-200 print:text-black print:bg-white">
                                                            {/* Territory Name */}
                                                            <div className="w-[50px] border-r border-black print:border-black flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 print:bg-white p-1 font-bold text-sm text-black dark:text-gray-100 print:text-black">
                                                                {row.territory.name}
                                                            </div>

                                                            {/* Last Completed (Clickable) */}
                                                            <div
                                                                onClick={() => {
                                                                    if (pageIndex === 0) {
                                                                        setEditingLegacy({
                                                                            territoryId: row.territory.id,
                                                                            name: row.territory.name,
                                                                            date: row.lastCompletedDate
                                                                        });
                                                                        setIsLegacyModalOpen(true);
                                                                    }
                                                                }}
                                                                className={`w-[80px] border-r border-black print:border-black flex items-center justify-center text-center p-1 font-medium bg-white dark:bg-transparent print:bg-white ${pageIndex === 0 ? 'cursor-pointer hover:bg-primary-light/50 dark:hover:bg-blue-900/20 group/legacy-cell' : ''} transition-colors relative text-[10px] text-black dark:text-gray-200 print:text-black`}
                                                            >
                                                                {formatDate(referenceDate)}
                                                                {pageIndex === 0 && <Edit2 className="w-3 h-3 absolute top-1 right-1 opacity-0 group-hover/legacy-cell:opacity-50 text-primary-light/500 no-print" />}
                                                            </div>

                                                            {/* Assignments (Slots) */}
                                                            {Array.from({ length: 4 }).map((_, i) => {
                                                                const assign = row.assignments[startIndex + i];
                                                                return (
                                                                    <div key={i} className="flex-1 border-r border-black print:border-black last:border-r-0 relative group/cell flex flex-col print:bg-white">
                                                                        {assign ? (
                                                                            <>
                                                                                <div className="h-[20px] flex items-center justify-center border-b border-black print:border-black px-1 text-center relative bg-white dark:bg-transparent print:bg-white overflow-hidden">
                                                                                    <span className="font-semibold text-black dark:text-gray-200 print:text-black line-clamp-1 text-[10px] leading-none w-full">
                                                                                        {assign.publisherName}
                                                                                    </span>
                                                                                    {/* Actions Overlay */}
                                                                                    <div className="absolute right-1 top-[1px] hidden group-hover/cell:flex gap-1 no-print bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 p-0.5 rounded-md z-10">
                                                                                        <button onClick={() => { setSelectedTerritoryId(row.territory.id); setEditingAssignment(assign); setIsModalOpen(true); }} className="text-primary hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-0.5 rounded"><Edit2 className="w-3 h-3" /></button>
                                                                                        <button onClick={() => handleDeleteAssignment(assign.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-0.5 rounded"><Trash2 className="w-3 h-3" /></button>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-1 flex min-h-0 print:bg-white">
                                                                                    <div className="w-1/2 border-r border-black print:border-black flex items-center justify-center text-[9px] text-black dark:text-gray-300 print:text-black bg-white dark:bg-transparent print:bg-white">{formatDate(assign.assignedDate)}</div>
                                                                                    <div className="w-1/2 flex items-center justify-center text-[9px] text-black dark:text-gray-300 print:text-black bg-white dark:bg-transparent print:bg-white">{formatDate(assign.completedDate)}</div>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <div className="w-full h-full flex flex-col print:bg-white">
                                                                                <div className="h-[20px] border-b border-black print:border-black w-full relative group/btn-helper bg-white dark:bg-transparent print:bg-white">
                                                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 cursor-pointer no-print" onClick={() => { setSelectedTerritoryId(row.territory.id); setEditingAssignment({ assignedDate: new Date() }); setIsModalOpen(true); }}><Plus className="w-4 h-4 text-primary-light/500" /></div>
                                                                                </div>
                                                                                <div className="flex-1 flex min-h-0 print:bg-white">
                                                                                    <div className="w-1/2 border-r border-black print:border-black h-full bg-white dark:bg-transparent print:bg-white"></div>
                                                                                    <div className="w-1/2 h-full bg-white dark:bg-transparent print:bg-white"></div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Add Page Trigger (Right Edge) - Only on the last page */}
                                                            {isLastPageOfCity && (
                                                                <div
                                                                    className="w-8 hover:w-10 transition-all duration-200 bg-transparent hover:bg-green-50 dark:hover:bg-green-900/30 flex items-center justify-center cursor-pointer no-print group/add-col border-l border-transparent hover:border-green-200 dark:hover:border-green-800 shrink-0"
                                                                    onClick={() => setMinColumns(prev => ({
                                                                        ...prev,
                                                                        [city]: Math.max(prev[city] || 4, maxAssignments) + 4
                                                                    }))}
                                                                    title="Adicionar Página (Mais 4 Colunas)"
                                                                >
                                                                    <Plus className="w-4 h-4 text-green-500 opacity-0 group-hover/add-col:opacity-100 transition-opacity" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {
                                                showFooter && (
                                                    <div className="mt-1 text-[14px] text-black font-sans hidden print:block text-left leading-tight font-medium">
                                                        *Ao iniciar uma nova folha, use esta coluna para registrar a data em que cada território foi concluído pela última vez.
                                                        <br />
                                                        S-13-T 01/22
                                                    </div>
                                                )
                                            }
                                        </div>
                                    );
                                });
                            })}

                        {/* Continuous Footer Placeholder - Logic handled by showFooter */}
                    </div>
                )
                }
            </main>

            {/* Print Settings Modal */}
            {isPrintSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in no-print">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-main">Opções de Impressão</h2>
                            <button onClick={() => setIsPrintSettingsOpen(false)} className="text-muted hover:text-main"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-6">
                            {/* Layout Mode */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-400 mb-2 uppercase">Layout</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setPrintMode('page-break')}
                                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-colors ${printMode === 'page-break' ? 'border-primary-light/500 bg-primary-light/50 dark:bg-blue-900/20 text-primary-dark dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-main'}`}
                                    >
                                        <FileText className="w-5 h-5" />
                                        <span className="text-sm font-medium">Uma Cidade por Página</span>
                                    </button>
                                    <button
                                        onClick={() => setPrintMode('continuous')}
                                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-colors ${printMode === 'continuous' ? 'border-primary-light/500 bg-primary-light/50 dark:bg-blue-900/20 text-primary-dark dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-main'}`}
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <FileText className="w-4 h-4" />
                                            <FileText className="w-4 h-4 -mt-2 opacity-60" />
                                        </div>
                                        <span className="text-sm font-medium">Tabela Contínua</span>
                                    </button>
                                </div>
                            </div>

                            {/* City Filter */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-400 uppercase">Cidades</h3>
                                    <div className="flex gap-2 text-xs">
                                        <button
                                            onClick={() => setSelectedCities(availableCities)}
                                            className="text-primary dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                                        >
                                            Todas
                                        </button>
                                        <span className="text-gray-300 dark:text-gray-600">|</span>
                                        <button
                                            onClick={() => setSelectedCities([])}
                                            className="text-primary dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                                        >
                                            Nenhuma
                                        </button>
                                    </div>
                                </div>
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 max-h-[200px] overflow-y-auto space-y-2 bg-gray-50 dark:bg-gray-800 custom-scrollbar">
                                    {availableCities.map(city => (
                                        <label key={city} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-700 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-600 cursor-pointer shadow-sm text-main">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary-light/500 bg-white dark:bg-gray-600"
                                                checked={selectedCities.includes(city)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedCities(prev => [...prev, city]);
                                                    else setSelectedCities(prev => prev.filter(c => c !== city));
                                                }}
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{city}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setIsPrintSettingsOpen(false);

                                    // Set dynamic document title for the print file name
                                    const yearLabel = getServiceYearLabel(currentServiceYear).replace('/', '-');
                                    let cityLabel = '';

                                    if (selectedCities.length === 1) {
                                        cityLabel = selectedCities[0];
                                    } else if (selectedCities.length <= 3) {
                                        cityLabel = selectedCities.join(' e ');
                                    } else {
                                        cityLabel = `${selectedCities.length} Cidades`;
                                    }

                                    const originalTitle = document.title;
                                    document.title = `S-13_T [${yearLabel} - ${cityLabel}]`;

                                    // Slight delay to allow modal to close before printing
                                    setTimeout(() => {
                                        window.print();
                                        // Restore title after print dialog opens (browser handles this asynchronously usually, but for single page apps this is enough)
                                        setTimeout(() => { document.title = originalTitle; }, 500);
                                    }, 100);
                                }}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                disabled={selectedCities.length === 0}
                            >
                                <Download className="w-5 h-5" />
                                Imprimir {selectedCities.length} Cidade(s)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Assignments */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in no-print">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-main">
                                {editingAssignment?.id ? 'Editar Registro' : 'Novo Registro Manual'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-main"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Publicador</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                                    <input
                                        type="text"
                                        className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 font-medium text-main"
                                        placeholder="Nome do Publicador"
                                        value={editingAssignment?.publisherName || ''}
                                        onChange={e => setEditingAssignment(prev => ({ ...prev, publisherName: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Designação</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 font-medium text-sm text-main"
                                        value={formatDateInput(editingAssignment?.assignedDate)}
                                        onChange={e => setEditingAssignment(prev => ({
                                            ...prev,
                                            assignedDate: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined
                                        }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Conclusão</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 font-medium text-sm text-main"
                                        value={formatDateInput(editingAssignment?.completedDate)}
                                        onChange={e => setEditingAssignment(prev => ({
                                            ...prev,
                                            completedDate: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined
                                        }))}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSaveAssignment}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl mt-2 flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Salvar Registro
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Legacy Date */}
            {isLegacyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in no-print">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-main">Última Data Concluída</h2>
                            <button onClick={() => setIsLegacyModalOpen(false)} className="text-muted hover:text-main"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Defina a data histórica de conclusão para o território <strong>{editingLegacy?.name}</strong>.
                                Esta data aparecerá na coluna &quot;Última Data Concluída&quot;.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Data</label>
                                <input
                                    type="date"
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 font-medium text-sm text-main"
                                    value={formatDateInput(editingLegacy?.date)}
                                    onChange={e => setEditingLegacy(prev => prev ? ({
                                        ...prev,
                                        date: e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined
                                    }) : null)}
                                />
                            </div>

                            <button
                                onClick={handleSaveLegacyDate}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl mt-2 flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Salvar Data
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                onConfirm={confirmModal?.onConfirm || (() => { })}
                title={confirmModal?.title || ''}
                message={confirmModal?.message || ''}
                variant={confirmModal?.variant || 'info'}
                isLoading={isDeleting}
            />

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-container { padding: 0 !important; margin: 0 !important; max-width: 100% !important; overflow: visible !important; width: 100% !important; }
                    
                    /* Reset Page & Body */
                    body, html { 
                        background-color: white !important; 
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact; 
                    }
                    @page { margin: 10mm; size: portrait; }
                    
                    /* Aggressive Dark Mode Override */
                    :root, .dark, body, div, span, applet, object, iframe, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, abbr, acronym, address, big, cite, code, del, dfn, em, img, ins, kbd, q, s, samp, small, strike, strong, sub, sup, tt, var, b, u, i, center, dl, dt, dd, ol, ul, li, fieldset, form, label, legend, table, caption, tbody, tfoot, thead, tr, th, td, article, aside, canvas, details, embed, figure, figcaption, footer, header, hgroup, menu, nav, output, ruby, section, summary, time, mark, audio, video {
                        background-color: transparent !important; /* Let body white show through or specific whites */
                        color: black !important;
                        box-shadow: none !important;
                        text-shadow: none !important;
                    }

                    /* Specific overrides for containers that need white backgrounds */
                    .bg-white, .print\:bg-white {
                        background-color: white !important;
                    }
                    
                    /* Helper to ensure grays print as light grays if intended (like headers) */
                    .print\:bg-gray-200 {
                        background-color: #e5e7eb !important;
                    }
                    .print\:bg-gray-100 {
                        background-color: #f3f4f6 !important;
                    }

                    /* Borders - Specific targeting to avoid double-borders bug */
                    * {
                        border-color: black !important;
                    }
                    /* Increase width ONLY for classes that define borders */
                    .border { border-width: 1.5pt !important; }
                    .border-t { border-top-width: 1.5pt !important; }
                    .border-r { border-right-width: 1.5pt !important; }
                    .border-b { border-bottom-width: 1.5pt !important; }
                    .border-l { border-left-width: 1.5pt !important; }

                    /* Zero overrides must have higher specificity or appear after */
                    .border-0 { border-width: 0 !important; }
                    .border-t-0 { border-top-width: 0 !important; }
                    .border-r-0 { border-right-width: 0 !important; }
                    .border-b-0 { border-bottom-width: 0 !important; }
                    .border-l-0 { border-left-width: 0 !important; }
                    
                    /* Page Breaks */
                    .break-inside-avoid {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
        </div>
    );
}
