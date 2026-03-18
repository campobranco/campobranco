"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Search,
    Building2,
    Loader2,
    Trash2,
    ArrowRight,
    MapPin,
    Users,
    MoreVertical,
    Pencil,
    X,
    Database,
    ChevronLeft,
    AlertCircle,
    LogIn,
    LogOut
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
    doc,
    updateDoc,
} from 'firebase/firestore';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import BottomNav from '@/app/components/BottomNav';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { getCongregations, saveCongregation, deleteCongregation, migrateCongregation } from '@/lib/services/admin';


interface Congregation {
    id: string;
    name: string;
    city?: string;
    term_type?: 'city' | 'neighborhood';
    category?: string;
    created_at?: any;
}

const CATEGORY_LABELS: Record<string, string> = {
    'SIGN_LANGUAGE': 'Língua de sinais',
    'FOREIGN_LANGUAGE': 'Língua estrangeira',
    'Tradicional': 'Tradicional',
    'Língua de Sinais': 'Língua de sinais',
    'Língua Estrangeira': 'Língua estrangeira'
};

export default function CongregationsPage() {
    const { user, isAdminRoleGlobal, loading: authLoading, congregationId: userCongId } = useAuth();
    const [confirmModal, setConfirmModal] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'danger' | 'info';
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();
    const [congregations, setCongregations] = useState<Congregation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingCongregation, setEditingCongregation] = useState<Congregation | null>(null);

    // Form states
    const [newName, setNewName] = useState('');
    const [newCity, setNewCity] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newTermType, setNewTermType] = useState<'city' | 'neighborhood'>('city');
    const [customId, setCustomId] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todas');

    // View state
    const [currentView, setCurrentView] = useState('grid');
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setCurrentView(params.get('view') || 'grid');
        }
    }, []);

    // Carrega a lista de congregações via API server-side (Firebase Admin SDK)
    // Evita problemas com índices e regras de segurança do Firestore client-side
    const fetchCongregations = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const res = await getCongregations();
            if (!res.success) throw new Error(res.error || 'Erro ao carregar');
            setCongregations(res.congregations || []);

        } catch (error) {
            console.error("Error fetching congregations:", error);
            toast.error("Erro ao carregar congregações");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (authLoading) return;

        if (!isAdminRoleGlobal) {
            router.push('/dashboard');
            return;
        }

        fetchCongregations();
    }, [authLoading, isAdminRoleGlobal, router, fetchCongregations]);

    const handleCreateCongregation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        try {
            setLoading(true);

            // Se houver mudança de ID em uma congregação existente, aciona migração
            if (editingCongregation) {
                const oldId = editingCongregation.id;
                const newId = customId.trim();

                if (newId && newId !== oldId) {
                    setConfirmModal({
                        title: 'Mudança de ID Detectada',
                        message: 'O sistema irá migrar AUTOMATICAMENTE todos os dados vinculados para o novo ID. Deseja continuar?',
                        variant: 'info',
                        onConfirm: async () => {
                            setConfirmModal(null);
                            setLoading(true);
                            try {
                                const resMigrate = await migrateCongregation(oldId, newId);

                                if (!resMigrate.success) throw new Error(resMigrate.error);

                                toast.success("Migração concluída com sucesso!");
                                setIsCreateModalOpen(false);
                            } catch (e: any) {
                                toast.error("Erro na migração: " + e.message);
                            } finally {
                                setLoading(false);
                            }
                        }
                    });
                    return;
                }
            }

            // Chamada para a API client-side
            const result = await saveCongregation({
                id: editingCongregation?.id,
                name: newName.trim(),
                city: newCity.trim() || null,
                category: newCategory.trim() || null,
                term_type: newTermType,
                customId: customId.trim() || null
            });

            if (!result.success) {
                throw new Error(result.error || 'Erro ao salvar congregação');
            }

            toast.success('Congregação salva com sucesso!');
            setIsCreateModalOpen(false);
            setEditingCongregation(null);
            resetForm();
            fetchCongregations(); // Recarrega a lista após salvar
        } catch (error: any) {
            console.error("Error saving congregation:", error);
            toast.error(`Erro: ${error.message || "Erro ao salvar congregação."}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, force: boolean = false) => {
        if (!id) return;
        setConfirmModal(null);
        setLoading(true);
        try {
            const resData = await deleteCongregation(id, force);

            if (!resData.success) {
                if (resData.code === 'HAS_RELATIONS') {
                    setConfirmModal({
                        title: 'Limpeza Total Necessária',
                        message: resData.error || '',
                        variant: 'danger',
                        onConfirm: () => handleDelete(id, true) // Chama novamente com force=true
                    });
                    return;
                }
                throw new Error(resData.error || 'Erro ao excluir congregação');
            }

            toast.success(force ? "Limpeza total e exclusão concluídas!" : "Congregação excluída com sucesso!");
            fetchCongregations(); // Recarrega a lista após excluir
        } catch (error: any) {
            console.error("Error deleting:", error);
            toast.error(error.message || "Erro ao excluir congregação.");
        } finally {
            setLoading(false);
        }
    };

    const handleEnterCongregation = async (congId: string) => {
        if (!user) return;
        try {
            setLoading(true);
            await updateDoc(doc(db, 'users', user.uid), {
                congregationId: congId
            });
            toast.success("Congregação selecionada!");
            // Forçamos o recarregamento do perfil no AuthContext via reload
            setTimeout(() => window.location.reload(), 500);
        } catch (e) {
            console.error("Erro ao entrar:", e);
            toast.error("Falha ao selecionar congregação.");
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveCongregation = async () => {
        if (!user) return;
        try {
            setLoading(true);
            await updateDoc(doc(db, 'users', user.uid), {
                congregationId: null
            });
            toast.success("Você saiu da congregação.");
            setTimeout(() => window.location.reload(), 500);
        } catch (e) {
            console.error("Erro ao sair:", e);
            toast.error("Falha ao sair da congregação.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setNewName('');
        setNewCity('');
        setNewCategory('');
        setNewTermType('city');
        setCustomId('');
    };

    const categories = Array.from(new Set(congregations.map(c => c.category).filter(Boolean))) as string[];

    const filtered = congregations.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'Todas' || c.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="min-h-screen bg-background pb-32 font-sans text-main">
            <header className="bg-surface border-b border-surface-border sticky top-0 z-40 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/settings" className="p-2 hover:bg-background rounded-lg transition-colors text-muted hover:text-main">
                            <ChevronLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-main tracking-tight">Gerenciar Congregações</h1>
                            <p className="text-xs text-muted font-medium">Controle de unidades</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEditingCongregation(null);
                            resetForm();
                            setIsCreateModalOpen(true);
                        }}
                        className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-primary-light/500/30 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Congregação
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5 group-focus-within:text-primary-light/500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar congregação..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface border border-surface-border text-main text-sm font-medium rounded-lg py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-primary-light/500/20 focus:outline-none transition-all placeholder:text-muted"
                    />
                </div>

                {!loading && categories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <button
                            onClick={() => setCategoryFilter('Todas')}
                            className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all border ${categoryFilter === 'Todas' ? 'bg-primary text-white border-primary shadow-md shadow-primary-light/500/20' : 'bg-surface text-muted border-surface-border hover:border-primary-light/500'}`}
                        >
                            Todos os Tipos
                        </button>
                        {categories.sort().map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all border ${categoryFilter === cat ? 'bg-primary text-white border-primary shadow-md shadow-primary-light/500/20' : 'bg-surface text-muted border-surface-border hover:border-primary-light/500'}`}
                            >
                                {CATEGORY_LABELS[cat] || cat}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-muted font-bold animate-pulse uppercase tracking-widest text-[10px]">Carregando...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                        <Building2 className="w-16 h-16 mx-auto mb-4 text-muted" />
                        <p className="text-muted font-medium">Nenhuma congregação encontrada.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                        {filtered.map((cong) => (
                            <div key={cong.id} className="bg-surface rounded-lg p-5 border border-surface-border shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                                {userCongId === cong.id ? (
                                    <Link href={`/my-maps/city?congregationId=${cong.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-lg bg-primary-light/50 dark:bg-blue-900/20 flex items-center justify-center text-primary dark:text-blue-400 group-hover:scale-110 transition-transform">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-bold text-main truncate">{cong.name}</h3>
                                                {isAdminRoleGlobal && (
                                                    <span className="text-[9px] font-mono bg-background border border-surface-border text-muted px-1.5 py-0.5 rounded uppercase leading-none">
                                                        ID: {cong.id.length > 8 ? `${cong.id.substring(0, 8)}...` : cong.id}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted truncate">
                                                {cong.city ? `${cong.city} • ` : ''}Modo: {cong.term_type === 'neighborhood' ? 'Bairros' : 'Cidades'}
                                            </p>
                                            {cong.category && (
                                                <div className="mt-1.5">
                                                    <span className="px-1.5 py-0.5 bg-primary-light/50 dark:bg-blue-900/20 text-primary dark:text-blue-400 rounded-md text-[8px] font-black uppercase tracking-tighter border border-primary-light dark:border-blue-800/30">
                                                        {CATEGORY_LABELS[cong.category] || cong.category}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="flex items-center gap-4 flex-1 min-w-0 opacity-70">
                                        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-muted">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-bold text-muted truncate">{cong.name}</h3>
                                            </div>
                                            <p className="text-[9px] text-orange-500 font-bold uppercase tracking-tight">
                                                Use o menu ao lado para "Entrar" e ver os mapas
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === cong.id ? null : cong.id);
                                        }}
                                        className="p-2 text-muted hover:text-main hover:bg-background rounded-lg transition-colors"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>

                                    {openMenuId === cong.id && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(null);
                                                }}
                                            ></div>
                                            <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-surface-border rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(null);
                                                        setEditingCongregation(cong);
                                                        setNewName(cong.name);
                                                        setNewCity(cong.city || '');
                                                        let cat = cong.category || '';
                                                        const lowerCat = cat.toLowerCase();
                                                        if (lowerCat.includes('sinais') || lowerCat.includes('sign')) cat = 'SIGN_LANGUAGE';
                                                        else if (lowerCat.includes('estrangeira') || lowerCat.includes('foreign')) cat = 'FOREIGN_LANGUAGE';
                                                        setNewCategory(cat);
                                                        setNewTermType(cong.term_type || 'city');
                                                        setCustomId(cong.id);
                                                        setIsCreateModalOpen(true);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-main hover:bg-background transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4 text-muted" />
                                                    Editar
                                                </button>

                                                {userCongId === cong.id ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            handleLeaveCongregation();
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                    >
                                                        <LogOut className="w-4 h-4" />
                                                        Sair desta
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            handleEnterCongregation(cong.id);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary-light/10 transition-colors"
                                                    >
                                                        <LogIn className="w-4 h-4" />
                                                        Entrar nesta
                                                    </button>
                                                )}

                                                <div className="h-px bg-surface-border my-1"></div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(null);
                                                        setConfirmModal({
                                                            title: 'Excluir congregação?',
                                                            message: `Tem certeza que deseja apagar a congregação "${cong.name}"? Esta ação não pode ser desfeita.`,
                                                            variant: 'danger',
                                                            onConfirm: () => handleDelete(cong.id)
                                                        });
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Excluir
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="flex min-h-full items-center justify-center p-4 pb-24 text-center sm:p-6">
                        <div className="relative w-full max-w-md transform rounded-xl bg-surface p-8 text-left shadow-2xl transition-all border border-surface-border animate-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-bold text-main tracking-tight">{editingCongregation ? 'Editar Congregação' : 'Nova Congregação'}</h2>
                                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-background rounded-full transition-colors">
                                    <X className="w-6 h-6 text-muted" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateCongregation} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Nome</label>
                                    <input
                                        required
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="w-full bg-background border border-surface-border rounded-lg py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-light/500/20 focus:border-primary-light/500 transition-all text-main placeholder-muted"
                                        placeholder="Ex: Congregação Central"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Cidade (Opcional)</label>
                                    <input
                                        type="text"
                                        value={newCity}
                                        onChange={(e) => setNewCity(e.target.value)}
                                        className="w-full bg-background border border-surface-border rounded-lg py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-light/500/20 focus:border-primary-light/500 transition-all text-main placeholder-muted"
                                        placeholder="Ex: São Paulo"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Tipo de congregação</label>
                                    <select
                                        required
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        className="w-full bg-background border border-surface-border rounded-lg py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-light/500/20 focus:border-primary-light/500 transition-all text-main appearance-none"
                                    >
                                        <option value="" disabled>Selecione o tipo...</option>
                                        <option value="Tradicional">Tradicional</option>
                                        <option value="SIGN_LANGUAGE">Língua de Sinais</option>
                                        <option value="FOREIGN_LANGUAGE">Língua Estrangeira</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Modo de Organização</label>
                                    <div className="flex gap-2 p-1 bg-background border border-surface-border rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setNewTermType('city')}
                                            className={`flex-1 py-2 px-4 rounded-md text-xs font-bold transition-all ${newTermType === 'city' ? 'bg-primary text-white shadow-md' : 'text-muted hover:text-main'}`}
                                        >
                                            Cidades
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewTermType('neighborhood')}
                                            className={`flex-1 py-2 px-4 rounded-md text-xs font-bold transition-all ${newTermType === 'neighborhood' ? 'bg-primary text-white shadow-md' : 'text-muted hover:text-main'}`}
                                        >
                                            Bairros
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">ID Personalizado (opcional)</label>
                                    <input
                                        type="text"
                                        value={customId}
                                        onChange={e => setCustomId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                        className="w-full bg-background border border-surface-border rounded-lg py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-light/500/20 focus:border-primary-light/500 transition-all text-main placeholder-muted"
                                        placeholder="ex: sao-paulo-central"
                                    />
                                    <p className="text-[10px] text-muted italic">Isso definirá a URL da congregação.</p>
                                    {editingCongregation && (
                                        <p className="text-[10px] text-orange-500 font-bold mt-1">
                                            ⚠️ Alterar o ID pode quebrar links existentes se houver dados vinculados!
                                        </p>
                                    )}
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 bg-background hover:bg-surface-highlight text-muted hover:text-main border border-surface-border font-bold py-3.5 rounded-lg transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary-light/500/30 transition-all active:scale-95"
                                    >
                                        {editingCongregation ? 'Salvar' : 'Criar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                onConfirm={() => confirmModal?.onConfirm()}
                title={confirmModal?.title || ''}
                message={confirmModal?.message || ''}
                confirmText="Confirmar"
                variant={confirmModal?.variant || 'danger'}
                isLoading={loading}
            />
            <BottomNav />
        </div>
    );
}
