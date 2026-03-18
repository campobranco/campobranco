"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc,
    setDoc,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import {
    Shield,
    User,
    Loader2,
    Search,
    Building2,
    Mail,
    MoreVertical,
    ChevronLeft,
    Plus,
    Trash2,
    X,
    Pencil,
    Users,
    CheckCircle2,
    Globe,
    ExternalLink,
    UserPlus2,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/app/components/BottomNav';
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { toast } from 'sonner';
import { updateUser, deleteUser } from '@/lib/services/admin';


interface UserProfile {
    id: string;
    email: string;
    role: string;
    roles?: string[];
    name?: string;
    provider?: string;
    congregationId?: string | null;
    // Retrocompatibilidade
    congregation_id?: string | null;
}

interface Congregation {
    id: string;
    name: string;
}

const ROLE_DEFINITIONS = [
    { label: 'Publicador', value: 'PUBLICADOR', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30' },
    { label: 'Servo (Servo de territórios)', value: 'SERVO', color: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30' },
    { label: 'Ancião (Superintendente de Serviço)', value: 'ANCIAO', color: 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800/30' },
];

export default function AdminUsersPage() {
    const { user, isAdminRoleGlobal, isElder, congregationId, loading } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [congregations, setCongregations] = useState<Congregation[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [editName, setEditName] = useState<string>('');
    const [editRoles, setEditRoles] = useState<string[]>([]);
    const [editCongId, setEditCongId] = useState<string>('');
    const [newUser, setNewUser] = useState({ name: '', email: '', congregationId: '' });
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        if (!isElder) {
            router.push('/dashboard');
            return;
        }

        setLoadingData(true);

        // Busca congregações
        const fetchCongs = async () => {
            try {
                const congsSnap = await getDocs(query(collection(db, 'congregations'), orderBy('name')));
                const congs = congsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
                setCongregations(congs);
            } catch (e) {
                console.error("Erro ao buscar congregações:", e);
            }
        };
        fetchCongs();

        // Listeners para usuários - Ordenar por data de criação para ver novos primeiro
        let usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        if (!isAdminRoleGlobal && congregationId) {
            usersQuery = query(collection(db, 'users'), where('congregationId', '==', congregationId), orderBy('createdAt', 'desc'));
        }

        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Mapeia congregationId para congregation_id para compatibilidade com o restante do código
                congregation_id: doc.data().congregationId || doc.data().congregation_id
            })) as UserProfile[];
            setUsers(usersData);
            setLoadingData(false);
        }, (error) => {
            console.error("Erro no listener de usuários:", error);
            setLoadingData(false);
        });

        return () => unsubscribe();
    }, [user, isAdminRoleGlobal, isElder, congregationId, loading, router]);

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [openMenuId]);

    const handleSaveUser = async () => {
        if (!isAdminRoleGlobal && !isElder) return;
        if (!editingUser) return;

        if (!isAdminRoleGlobal && editingUser.congregation_id !== congregationId) {
            toast.error("Você só pode editar usuários da sua própria congregação.");
            return;
        }

        if (!isAdminRoleGlobal) {
            if (editingUser.role === 'ADMIN' || (editingUser.roles && editingUser.roles.includes('ADMIN'))) {
                toast.error("Você não pode editar um Admin.");
                return;
            }
            if (editRoles.includes('ADMIN')) {
                toast.error("Você não pode promover alguém a Admin.");
                return;
            }
        }

        setUpdatingId(editingUser.id);
        try {
            // Calcula o 'role' legado com base no papel de maior hierarquia selecionado
            // O banco Supabase possui apenas a coluna 'role' (string/enum),
            // não existe coluna 'roles' (array) na tabela users
            const legacyRole = editRoles.includes('ADMIN') ? 'ADMIN' :
                editRoles.includes('ANCIAO') ? 'ANCIAO' :
                    editRoles.includes('SERVO') ? 'SERVO' : 'PUBLICADOR';

            // Envia a requisição para a nova API client-side de update
            const result = await updateUser(editingUser.id, {
                name: editName.trim(),
                role: legacyRole,
                congregation_id: editCongId || null
            });

            if (!result.success) {
                throw new Error(result.error || 'Erro ao atualizar usuário');
            }


            // CORREÇÃO DO FALSO POSITIVO:
            // O estado local deve refletir exatamente o que o banco salvou.
            // Zeramos 'roles' (undefined) para forçar o fallback para [u.role],
            // garantindo consistência entre o estado local e o banco ao recarregar.
            setUsers(prev => prev.map(u =>
                u.id === editingUser.id
                    ? { ...u, name: editName.trim(), role: legacyRole, roles: undefined, congregation_id: editCongId || null }
                    : u
            ));

            setShowEditModal(false);
            toast.success("Usuário atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar usuário:", error);
            toast.error("Erro ao salvar alterações.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdminRoleGlobal && !isElder) return;

        setLoadingData(true);
        try {
            const newUserId = crypto.randomUUID();

            await setDoc(doc(db, 'users', newUserId), {
                name: newUser.name.trim(),
                email: newUser.email.trim().toLowerCase(),
                congregationId: isAdminRoleGlobal ? (newUser.congregationId || null) : congregationId,
                role: 'PUBLICADOR',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            setShowCreateModal(false);
            setNewUser({ name: '', email: '', congregationId: '' });
            toast.success("Usuário criado com sucesso!");
        } catch (error) {
            console.error("Erro ao criar usuário:", error);
            toast.error("Erro ao criar usuário.");
        } finally {
            setLoadingData(false);
        }
    };

    const handleDeleteUser = (targetUser: UserProfile) => {
        // Impede que o usuário exclua a própria conta
        if (targetUser.id === user?.uid) {
            toast.error("Você não pode excluir sua própria conta por aqui.");
            return;
        }

        if (!isAdminRoleGlobal && targetUser.congregation_id !== congregationId) {
            toast.error("Você só pode excluir usuários da sua própria congregação.");
            return;
        }

        if (targetUser.role === 'ADMIN' && !isAdminRoleGlobal) {
            toast.error("Apenas Admins podem excluir outros Admins.");
            return;
        }

        setUserToDelete(targetUser);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;

        setUpdatingId(userToDelete.id);
        setIsDeleting(true);
        try {
            const result = await deleteUser(userToDelete.id);

            if (!result.success) {
                if (result.code === 'HAS_RELATIONS') {
                    throw new Error(result.error);
                }
                throw new Error(result.error || 'Erro ao excluir usuário');
            }


            // Atualiza o estado local imediatamente
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            toast.success("Usuário removido com sucesso!");
            setIsDeleteDialogOpen(false);
            setUserToDelete(null);
        } catch (error: any) {
            console.error("Erro ao excluir usuário:", error);
            const msg = error.message || "";
            if (msg.includes("foreign key") || (error.code && error.code === '23503')) {
                toast.error("Não é possível excluir: este membro possui registros vinculados.");
            } else {
                toast.error(error.message || "Erro ao excluir usuário.");
            }
        } finally {
            setUpdatingId(null);
            setIsDeleting(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const nameMatch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const emailMatch = (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || emailMatch;
    });

    if (loading || (user && !isElder && !loading)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-32 font-sans text-main">
            {/* Header seguindo o padrão padrão do app (ex: ReportsPage) */}
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-600 p-2 rounded-lg text-white shadow-lg shadow-emerald-500/20">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-main tracking-tight leading-tight">Membros</h1>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                            {isAdminRoleGlobal ? `Administração Global (${users.length} usuários)` : `Gestão da Congregação (${users.length} membros)`}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-sm"
                >
                    <UserPlus2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Adicionar</span>
                </button>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Barra de Busca padrão */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar membros..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface border-0 text-main text-sm font-medium rounded-lg py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-muted"
                    />
                </div>

                {loadingData ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted font-bold text-sm uppercase tracking-widest">Sincronizando...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredUsers.length === 0 ? (
                            <div className="col-span-full py-20 text-center opacity-50">
                                <Users className="w-12 h-12 mx-auto mb-3 text-muted" />
                                <p className="text-muted font-medium">Nenhum membro encontrado</p>
                            </div>
                        ) : (
                            filteredUsers.map((u) => (
                                <div key={u.id} className="bg-surface rounded-lg p-5 border border-surface-border shadow-sm hover:border-emerald-500/30 transition-all relative group">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-emerald-600 shrink-0">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-main text-base truncate">{u.name || 'Sem nome'}</h3>
                                                <div className="flex flex-col gap-0.5 mt-1">
                                                    <span className="text-xs text-muted flex items-center gap-1.5 truncate">
                                                        <Mail className="w-3 h-3 shrink-0" />
                                                        {u.email}
                                                    </span>
                                                    {u.congregation_id && (
                                                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1.5 uppercase tracking-tight">
                                                            <Building2 className="w-3 h-3 shrink-0" />
                                                            {congregations.find(c => c.id === u.congregation_id)?.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === u.id ? null : u.id);
                                            }}
                                            className="p-2 text-muted hover:text-main hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-all"
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between">
                                        <div className="flex gap-2">
                                            {(u.roles || [u.role]).map(role => {
                                                const def = ROLE_DEFINITIONS.find(r => r.value === role);
                                                return (
                                                    <span key={role} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${def?.color || 'bg-background text-muted border-surface-border'}`}>
                                                        {def?.label || role}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Action Dropdown seguindo o padrão do app */}
                                    {openMenuId === u.id && (
                                        <div className="absolute right-4 top-14 bg-surface rounded-lg shadow-xl border border-surface-border py-2 z-20 min-w-[140px] animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                                            <button
                                                onClick={() => {
                                                    setEditingUser(u);
                                                    setEditName(u.name || '');
                                                    setEditRoles(u.roles || [u.role] || ['PUBLICADOR']);
                                                    setEditCongId(u.congregation_id || '');
                                                    setShowEditModal(true);
                                                    setOpenMenuId(null);
                                                }}
                                                className="w-full px-4 py-2 text-left text-xs font-bold text-main hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 flex items-center gap-2 transition-colors border-b border-surface-border"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleDeleteUser(u);
                                                    setOpenMenuId(null);
                                                }}
                                                className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Excluir
                                            </button>
                                        </div>
                                    )}

                                    {updatingId === u.id && (
                                        <div className="absolute inset-0 bg-surface/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-10 transition-all">
                                            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            {/* CREATE MODAL - Padrão clássico do app (ex: NewPointModal) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-lg w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <UserPlus2 className="w-6 h-6 text-emerald-600" />
                                Novo Membro
                            </h2>
                            <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-left">Nome Completo</label>
                                <input
                                    required
                                    type="text"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-lg p-4 font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                    placeholder="Digite o nome..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-left">E-mail de Acesso</label>
                                <input
                                    required
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-lg p-4 font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                    placeholder="exemplo@gmail.com"
                                />
                            </div>

                            {isAdminRoleGlobal && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-left">Congregação</label>
                                    <select
                                        value={newUser.congregationId}
                                        onChange={(e) => setNewUser({ ...newUser, congregationId: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-lg p-4 font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Sem vínculo inicial</option>
                                        {congregations.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loadingData}
                                className="w-full py-4 bg-gray-900 text-white rounded-lg font-bold shadow-lg mt-2 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            >
                                {loadingData ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Membro'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT MODAL - Padrão clássico do app */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-lg w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Pencil className="w-6 h-6 text-emerald-600" />
                                Editar Membro
                            </h2>
                            <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-left">Nome</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-lg p-4 font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                />
                            </div>

                            {isAdminRoleGlobal && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-left">Congregação</label>
                                    <select
                                        value={editCongId}
                                        onChange={(e) => setEditCongId(e.target.value)}
                                        className="w-full bg-gray-50 border-none rounded-lg p-4 font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Sem vínculo</option>
                                        {congregations.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-left">Nível de Acesso (Função)</label>
                                {editingUser?.id === user?.uid ? (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase">
                                            <AlertCircle className="w-4 h-4" />
                                            Segurança de Acesso
                                        </div>
                                        <p className="text-[11px] text-amber-600 dark:text-amber-500 font-medium">
                                            Por segurança, você não pode alterar seu próprio nível de acesso. Peça a outro administrador para realizar esta alteração se for necessário.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {ROLE_DEFINITIONS.map(role => {
                                            const isActive = editRoles.includes(role.value);
                                            return (
                                                <button
                                                    key={role.value}
                                                    onClick={() => setEditRoles([role.value])}
                                                    className={`p-4 rounded-lg border text-sm font-bold transition-all flex items-center justify-between
                                                        ${isActive
                                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                                                            : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100 hover:border-gray-200'
                                                        }
                                                    `}
                                                >
                                                    <span>{role.label}</span>
                                                    {isActive && <CheckCircle2 className="w-4 h-4" />}
                                                    {!isActive && <div className="w-4 h-4 rounded-full border-2 border-gray-200" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSaveUser}
                                disabled={updatingId === editingUser.id}
                                className="w-full py-4 bg-gray-900 text-white rounded-lg font-bold shadow-lg mt-2 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                            >
                                {updatingId === editingUser.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM DELETE MODAL */}
            <ConfirmationModal
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setUserToDelete(null);
                }}
                onConfirm={confirmDeleteUser}
                title="Excluir Membro"
                message={`Tem certeza que deseja remover "${userToDelete?.name || userToDelete?.email}"? Esta ação não pode ser desfeita.`}
                confirmText="Excluir"
                variant="danger"
                isLoading={isDeleting}
            />

            <BottomNav />
        </div>
    );
}
