
"use client";

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/app/context/AuthContext';
import {
    X, Upload, CheckCircle2, AlertCircle, Info,
    Loader2, Download, ChevronDown, ChevronRight,
    MapPin, Building2, Home, Eye, AlertTriangle
} from 'lucide-react';
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    writeBatch, 
    doc, 
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface CSVImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    congregationId: string;
    cityId?: string;
    territoryId?: string;
    onSuccess?: () => void;
}

// Resultado da importação efetiva (após confirmar)
interface ImportResults {
    created: { cities: number; territories: number; addresses: number };
    updated: { territories: number; addresses: number };
    skipped: number;
    errors: { line: number; reason: string }[];
    mode?: string;
}

// Estrutura de preview parseada no cliente
interface PreviewAddress {
    street: string;
    number: string;
    residentName: string;
    gender: string;
    isActive: boolean;
    isDeaf: boolean;
    isMinor: boolean;
}

interface PreviewTerritory {
    mapNum: string;
    description: string;
    addresses: PreviewAddress[];
}

interface PreviewCity {
    name: string;
    uf: string;
    territories: Record<string, PreviewTerritory>;
}

// Parser de linha CSV que respeita aspas e o separador (padrão: ponto e vírgula)
function parseCSVLine(line: string, sep = ';'): string[] {
    const row: string[] = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === sep && !inQ) { row.push(cur.trim()); cur = ''; }
        else cur += ch;
    }
    row.push(cur.trim());
    return row;
}

// Parseia o CSV e monta a árvore de preview no cliente (sem chamar a API)
function buildPreview(text: string): { cities: Record<string, PreviewCity>; totalAddresses: number; errors: string[] } {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { cities: {}, totalAddresses: 0, errors: ['CSV vazio'] };

    const rawHeader = lines[0].replace(/^\ufeff/, '');
    const sep = (rawHeader.match(/;/g) || []).length >= (rawHeader.match(/,/g) || []).length ? ';' : ',';
    const header = parseCSVLine(rawHeader, sep);

    const idx = (names: string[]) => {
        for (const n of names) {
            const i = header.findIndex(h => h.trim() === n);
            if (i >= 0) return i;
        }
        return -1;
    };

    const COLS = {
        city: idx(['Cidade', 'Nome da cidade (Cities name)', 'Nome da cidade']),
        uf: idx(['UF (Cities uf)', 'UF']),
        mapNum: idx(['Número do Mapa (Territories name)', 'Número do Mapa']),
        mapDesc: idx(['Descrição (Territories notes)', 'Descrição']),
        street: idx(['Endereço (street)', 'Endereço']),
        residents: idx(['Quantidade de residentes', 'Número de residentes (residents_count)', 'Número de residentes', 'Número de Residentes']),
        name: idx(['Nome (resident_name)', 'Nome']),
        gender: idx(['Gênero (gender)', 'Gênero']),
        active: idx(['Status (is_active)', 'Status']),
        deaf: idx(['Surdo (is_deaf)', 'Surdo']),
        minor: idx(['Menor de idade (is_minor)', 'Menor de idade']),
        number: idx(['Número', 'number', 'N°', 'Nº']),
    };

    const cities: Record<string, PreviewCity> = {};
    let totalAddresses = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i], sep);
        const g = (c: number) => (c >= 0 && c < row.length ? row[c].trim() : '');

        const cityName = g(COLS.city);
        const uf = g(COLS.uf);
        const mapNum = g(COLS.mapNum);
        if (!cityName || !mapNum) continue;

        const cityKey = `${uf.toUpperCase()}:${cityName}`;
        if (!cities[cityKey]) {
            cities[cityKey] = { name: cityName, uf: uf.toUpperCase(), territories: {} };
        }

        if (!cities[cityKey].territories[mapNum]) {
            cities[cityKey].territories[mapNum] = {
                mapNum,
                description: g(COLS.mapDesc),
                addresses: []
            };
        }

        const street = g(COLS.street);
        if (street) {
            cities[cityKey].territories[mapNum].addresses.push({
                street,
                number: g(COLS.number),
                residentName: g(COLS.name),
                gender: g(COLS.gender),
                isActive: !g(COLS.active) || g(COLS.active).toLowerCase() === 'true',
                isDeaf: g(COLS.deaf).toLowerCase() === 'true',
                isMinor: g(COLS.minor).toLowerCase() === 'true',
            });
            totalAddresses++;
        }
    }

    return { cities, totalAddresses, errors };
}

export default function CSVImportModal({
    isOpen, onClose, congregationId, cityId, territoryId, onSuccess
}: CSVImportModalProps) {
    const { user } = useAuth(); // Para obter o token do Firebase
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ImportResults | null>(null);
    const [preview, setPreview] = useState<{ cities: Record<string, PreviewCity>; totalAddresses: number; errors: string[] } | null>(null);
    const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
    const [expandedTerritories, setExpandedTerritories] = useState<Set<string>>(new Set());

    // Ao selecionar o arquivo, parseamos imediatamente e mostramos o preview
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setResults(null);

        const buffer = await f.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(buffer);

        const p = buildPreview(text);
        setPreview(p);
        // Expandir todas as cidades por padrão
        setExpandedCities(new Set(Object.keys(p.cities)));
    }, []);

    const toggleCity = (key: string) => {
        setExpandedCities(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleTerritory = (key: string) => {
        setExpandedTerritories(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    // Executa a importação real (no cliente)
    const handleImport = async () => {
        if (!file || !preview) return;
        setLoading(true);
        try {
            const results: ImportResults = {
                created: { cities: 0, territories: 0, addresses: 0 },
                updated: { territories: 0, addresses: 0 },
                skipped: 0,
                errors: []
            };

            // 1. Carregar dados existentes para decidir entre criar ou atualizar
            // Para performance, buscamos tudo da congregação de uma vez
            const citiesRef = collection(db, 'cities');
            const territoriesRef = collection(db, 'territories');
            const addressesRef = collection(db, 'addresses');

            const [citiesSnap, terrSnap, addrSnap] = await Promise.all([
                getDocs(query(citiesRef, where('congregationId', '==', congregationId))),
                getDocs(query(territoriesRef, where('congregationId', '==', congregationId))),
                getDocs(query(addressesRef, where('congregationId', '==', congregationId)))
            ]);

            const existingCities = new Map(citiesSnap.docs.map(d => [`${d.data().uf}:${d.data().name}`.toUpperCase(), { id: d.id, ...d.data() } as any]));
            const existingTerritories = new Map(terrSnap.docs.map(d => [`${d.data().cityId}:${d.data().name}`.toUpperCase(), { id: d.id, ...d.data() } as any]));
            const existingAddresses = new Map(addrSnap.docs.map(d => [`${d.data().territoryId}:${d.data().street}:${d.data().number || ''}`.toUpperCase(), { id: d.id, ...d.data() } as any]));

            const batch = writeBatch(db);
            let batchCount = 0;
            const commitBatch = async () => {
                if (batchCount > 0) {
                    await batch.commit();
                    // Reiniciar não funciona em batch, precisa de um novo
                    return writeBatch(db);
                }
                return batch;
            };

            let currentBatch = batch;

            // 2. Iterar sobre a árvore de preview
            for (const cityKey of Object.keys(preview.cities)) {
                const pCity = preview.cities[cityKey];
                let cityId = existingCities.get(cityKey)?.id;

                // Criar cidade se não existir
                if (!cityId) {
                    const newCityRef = doc(collection(db, 'cities'));
                    currentBatch.set(newCityRef, {
                        name: pCity.name,
                        uf: pCity.uf,
                        congregationId,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    cityId = newCityRef.id;
                    results.created.cities++;
                    batchCount++;
                }

                for (const tName of Object.keys(pCity.territories)) {
                    const pTerr = pCity.territories[tName];
                    const terrKey = `${cityId}:${tName}`.toUpperCase();
                    let territoryId = existingTerritories.get(terrKey)?.id;

                    if (!territoryId) {
                        const newTerrRef = doc(collection(db, 'territories'));
                        currentBatch.set(newTerrRef, {
                            name: pTerr.mapNum,
                            notes: pTerr.description,
                            cityId,
                            congregationId,
                            status: 'LIVRE',
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });
                        territoryId = newTerrRef.id;
                        results.created.territories++;
                        batchCount++;
                    } else {
                        // Opcional: atualizar descrição se mudou
                        currentBatch.update(doc(db, 'territories', territoryId), {
                            notes: pTerr.description,
                            updatedAt: serverTimestamp()
                        });
                        results.updated.territories++;
                        batchCount++;
                    }

                    if (batchCount >= 400) { currentBatch = await commitBatch(); batchCount = 0; }

                    for (const addr of pTerr.addresses) {
                        const addrKey = `${territoryId}:${addr.street}:${addr.number || ''}`.toUpperCase();
                        const existing = existingAddresses.get(addrKey);

                        if (!existing) {
                            const newAddrRef = doc(collection(db, 'addresses'));
                            currentBatch.set(newAddrRef, {
                                ...addr,
                                territoryId,
                                cityId,
                                congregationId,
                                isActive: true,
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp()
                            });
                            results.created.addresses++;
                            batchCount++;
                        } else {
                            // Atualizar
                            currentBatch.update(doc(db, 'addresses', existing.id), {
                                ...addr,
                                updatedAt: serverTimestamp()
                            });
                            results.updated.addresses++;
                            batchCount++;
                        }

                        if (batchCount >= 400) { currentBatch = await commitBatch(); batchCount = 0; }
                    }
                }
            }

            if (batchCount > 0) await currentBatch.commit();

            setResults(results);
            setPreview(null);
            toast.success("Importação concluída no dispositivo!");
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error("Erro na importação client-side:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadErrorReport = () => {
        if (!results || results.errors.length === 0) return;
        const csv = '\ufeffLinha,Motivo\n' + results.errors.map(e => `${e.line},"${e.reason.replace(/"/g, '""')}"`).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = `erros_importacao_${Date.now()}.csv`;
        a.click();
    };

    const resetAll = () => { setFile(null); setPreview(null); setResults(null); };

    if (!isOpen || !isMounted) return null;

    const genderBadge = (g: string) => {
        if (g === 'HOMEM') return 'bg-blue-100 text-blue-700';
        if (g === 'MULHER') return 'bg-pink-100 text-pink-700';
        if (g === 'CASAL') return 'bg-purple-100 text-purple-700';
        return 'bg-gray-100 text-gray-600';
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-surface-border">

                {/* Header */}
                <div className="p-6 border-b border-surface-border flex justify-between items-center bg-surface sticky top-0 rounded-t-xl z-10">
                    <div>
                        <h2 className="text-xl font-bold text-main tracking-tight">Importação de Dados</h2>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
                            {preview ? `${Object.keys(preview.cities).length} cidades · ${Object.values(preview.cities).reduce((a, c) => a + Object.keys(c.territories).length, 0)} territórios · ${preview.totalAddresses} endereços` : 'Selecione o arquivo CSV'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">

                    {/* Seleção de arquivo */}
                    {!preview && !results && (
                        <>
                            <label className="group relative border-2 border-dashed border-gray-200 hover:border-primary rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all bg-gray-50/50 hover:bg-primary/5">
                                <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                                <div className="bg-white dark:bg-surface p-4 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8 text-primary" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-main">{file ? file.name : 'Selecionar arquivo CSV'}</p>
                                    <p className="text-[10px] text-muted mt-1 font-medium italic">Separador ponto e vírgula (;)</p>
                                </div>
                            </label>
                            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 font-bold leading-relaxed">
                                    Atenção: Sempre revise manualmente tarefas realizadas em massa para evitar erros de importação.
                                </p>
                            </div>
                        </>
                    )}

                    {/* PREVIEW da árvore CSV */}
                    {preview && !results && (
                        <div className="space-y-2">
                            {preview.errors.length > 0 && (
                                <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-xs text-red-700 font-medium">
                                    {preview.errors.map((e, i) => <p key={i}>⚠ {e}</p>)}
                                </div>
                            )}

                            {Object.entries(preview.cities).map(([cityKey, city]) => {
                                const cityOpen = expandedCities.has(cityKey);
                                const terrCount = Object.keys(city.territories).length;
                                return (
                                    <div key={cityKey} className="border border-surface-border rounded-xl overflow-hidden">
                                        {/* Cidade */}
                                        <button
                                            onClick={() => toggleCity(cityKey)}
                                            className="w-full flex items-center gap-3 p-4 bg-surface-highlight hover:bg-surface-highlight/80 transition-colors"
                                        >
                                            <Building2 className="w-4 h-4 text-primary shrink-0" />
                                            <span className="font-bold text-main flex-1 text-left">{city.name}</span>
                                            <span className="text-[10px] font-bold text-muted uppercase bg-gray-100 px-2 py-0.5 rounded-full">{city.uf}</span>
                                            <span className="text-[10px] font-bold text-muted">{terrCount} terr.</span>
                                            {cityOpen ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
                                        </button>

                                        {/* Territórios */}
                                        {cityOpen && Object.entries(city.territories)
                                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                            .map(([tKey, terr]) => {
                                                const terrKey = `${cityKey}:${tKey}`;
                                                const terrOpen = expandedTerritories.has(terrKey);
                                                return (
                                                    <div key={tKey} className="border-t border-surface-border">
                                                        <button
                                                            onClick={() => toggleTerritory(terrKey)}
                                                            className="w-full flex items-center gap-3 px-4 py-3 pl-10 bg-surface hover:bg-surface-highlight/50 transition-colors"
                                                        >
                                                            <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                                                            <span className="font-bold text-xs text-main">{terr.mapNum}</span>
                                                            {terr.description && <span className="text-xs text-muted truncate flex-1 text-left">{terr.description}</span>}
                                                            <span className="text-[10px] font-bold text-muted ml-auto">{terr.addresses.length} end.</span>
                                                            {terr.addresses.length > 0 && (terrOpen ? <ChevronDown className="w-3 h-3 text-muted" /> : <ChevronRight className="w-3 h-3 text-muted" />)}
                                                        </button>

                                                        {/* Endereços */}
                                                        {terrOpen && terr.addresses.map((addr, ai) => (
                                                            <div key={ai} className="flex items-center gap-2 px-4 py-2 pl-16 border-t border-surface-border/50 bg-gray-50/30 dark:bg-gray-900/10">
                                                                <Home className="w-3 h-3 text-muted shrink-0" />
                                                                <span className={`text-xs flex-1 truncate ${!addr.isActive ? 'line-through text-muted' : 'text-main'}`}>{addr.street}</span>
                                                                {addr.residentName && <span className="text-[10px] text-muted truncate max-w-[100px]">{addr.residentName}</span>}
                                                                {addr.gender && (
                                                                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${genderBadge(addr.gender)}`}>
                                                                        {addr.gender.substring(0, 1)}
                                                                    </span>
                                                                )}
                                                                {addr.isDeaf && <span className="text-[9px] bg-yellow-100 text-yellow-800 font-black px-1 rounded">S</span>}
                                                                {addr.isMinor && <span className="text-[9px] bg-blue-100 text-blue-800 font-black px-1 rounded">M</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* RESULTADO após importar */}
                    {results && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Criados</p>
                                    <div className="space-y-1">
                                        {[['Cidades', results.created.cities], ['Territórios', results.created.territories], ['Endereços', results.created.addresses]].map(([label, val]) => (
                                            <div key={label} className="flex justify-between text-xs">
                                                <span className="text-emerald-700">{label}</span>
                                                <span className="font-black text-emerald-700">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">Atualizados</p>
                                    <div className="space-y-1">
                                        {[['Territórios', results.updated.territories], ['Endereços', results.updated.addresses]].map(([label, val]) => (
                                            <div key={label} className="flex justify-between text-xs">
                                                <span className="text-amber-700">{label}</span>
                                                <span className="font-black text-amber-700">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Iguais</p>
                                    <p className="text-xl font-black text-gray-700">{results.skipped}</p>
                                </div>
                                <div className={`p-3 rounded-2xl text-center border ${results.errors.length > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${results.errors.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>Erros</p>
                                    <p className={`text-xl font-black ${results.errors.length > 0 ? 'text-red-700' : 'text-gray-700'}`}>{results.errors.length}</p>
                                </div>
                            </div>

                            {results.errors.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Erros</h3>
                                        <button onClick={downloadErrorReport} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                            <Download className="w-3 h-3" /> Relatório
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {results.errors.slice(0, 8).map((err, idx) => (
                                            <div key={idx} className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-start gap-3">
                                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] font-black text-red-700 uppercase">Linha {err.line}</p>
                                                    <p className="text-xs text-red-600">{err.reason}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {results.errors.length > 8 && <p className="text-[10px] text-center text-muted italic">e mais {results.errors.length - 8} erros...</p>}
                                    </div>
                                </div>
                            )}

                            <button onClick={resetAll} className="w-full py-3 text-xs font-bold text-muted hover:text-main bg-gray-50 hover:bg-gray-100 rounded-xl transition-all">
                                IMPORTAR OUTRO ARQUIVO
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer — botão de ação */}
                {(preview || (!preview && !results && file)) && !results && (
                    <div className="p-6 border-t border-surface-border bg-gray-50/30 rounded-b-2xl flex gap-3">
                        {preview && (
                            <button onClick={resetAll} className="flex-1 py-4 text-xs font-bold text-muted bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">
                                TROCAR ARQUIVO
                            </button>
                        )}
                        <button
                            onClick={handleImport}
                            disabled={!file || loading}
                            className="flex-[2] bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-primary-light/30 transition-all disabled:opacity-50 active:scale-95"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            <span>{loading ? 'IMPORTANDO...' : 'CONFIRMAR IMPORTAÇÃO'}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
