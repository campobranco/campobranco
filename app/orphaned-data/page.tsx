"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Database, Trash2, Link as LinkIcon, AlertTriangle, Check, Loader2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { repairOrphanData, bulkDeleteOrphans } from '@/lib/services/admin';


interface OrphanedItem {
    id: string;
    type: 'address' | 'territory' | 'city' | 'witnessing' | 'visit';
    name: string; // Street or Name
    details: string; // Number or other info
    missing: string[]; // ['congregation', 'city', 'territory']
    data: any;
    path?: string;
}

export default function OrphanedDataPage() {
    const { isAdminRoleGlobal, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [orphans, setOrphans] = useState<OrphanedItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Fix Modal State
    const [fixingItem, setFixItem] = useState<OrphanedItem | null>(null);
    const [congs, setCongs] = useState<{ id: string, name: string }[]>([]);
    const [cities, setCities] = useState<{ id: string, name: string }[]>([]);
    const [territories, setTerritories] = useState<{ id: string, name: string }[]>([]);

    const [selCong, setSelCong] = useState('');
    const [selCity, setSelCity] = useState('');
    const [selTerr, setSelTerr] = useState('');

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'info';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const [saving, setSaving] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDetails, setEditDetails] = useState('');
    const [editNumber, setEditNumber] = useState('');
    const [editBlock, setEditBlock] = useState('');
    const [editObservation, setEditObservation] = useState('');
    const [editSchedule, setEditSchedule] = useState('');
    const [editState, setEditState] = useState('');

    useEffect(() => {
        if (!authLoading && !isAdminRoleGlobal) {
            router.push('/');
        }
    }, [isAdminRoleGlobal, authLoading, router]);

    const fetchOrphans = async () => {
        setLoading(true);
        const newOrphans: OrphanedItem[] = [];

        try {
            // 1. Busca Congregações, Cidades e Territórios Válidos para referência
            const congsSnap = await getDocs(collection(db, 'congregations'));
            const validCongIds = new Set(congsSnap.docs.map(d => d.id));

            const citiesSnap = await getDocs(collection(db, 'cities'));
            const validCityIds = new Set(citiesSnap.docs.map(d => d.id));

            const territoriesSnap = await getDocs(collection(db, 'territories'));
            const validTerritoryIds = new Set(territoriesSnap.docs.map(d => d.id));

            // 2. Scan Endereços
            const addressesSnap = await getDocs(collection(db, 'addresses'));
            const validAddressIds = new Set<string>();

            addressesSnap.docs.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;
                validAddressIds.add(id);

                const missing = [];
                const cId = data.congregationId || data.congregation_id;
                const cityId = data.cityId || data.city_id;
                const tId = data.territoryId || data.territory_id;

                if (!cId) missing.push('Congregação');
                else if (!validCongIds.has(cId)) missing.push('Congregação Inválida');

                if (!cityId) missing.push('Cidade');
                else if (!validCityIds.has(cityId)) missing.push('Cidade Inválida');

                if (!tId) missing.push('Território');
                else if (!validTerritoryIds.has(tId)) missing.push('Território Inválido');

                if (missing.length > 0) {
                    newOrphans.push({
                        id,
                        type: 'address',
                        name: data.street || 'Sem Rua',
                        details: data.number || 'S/N',
                        missing,
                        data
                    });
                }
            });

            // 3. Scan Territórios
            territoriesSnap.docs.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;
                const missing = [];
                const cityId = data.cityId || data.city_id;
                const cId = data.congregationId || data.congregation_id;

                if (!cityId) missing.push('Cidade');
                else if (!validCityIds.has(cityId)) missing.push('Cidade Inválida');

                if (cId && !validCongIds.has(cId)) missing.push('Congregação Inválida');

                if (missing.length > 0) {
                    newOrphans.push({
                        id,
                        type: 'territory',
                        name: data.name || 'Sem Nome',
                        details: 'Mapa',
                        missing,
                        data
                    });
                }
            });

            // 4. Scan Pontos de Testemunho
            const pointsSnap = await getDocs(collection(db, 'witnessing_points'));
            pointsSnap.docs.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;
                const missing = [];
                const cId = data.congregationId || data.congregation_id;
                const cityId = data.cityId || data.city_id;

                if (!cId) missing.push('Congregação');
                else if (!validCongIds.has(cId)) missing.push('Congregação Inválida');

                if (!cityId) missing.push('Cidade');
                else if (!validCityIds.has(cityId)) missing.push('Cidade Inválida');

                if (missing.length > 0) {
                    newOrphans.push({
                        id,
                        type: 'witnessing',
                        name: data.name || 'Ponto sem Nome',
                        details: data.address || 'Sem Endereço',
                        missing,
                        data
                    });
                }
            });

            // 5. Scan Cidades
            citiesSnap.docs.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;
                const missing = [];
                const cId = data.congregationId || data.congregation_id;

                if (!cId) missing.push('Congregação');
                else if (!validCongIds.has(cId)) missing.push('Congregação Inválida');

                if (missing.length > 0) {
                    newOrphans.push({
                        id,
                        type: 'city',
                        name: data.name || 'Sem Nome',
                        details: 'Cidade',
                        missing,
                        data
                    });
                }
            });

            // 6. Scan Visitas
            const visitsSnap = await getDocs(collection(db, 'visits'));
            visitsSnap.docs.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;
                const missing = [];
                const cId = data.congregationId || data.congregation_id;
                const aId = data.addressId || data.address_id;

                if (cId && !validCongIds.has(cId)) {
                    missing.push('Congregação Inválida');
                }
                if (aId && !validAddressIds.has(aId)) {
                    missing.push('Endereço Pai Excluído');
                }

                if (missing.length > 0) {
                    newOrphans.push({
                        id,
                        type: 'visit',
                        name: 'Visita de ' + (data.userName || data.user_name || 'Desconhecido'),
                        details: data.date ? (data.date.toDate ? data.date.toDate().toLocaleDateString() : new Date(data.date).toLocaleDateString()) : 'Sem Data',
                        missing,
                        data
                    });
                }
            });

        } catch (error) {
            console.error("Error scanning orphans:", error);
        } finally {
            setOrphans(newOrphans);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdminRoleGlobal) fetchOrphans();
    }, [isAdminRoleGlobal]);

    // Fetch Context Options when modal opens
    useEffect(() => {
        if (fixingItem) {
            // Load Congregations
            getDocs(collection(db, 'congregations')).then((snap) => {
                setCongs(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
            });

            // Pre-fill if exists (only if not marked as invalid)
            const isCongInvalid = fixingItem.missing.some(m => m.includes('Congregação'));
            const isCityInvalid = fixingItem.missing.some(m => m.includes('Cidade'));
            const isTerrInvalid = fixingItem.missing.some(m => m.includes('Território'));

            setSelCong(isCongInvalid ? '' : (fixingItem.data.congregationId || fixingItem.data.congregation_id || ''));
            setSelCity(isCityInvalid ? '' : (fixingItem.data.cityId || fixingItem.data.city_id || ''));
            setSelTerr(isTerrInvalid ? '' : (fixingItem.data.territoryId || fixingItem.data.territory_id || ''));

            setEditName(fixingItem.name || '');
            setEditDetails(fixingItem.details || '');
            setEditNumber('');
            setEditBlock('');
            setEditObservation(fixingItem.data.observation || fixingItem.data.notes || fixingItem.data.observations || '');
            setEditSchedule(fixingItem.data.schedule || '');
            setEditState(fixingItem.data.state || 'SP');
        }
    }, [fixingItem]);

    // Cascading selects
    useEffect(() => {
        if (selCong) {
            const q = query(collection(db, 'cities'), where('congregationId', '==', selCong));
            getDocs(q).then((snap) => {
                setCities(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
            });
        } else {
            setCities([]);
        }
    }, [selCong]);

    useEffect(() => {
        if (selCity) {
            const q = query(collection(db, 'territories'),
                where('congregationId', '==', selCong),
                where('cityId', '==', selCity)
            );
            getDocs(q).then((snap) => {
                setTerritories(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
            });
        } else {
            setTerritories([]);
        }
    }, [selCity, selCong]);


    const handleSaveFix = async () => {
        if (!fixingItem) return;

        setSaving(true);
        try {
            const updates: any = {};

            if (fixingItem.type === 'address') {
                if (!selCong || !selCity || !selTerr) {
                    toast.info("Para endereços, selecione Congregação, Cidade e Território.");
                    setSaving(false);
                    return;
                }
                updates.congregationId = selCong;
                updates.cityId = selCity;
                updates.territoryId = selTerr;
            }
            else if (fixingItem.type === 'territory') {
                if (!selCity) {
                    toast.info("Selecione a Cidade.");
                    setSaving(false);
                    return;
                }
                updates.cityId = selCity;
                if (selCong) updates.congregationId = selCong;
            }
            else if (fixingItem.type === 'witnessing') {
                if (!selCong || !selCity) {
                    toast.info("Selecione Congregação e Cidade.");
                    setSaving(false);
                    return;
                }
                updates.congregationId = selCong;
                updates.cityId = selCity;
            }
            else if (fixingItem.type === 'city') {
                if (!selCong) {
                    toast.info("Selecione a Congregação.");
                    setSaving(false);
                    return;
                }
                updates.congregationId = selCong;
                updates.state = editState;
            }

            // Common field updates based on type
            if (fixingItem.type === 'address') {
                updates.street = editName;
                updates.observations = editObservation;
            } else if (fixingItem.type === 'territory' || fixingItem.type === 'witnessing' || fixingItem.type === 'city') {
                updates.name = editName;
                if (fixingItem.type === 'territory') updates.notes = editObservation;
                if (fixingItem.type === 'witnessing') {
                    updates.address = editDetails;
                    updates.schedule = editSchedule;
                }
            }

            // Remover campos nulos ou indefinidos de updates
            Object.keys(updates).forEach(key => (updates[key] === undefined) && delete updates[key]);

            if (Object.keys(updates).length === 0) {
                toast.info("Nenhuma alteração para salvar.");
                setSaving(false);
                return;
            }

            // Chamada para o serviço client-side
            const result = await repairOrphanData(fixingItem.id, fixingItem.type, updates);

            if (!result.success) {
                throw new Error(result.error || 'Falha ao processar reparo');
            }


            toast.success("Dados restaurados e vinculados com sucesso!");
            setFixItem(null);

            // Pequeno delay para consistência do banco antes do refresh
            setTimeout(() => {
                fetchOrphans();
            }, 500);
        } catch (error: any) {
            console.error("DEBUG - Repair Error:", error);
            toast.error(`Erro ao salvar: ${error.message || "Erro desconhecido"}`);
        } finally {
            setSaving(false);
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === orphans.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(orphans.map(o => o.id)));
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        setConfirmModal({
            isOpen: true,
            title: `Excluir ${selectedIds.size} itens`,
            message: `Tem certeza que deseja excluir permanentemente os ${selectedIds.size} itens selecionados? Esta ação não pode ser desfeita.`,
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setLoading(true);
                try {
                    const idsArray = Array.from(selectedIds);

                    // Separar por tipo para deletar das tabelas corretas
                    const byType: Record<string, string[]> = {};
                    orphans.filter(o => selectedIds.has(o.id)).forEach(o => {
                        if (!byType[o.type]) byType[o.type] = [];
                        byType[o.type].push(o.id);
                    });

                    for (const [type, ids] of Object.entries(byType)) {
                        const colName = type === 'address' ? 'addresses' :
                            type === 'territory' ? 'territories' :
                                type === 'witnessing' ? 'witnessing_points' :
                                    type === 'visit' ? 'visits' : 'cities';

                        // Limpar referências antes de deletar
                        // Em Firestore, faremos isso via API de reparo ou manualmente aqui se necessário
                        // Mas para simplificar a exclusão em massa, vamos direto via API se possível
                        // Ou implementamos um deleteDocs util

                        // Usar função client-side
                        const result = await bulkDeleteOrphans(ids, colName);

                        if (!result.success) {
                            throw new Error(result.error || 'Falha ao excluir em massa');
                        }
                    }


                    toast.success(`${selectedIds.size} itens excluídos com sucesso.`);
                    setSelectedIds(new Set());
                    fetchOrphans();
                } catch (error) {
                    console.error("Error bulk deleting:", error);
                    toast.error("Erro ao realizar exclusão em massa.");
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    if (authLoading || !isAdminRoleGlobal) return null;

    return (
        <div className="min-h-screen bg-background pb-10 font-sans text-main">
            <header className="bg-surface px-6 py-4 border-b border-surface-border flex items-center gap-3 sticky top-0 z-10">
                <Link href="/settings" className="p-2 hover:bg-background rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-muted" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-main">
                        <Database className="w-5 h-5 text-orange-500" />
                        Dados Órfãos
                    </h1>
                    <p className="text-xs text-muted">Itens sem vínculo detectados</p>
                </div>
            </header>

            <main className="px-6 py-8 max-w-2xl mx-auto">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : orphans.length === 0 ? (
                    <div className="text-center py-20 bg-surface rounded-xl border-2 border-dashed border-surface-border">
                        <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-main">Tudo limpo!</h3>
                        <p className="text-muted">Nenhum dado órfão encontrado.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 rounded-lg text-sm border border-orange-100 dark:border-orange-800 flex-1">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <p>Foram encontrados <b>{orphans.length}</b> itens com vínculos quebrados.</p>
                                </div>

                                <label className="flex items-center gap-2 px-4 cursor-pointer hover:bg-surface rounded-lg transition-colors py-2 border border-surface-border ml-3 bg-surface shadow-sm active:scale-95 group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={selectedIds.size === orphans.length && orphans.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                    <span className="text-xs font-bold text-muted group-hover:text-main">
                                        {selectedIds.size === orphans.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                                    </span>
                                </label>
                            </div>

                            {selectedIds.size > 0 && (
                                <div className="bg-surface border border-red-100 dark:border-red-900/30 p-4 rounded-xl flex items-center justify-between shadow-lg shadow-red-500/5 animate-in slide-in-from-top-2">
                                    <p className="text-sm font-bold text-main">
                                        <b>{selectedIds.size}</b> itens selecionados
                                    </p>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-red-500/20 transition-all active:scale-95"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Excluir Selecionados
                                    </button>
                                </div>
                            )}
                        </div>

                        {orphans.map(item => (
                            <div key={item.id} className="bg-surface p-5 rounded-lg shadow-sm border border-surface-border flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="pt-1">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary transition-transform active:scale-90"
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase
                                                    ${item.type === 'address' ? 'bg-primary-light dark:bg-blue-900/30 text-primary-dark dark:text-blue-300' :
                                                        item.type === 'territory' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                                                            item.type === 'witnessing' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                                                item.type === 'visit' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}
                                                `}>
                                                    {item.type === 'address' ? 'Endereço' : item.type === 'territory' ? 'Mapa' : item.type === 'witnessing' ? 'T. Público' : item.type === 'visit' ? 'Visita' : 'Cidade'}
                                                </span>
                                                <span className="text-xs text-red-500 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                                    Falta: {item.missing.join(', ')}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-main text-lg">{item.name}</h3>
                                            <p className="text-sm text-muted">{item.details}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedIds(new Set([item.id]));
                                                setTimeout(handleBulkDelete, 0);
                                            }}
                                            className="p-2 text-red-600 hover:text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setFixItem(item)}
                                            className="p-2 text-primary hover:text-primary-light/500 bg-primary-light/50 hover:bg-primary-light dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                            title="Editar/Vincular"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Fix Modal */}
            {
                fixingItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-surface rounded-xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-300 border border-surface-border">
                            <h2 className="text-xl font-bold text-main mb-6 flex items-center gap-2">
                                <LinkIcon className="w-6 h-6 text-primary" />
                                Vincular Dados
                            </h2>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted uppercase">Congregação</label>
                                    <select
                                        className="w-full bg-background border border-surface-border text-main rounded-md p-3 font-bold text-sm focus:border-primary-light/500 transition-colors"
                                        value={selCong}
                                        onChange={(e) => setSelCong(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {congs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                {(fixingItem.type === 'address' || fixingItem.type === 'territory' || fixingItem.type === 'witnessing') && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted uppercase">Cidade</label>
                                        <select
                                            className="w-full bg-background border border-surface-border text-main rounded-md p-3 font-bold text-sm focus:border-primary-light/500 transition-colors"
                                            value={selCity}
                                            onChange={(e) => setSelCity(e.target.value)}
                                            disabled={!selCong && cities.length === 0}
                                        >
                                            <option value="">Selecione...</option>
                                            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {fixingItem.type === 'address' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted uppercase">Território (Mapa)</label>
                                        <select
                                            className="w-full bg-background border border-surface-border text-main rounded-md p-3 font-bold text-sm focus:border-primary-light/500 transition-colors"
                                            value={selTerr}
                                            onChange={(e) => setSelTerr(e.target.value)}
                                            disabled={!selCity && territories.length === 0}
                                        >
                                            <option value="">Selecione...</option>
                                            {territories.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="border-t border-surface-border pt-4 mt-4 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted uppercase tracking-wider">
                                            {fixingItem.type === 'address' ? 'Rua / Logradouro' :
                                                fixingItem.type === 'territory' ? 'Número do Mapa' : 'Nome'}
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full bg-background border border-surface-border text-main rounded-md p-3 font-bold text-sm focus:border-primary-light/500 transition-colors"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                        />
                                    </div>

                                    {fixingItem.type === 'witnessing' && (
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-muted uppercase">Endereço Completo</label>
                                                <textarea
                                                    className="w-full bg-background border border-surface-border text-main rounded-md p-3 font-bold text-sm focus:border-primary-light/500 transition-colors min-h-[80px]"
                                                    value={editDetails}
                                                    onChange={(e) => setEditDetails(e.target.value)}
                                                    placeholder="Rua, número, bairro..."
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-muted uppercase">Horário (Opcional)</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-background border border-surface-border text-main rounded-md p-3 font-bold text-sm focus:border-primary-light/500 transition-colors"
                                                    value={editSchedule}
                                                    onChange={(e) => setEditSchedule(e.target.value)}
                                                    placeholder="Ex: Segundas, 08:00 - 12:00"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {(fixingItem.type === 'address' || fixingItem.type === 'territory') && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-muted uppercase">
                                                {fixingItem.type === 'territory' ? 'Descrição' : 'Observações'}
                                            </label>
                                            <textarea
                                                className="w-full bg-background border border-surface-border text-main rounded-md p-3 font-bold text-sm focus:border-primary-light/500 transition-colors min-h-[80px]"
                                                value={editObservation}
                                                onChange={(e) => setEditObservation(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setFixItem(null)}
                                    className="flex-1 py-3 bg-background border border-surface-border rounded-md font-bold text-muted hover:text-main hover:bg-surface-highlight"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveFix}
                                    className="flex-1 py-3 bg-primary text-white rounded-md font-bold shadow-lg shadow-primary-light/500/30 hover:bg-primary-dark"
                                >
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                description={confirmModal.message}
                variant={confirmModal.variant}
            />
        </div >
    );
}
