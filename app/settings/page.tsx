"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';
import {
    doc,
    updateDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs,
    getDoc,
    deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    LogOut,
    User,
    Settings,
    Shield,
    Scale,
    Users,
    Building2,
    Save,
    Loader2,
    BarChart3,
    Map as MapIcon,
    FileText,
    ChevronDown,
    Pencil,
    X,
    Database,
    Eye,
    Bell,
    Minus,
    Plus,
    Type,
    Monitor,
    MoreVertical,
    UserMinus,
    Moon,
    Sun,
    Clock,
    Smartphone,
    Info,
    Mail,
    Github,
    Trash2,
    Bug,
} from 'lucide-react';
import Link from 'next/link';
// import NotificationToggle from '@/app/components/NotificationToggle'; // Removed
import { useTheme, ThemeMode } from '@/app/context/ThemeContext';
import { toast } from 'sonner';

import BottomNav from '@/app/components/BottomNav';
import { APP_VERSION } from '@/lib/version';

import ConfirmationModal from '@/app/components/ConfirmationModal';


export default function SettingsPage() {
    const { user, isAdmin, isAdminRoleGlobal, isElder, isServant, congregationId, loading, profileName, role, simulateRole, isSimulating, notificationsEnabled, logout: authLogout, canManageMembers, canInviteMembers } = useAuth();
    const router = useRouter();
    const { textSize, displayScale, themeMode, updatePreferences } = useTheme();

    const changeTextSize = (delta: number) => {
        const newSize = Math.max(12, Math.min(24, textSize + delta));
        updatePreferences(newSize, displayScale, themeMode);
    };

    const changeScale = (delta: number) => {
        const newScale = Math.max(0.7, Math.min(1.5, Number((displayScale + delta).toFixed(2))));
        updatePreferences(textSize, newScale, themeMode);
    };

    const changeTheme = (mode: ThemeMode) => {
        updatePreferences(textSize, displayScale, mode);
    }

    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [saving, setSaving] = useState(false);

    // Member Management State
    const [members, setMembers] = useState<any[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [inviteToken, setInviteToken] = useState('');
    const [generatingToken, setGeneratingToken] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [showDangerZone, setShowDangerZone] = useState(false);



    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'info';
        confirmText?: string;
        cancelText?: string;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [openMenuId]);

    // Redirect Unassigned Users
    useEffect(() => {
        if (!loading && user && !congregationId && !isAdminRoleGlobal) {
            router.push('/sem-congregacao');
        }
    }, [user, loading, congregationId, isAdminRoleGlobal, router]);

    useEffect(() => {
        if ((canInviteMembers || canManageMembers) && congregationId) {
            const fetchCongregationAndMembers = async () => {
                setMembersLoading(true);
                try {
                    // 1. Fetch Members (Only if canManageMembers)
                    let docs: any[] = [];
                    if (canManageMembers) {
                        const usersRef = collection(db, "users");
                        const q = query(usersRef, where("congregationId", "==", congregationId));
                        const querySnapshot = await getDocs(q);
                        docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                        if (!isAdminRoleGlobal) {
                            docs = docs.filter((d: any) => d.role !== 'ADMIN');
                        }
                    }
                    setMembers(docs);

                    // 2. Fetch Congregation for Token (Only if canInviteMembers)
                    if (canInviteMembers) {
                        const congRef = doc(db, "congregations", congregationId);
                        const congSnap = await getDoc(congRef);

                        if (congSnap.exists()) {
                            const congData = congSnap.data();
                            let token = congData.inviteToken || congData.invite_token; // Suporta legado se existir

                            // Se não existe token, gera um automaticamente (apenas Ancião pode regenerar na UI)
                            if (!token && canManageMembers) {
                                const generatedToken = crypto.randomUUID();
                                await updateDoc(congRef, {
                                    inviteToken: generatedToken,
                                    updatedAt: serverTimestamp()
                                });
                                token = generatedToken;
                            }

                            if (token) {
                                setInviteToken(token);
                                setInviteLink(`${window.location.origin}/invite?token=${token}`);
                            } else if (canInviteMembers) {
                                setInviteLink("Erro ao carregar link. Contate o suporte.");
                            }
                        }
                    }
                } catch (e: any) {
                    console.error("Error fetching settings data:", e.message || e);
                } finally {
                    setMembersLoading(false);
                }
            };
            fetchCongregationAndMembers();
        }
    }, [canInviteMembers, canManageMembers, congregationId, isAdminRoleGlobal]);

    const handleGenerateNewToken = async () => {
        setConfirmModal({
            isOpen: true,
            title: "Gerar Novo Link",
            message: "Isso invalidará o link de convite anterior. Deseja continuar?",
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setGeneratingToken(true);
                try {
                    const newToken = crypto.randomUUID();
                    const congRef = doc(db, "congregations", congregationId!);
                    await updateDoc(congRef, {
                        inviteToken: newToken,
                        updatedAt: serverTimestamp()
                    });

                    setInviteToken(newToken);
                    setInviteLink(`${window.location.origin}/invite?token=${newToken}`);
                    toast.success("Novo link gerado com sucesso!");
                } catch (e) {
                    console.error(e);
                    toast.error("Erro ao gerar novo link.");
                } finally {
                    setGeneratingToken(false);
                }
            }
        });
    };

    const handlePromote = async (uid: string, currentRole: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Alterar Função",
            message: "Confirmar alteração de função?",
            variant: 'info',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    let newRole = '';
                    if (currentRole === 'ANCIAO') newRole = 'SERVO';
                    else if (currentRole === 'SERVO') newRole = 'PUBLICADOR';
                    else newRole = 'SERVO';

                    const userRef = doc(db, "users", uid);
                    await updateDoc(userRef, {
                        role: newRole,
                        updatedAt: serverTimestamp()
                    });

                    setMembers(prev => prev.map(m => m.id === uid ? { ...m, role: newRole } : m));
                    toast.success("Função atualizada com sucesso");
                } catch (e) {
                    toast.error("Erro ao alterar função");
                }
            }
        });
    };

    const handleSetAnciao = async (uid: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delegar Responsabilidade",
            message: "Promover este membro a Superintendente de Serviço (Ancião)?",
            variant: 'info',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const userRef = doc(db, "users", uid);
                    await updateDoc(userRef, {
                        role: 'ANCIAO',
                        updatedAt: serverTimestamp()
                    });
                    setMembers(prev => prev.map(m => m.id === uid ? { ...m, role: 'ANCIAO' } : m));
                    toast.success("Membro promovido a Ancião");
                } catch (e) {
                    toast.error("Erro ao promover membro");
                }
            }
        });
    };

    const handleRemove = async (uid: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Remover Membro",
            message: "Remover este usuário da congregação? Ele perderá acesso aos dados.",
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const userRef = doc(db, "users", uid);
                    await updateDoc(userRef, {
                        congregationId: null,
                        role: 'PUBLICADOR',
                        updatedAt: serverTimestamp()
                    });
                    setMembers(prev => prev.filter(m => m.id !== uid));
                    toast.success("Membro removido.");
                } catch (e) {
                    toast.error("Erro ao remover usuário");
                }
            }
        });
    };

    const handleSaveProfile = async () => {
        if (!user || (!user.email && !user.uid)) return;
        setSaving(true);
        try {
            // Atualiza o documento no Firestore (Principal)
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                name: editName,
                updatedAt: serverTimestamp()
            });

            // Atualiza o perfil no Firebase Auth (Principal para a UI)
            await updateProfile(user, {
                displayName: editName
            });

            setShowEditModal(false);
            toast.success("Perfil atualizado com sucesso!");

            // Forçamos o recarregamento para que o AuthContext e o navegador peguem os novos dados
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error: any) {
            console.error("Error updating profile:", error);
            // Transformamos alerts em notificações internas conforme regra global
            toast.error("Erro ao atualizar perfil: " + (error.message || "Tente novamente"));
        } finally {
            setSaving(false);
        }
    };




    const handleSignOut = async () => {
        try {
            await authLogout();
            router.push('/login');
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = '/login';
        }
    };



    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24 font-sans text-main">
            {/* Header */}
            <header className="bg-surface border-b border-surface-border sticky top-0 z-30 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center gap-3">
                    <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary-light/30">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-main tracking-tight">Configurações</h1>
                        <p className="text-xs text-muted font-medium">Gerencie sua conta e o sistema</p>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

                {/* General Section (All Users) */}
                <section className="space-y-4">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1">Minha Conta</h2>
                    <div className="bg-surface p-6 rounded-lg shadow-sm border border-surface-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-background dark:bg-surface-highlight rounded-full flex items-center justify-center text-muted text-xl font-bold border-2 border-surface dark:border-surface shadow-sm ring-1 ring-surface-border">
                                {user.photoURL ? (
                                    <Image src={user.photoURL} alt="Avatar" width={64} height={64} className="rounded-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-main">{profileName || user.displayName || 'Usuário'}</h3>
                                <p className="text-muted text-sm">{user.email}</p>
                                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary-light/50 text-primary-dark dark:bg-primary-dark/30 dark:text-primary-light">
                                    <Shield className="w-3 h-3" />
                                    {(() => {
                                        switch (role) {
                                            case 'ADMIN': return 'Admin';
                                            case 'ANCIAO': return 'Superintendente de Serviço';
                                            case 'SERVO': return 'Servo de Territórios';
                                            default: return 'Publicador';
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            <button
                                onClick={() => {
                                    setEditName(profileName || user.displayName || '');
                                    setShowEditModal(true);
                                }}
                                className="bg-surface hover:bg-background text-main border border-surface-border font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors justify-center"
                            >
                                <Pencil className="w-5 h-5" />
                                Editar Perfil
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors justify-center"
                            >
                                <LogOut className="w-5 h-5" />
                                Sair da Conta
                            </button>
                        </div>
                    </div>
                </section>

                {/* Appearance Settings */}
                <section className="space-y-4">
                    <h2 className="text-sm font-bold text-muted uppercase tracking-widest pl-1">Aparência</h2>
                    <div className="bg-surface p-6 rounded-lg shadow-sm border border-surface-border space-y-6">

                        {/* Theme Selection */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary-light/50 text-primary dark:bg-primary-dark/30 dark:text-primary-light rounded-xl">
                                    {themeMode === 'light' ? <Sun className="w-6 h-6" /> :
                                        themeMode === 'dark' ? <Moon className="w-6 h-6" /> :
                                            themeMode === 'auto' ? <Clock className="w-6 h-6" /> :
                                                <Smartphone className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-main">Tema do Sistema</h3>
                                    <p className="text-sm text-muted">Claro, Escuro, Automático (Horário) ou Sistema.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-background rounded-lg p-1 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => changeTheme('light')}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${themeMode === 'light' ? 'bg-surface text-main shadow-sm' : 'text-muted hover:text-main'}`}
                                >
                                    <Sun className="w-4 h-4" />
                                    Claro
                                </button>
                                <button
                                    type="button"
                                    disabled
                                    className="px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 text-muted/40 cursor-not-allowed"
                                >
                                    <Moon className="w-4 h-4" />
                                    <span>Escuro <span className="text-[8px] opacity-70">(Breve)</span></span>
                                </button>
                                <button
                                    type="button"
                                    disabled
                                    className="px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 text-muted/40 cursor-not-allowed"
                                >
                                    <Clock className="w-4 h-4" />
                                    <span>Auto <span className="text-[8px] opacity-70">(Breve)</span></span>
                                </button>
                                <button
                                    type="button"
                                    disabled
                                    className="px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 text-muted/40 cursor-not-allowed"
                                >
                                    <Smartphone className="w-4 h-4" />
                                    <span>Sistema <span className="text-[8px] opacity-70">(Breve)</span></span>
                                </button>
                            </div>
                        </div>

                        <hr className="border-surface-border" />

                        {/* Text Size */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary-light/50 text-primary dark:bg-primary-dark/30 dark:text-primary-light rounded-xl">
                                    <Type className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-main">Tamanho do Texto</h3>
                                    <p className="text-sm text-muted">Ajuste o tamanho da fonte (12px - 24px).</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-background rounded-xl p-1 self-end sm:self-auto">
                                <button onClick={() => changeTextSize(-1)} className="p-2 hover:bg-surface rounded-lg shadow-sm transition-all text-muted hover:text-main" title="Diminuir"><Minus className="w-4 h-4" /></button>
                                <span className="font-bold w-12 text-center select-none text-main">{textSize}px</span>
                                <button onClick={() => changeTextSize(1)} className="p-2 hover:bg-surface rounded-lg shadow-sm transition-all text-muted hover:text-main" title="Aumentar"><Plus className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <hr className="border-surface-border" />

                        {/* Display Scale */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary-light/50 text-primary dark:bg-primary-dark/30 dark:text-primary-light rounded-xl">
                                    <Monitor className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-main">Escala da Tela</h3>
                                    <p className="text-sm text-muted">Aumente ou diminua o zoom geral.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-background rounded-xl p-1 self-end sm:self-auto">
                                <button onClick={() => changeScale(-0.05)} className="p-2 hover:bg-surface rounded-lg shadow-sm transition-all text-muted hover:text-main" title="Diminuir"><Minus className="w-4 h-4" /></button>
                                <span className="font-bold w-14 text-center select-none text-main">{Math.round(displayScale * 100)}%</span>
                                <button onClick={() => changeScale(0.05)} className="p-2 hover:bg-surface rounded-lg shadow-sm transition-all text-muted hover:text-main" title="Aumentar"><Plus className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </section>


                {/* Edit Profile Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center my-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-main tracking-tight">Editar Perfil</h2>
                                        <p className="text-sm text-muted font-medium tracking-tight">Atualize suas informações pessoais.</p>
                                    </div>
                                    <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-background rounded-full transition-colors">
                                        <X className="w-6 h-6 text-muted" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Nome de Exibição</label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full bg-background border border-surface-border rounded-lg py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary text-main transition-all"
                                            placeholder="Seu nome"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-lg shadow-xl shadow-primary-light/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}



                {/* Servant Section (Invite & Registry) */}
                {canInviteMembers && (
                    <>
                        <hr className="border-surface-border" />
                        <section className="space-y-4 animate-in slide-in-from-bottom-5 fade-in duration-500">
                            <div className="flex items-center gap-2 text-primary dark:text-primary-light mb-2">
                                <FileText className="w-5 h-5" />
                                <h2 className="text-sm font-bold uppercase tracking-widest">Registros</h2>
                            </div>


                        </section>

                        <section className="space-y-4 animate-in slide-in-from-bottom-5 fade-in duration-500">
                            {/* Invite Link (Visible to Elders/Servants) */}
                            <div className="bg-surface p-6 rounded-lg shadow-sm border border-surface-border">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-primary-light/50 rounded-lg text-primary dark:bg-primary-dark/30 dark:text-primary-light">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-main">Convidar Publicadores</h3>
                                        <p className="text-xs text-muted">Envie este link para novos irmãos entrarem na congregação.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-background p-3 rounded-lg text-xs font-mono text-muted truncate border border-surface-border">
                                        {inviteLink}
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(inviteLink);
                                            toast.success("Link copiado!");
                                        }}
                                        className="bg-primary hover:bg-primary-dark text-white font-bold px-4 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-lg shadow-primary-light/20"
                                    >
                                        Copiar
                                    </button>
                                </div>
                                {canManageMembers && (
                                    <div className="mt-3 flex justify-end">
                                        <button
                                            onClick={handleGenerateNewToken}
                                            disabled={generatingToken}
                                            className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider flex items-center gap-1"
                                        >
                                            {generatingToken ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                                            Gerar Nova Chave
                                        </button>
                                    </div>
                                )}
                            </div>

                        </section>
                    </>
                )}

                {/* Admin Section (Elders only) */}
                {canManageMembers && (
                    <>
                        <hr className="border-surface-border" />

                        <section className="space-y-4 animate-in slide-in-from-bottom-5 fade-in duration-500">
                            <div className="flex items-center gap-2 text-primary dark:text-primary-light mb-2">
                                <Shield className="w-5 h-5" />
                                <h2 className="text-sm font-bold uppercase tracking-widest">Painel do Administrador</h2>
                            </div>

                            {/* Member Management */}
                            <div className="bg-surface p-6 rounded-lg shadow-sm border border-surface-border mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary-light/50 rounded-lg text-primary dark:bg-primary-dark/30 dark:text-primary-light">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-main">Gestão de Membros</h3>
                                            <p className="text-xs text-muted">{members.length} membros na congregação</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => window.location.reload()} // Lazy refresh
                                        className="p-2 hover:bg-background rounded-full text-muted"
                                    >
                                        <Loader2 className={`w-4 h-4 ${membersLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {members.map(member => (
                                        <div key={member.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-surface-border">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center text-muted font-bold border border-surface-border shadow-sm">
                                                    {member.photoURL ? <Image src={member.photoURL} alt={member.name || 'Avatar'} width={40} height={40} className="rounded-full object-cover" /> : <User className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-main">{member.name || member.email?.split('@')[0]}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${member.role === 'ANCIAO' ? 'bg-primary-light/80 text-primary-dark dark:bg-primary-dark/80 dark:text-primary-light' :
                                                            member.role === 'SERVO' ? 'bg-primary-light/50 text-primary-dark dark:bg-primary-dark/50 dark:text-primary-light' :
                                                                'bg-surface-border text-muted dark:bg-surface-border'
                                                            }`}>
                                                            {member.role || 'PUBLICADOR'}
                                                        </span>
                                                        <span className="text-[10px] text-muted truncate max-w-[150px] sm:max-w-none">{member.email}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions - Only Elders can manage, Admin manages everyone */}
                                            {(isAdminRoleGlobal || (isElder && member.role !== 'ADMIN' && member.role !== 'ANCIAO')) && member.id !== user?.uid && (
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(openMenuId === member.id ? null : member.id);
                                                        }}
                                                        className="p-2 text-muted hover:text-main hover:bg-surface rounded-full transition-colors"
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>

                                                    {openMenuId === member.id && (
                                                        <div className="absolute right-0 top-10 bg-surface rounded-lg shadow-xl border border-surface-border p-1 z-50 min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
                                                            <button
                                                                onClick={() => handlePromote(member.id, member.role)}
                                                                className={`flex items-center gap-2 px-3 py-2.5 text-sm font-bold rounded-lg transition-colors w-full text-left ${member.role === 'SERVO' ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20' : 'text-primary hover:bg-primary-light/50 dark:hover:bg-primary-dark/30'}`}
                                                            >
                                                                <Shield className="w-4 h-4" />
                                                                {member.role === 'ANCIAO' ? "Rebaixar a Servo" :
                                                                    member.role === 'SERVO' ? "Rebaixar a Publicador" :
                                                                        "Promover a Servo"}
                                                            </button>
                                                            {isAdminRoleGlobal && member.role === 'SERVO' && (
                                                                <button
                                                                    onClick={() => {
                                                                        handleSetAnciao(member.id);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors w-full text-left border-t border-surface-border"
                                                                >
                                                                    <Shield className="w-4 h-4" />
                                                                    Promover a Ancião
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleRemove(member.id)}
                                                                className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors w-full text-left"
                                                            >
                                                                <UserMinus className="w-4 h-4" />
                                                                Remover da Congregação
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {members.length === 0 && !membersLoading && (
                                        <div className="text-center py-4 text-muted text-sm">Nenhum membro encontrado.</div>
                                    )}
                                </div>
                            </div>

                            {/* Simulation Mode (Admin Only) */}
                            {isAdminRoleGlobal && (
                                <div className="bg-gradient-to-br from-primary-light/20 to-surface dark:from-primary-dark/10 dark:to-surface p-6 rounded-lg shadow-sm border border-primary-light/30 dark:border-primary-dark/30 mb-6 relative overflow-hidden">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-primary-light/50 rounded-lg text-primary dark:bg-primary-dark/50 dark:text-primary-light">
                                            <Eye className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-main">Modo de Simulação</h3>
                                            <p className="text-xs text-muted">Visualize o sistema com outras permissões</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Ancião', role: 'ANCIAO' },
                                            { label: 'Servo', role: 'SERVO' },
                                            { label: 'Publicador', role: 'PUBLICADOR' }
                                        ].map((sim) => (
                                            <button
                                                key={sim.role}
                                                onClick={() => simulateRole(sim.role)}
                                                className={`py-3 px-4 rounded-lg text-sm font-bold transition-all border ${role === sim.role && isSimulating
                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary-light/30'
                                                    : 'bg-surface text-muted border-surface-border hover:border-primary-light hover:text-primary'
                                                    }`}
                                            >
                                                {sim.label}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => simulateRole(null)}
                                            className={`py-3 px-4 rounded-lg text-sm font-bold transition-all border flex items-center justify-center gap-2 ${!isSimulating
                                                ? 'bg-gray-800 text-white border-gray-800'
                                                : 'bg-surface text-muted border-surface-border hover:bg-background'
                                                }`}
                                        >
                                            <X className="w-4 h-4" />
                                            Original
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Admin - All Congregations */}
                            {isAdminRoleGlobal && (
                                <div className="bg-surface p-6 rounded-lg shadow-sm border border-primary-light dark:border-primary-dark/30 mb-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Building2 className="w-24 h-24 text-primary" />
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-primary-light/50 rounded-lg text-primary dark:bg-primary-dark/30 dark:text-primary-light">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-main">Gestão Global</h3>
                                            <p className="text-xs text-muted">Admin (Acesso Total)</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted mb-4">Você tem permissão para gerenciar todas as congregações e usuários do sistema.</p>
                                    <div className="flex flex-wrap gap-3">
                                        <Link
                                            href="/admin/congregations"
                                            className="inline-block bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-primary-light/20 flex items-center gap-2"
                                        >
                                            <Building2 className="w-4 h-4" />
                                            Congregações
                                        </Link>
                                        <Link
                                            href="/admin/users"
                                            className="inline-block bg-background hover:bg-primary-light/50 dark:hover:bg-primary-dark/30 text-primary border border-primary-light dark:border-primary-dark/30 font-bold py-2 px-4 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                                        >
                                            <Users className="w-4 h-4" />
                                            Membros
                                        </Link>
                                        <Link
                                            href="/orphaned-data"
                                            className="inline-block bg-background hover:bg-primary-light/50 dark:hover:bg-primary-dark/30 text-primary border border-primary-light dark:border-primary-dark/30 font-bold py-2 px-4 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                                        >
                                            <Database className="w-4 h-4" />
                                            Dados Órfãos
                                        </Link>
                                        <Link
                                            href="/admin/bugs"
                                            className="inline-block bg-background hover:bg-orange-50 dark:hover:bg-orange-950/20 text-orange-600 border border-orange-200 dark:border-orange-900/30 font-bold py-2 px-4 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                                        >
                                            <Bug className="w-4 h-4" />
                                            Bug Reports
                                        </Link>
                                    </div>

                                </div>
                            )}
                        </section>
                    </>
                )}

                {/* About & Legal Section */}
                <section className="space-y-4">
                    <h2 className="text-sm font-bold text-muted uppercase tracking-widest pl-1">Sobre & Legal</h2>
                    <div className="bg-surface p-2 rounded-lg shadow-sm border border-surface-border">
                        <Link href="/legal/terms" className="flex items-center justify-between p-4 hover:bg-background rounded-lg transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm text-main">Termos de Uso</span>
                            </div>
                            <Eye className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                        </Link>
                        <Link href="/legal/privacy" className="flex items-center justify-between p-4 hover:bg-background rounded-lg transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm text-main">Política de Privacidade</span>
                            </div>
                            <Eye className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                        </Link>
                        <Link href="/legal/data-usage" className="flex items-center justify-between p-4 hover:bg-background rounded-lg transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                                    <Database className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm text-main">Uso de Dados</span>
                            </div>
                            <Eye className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                        </Link>
                        <Link href="/legal/user-commitment" className="flex items-center justify-between p-4 hover:bg-background rounded-lg transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                                    <User className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm text-main">Compromisso do Usuário</span>
                            </div>
                            <Eye className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                        </Link>

                        <hr className="border-surface-border my-2" />

                        <Link href="/legal/open-source" className="flex items-center justify-between p-4 hover:bg-background rounded-lg transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                                    <Scale className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm text-main">Licença Open-source</span>
                            </div>
                            <Eye className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                        </Link>

                        <Link href="/legal/about" className="flex items-center justify-between p-4 hover:bg-background rounded-lg transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                                    <Info className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm text-main">O que é o Campo Branco</span>
                            </div>
                            <Eye className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                        </Link>
                        <Link href="/legal/contact" className="flex items-center justify-between p-4 hover:bg-background rounded-lg transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm text-main">Contato e Suporte</span>
                            </div>
                            <Eye className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                        </Link>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="space-y-4">
                    <button
                        onClick={() => setShowDangerZone(!showDangerZone)}
                        className="w-full flex items-center justify-between text-sm font-bold text-red-500 uppercase tracking-widest pl-1 hover:opacity-80 transition-all"
                    >
                        <span>Zona de Perigo</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showDangerZone ? 'rotate-180' : ''}`} />
                    </button>

                    {showDangerZone && (
                        <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-lg shadow-sm border border-red-100 dark:border-red-900/30 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-red-700 dark:text-red-400">Excluir Conta</h3>
                                    <p className="text-xs text-red-600/70 dark:text-red-400/70 max-w-sm">
                                        Essa ação é irreversível. Seus dados de perfil serão apagados permanentemente.
                                        Se você for o único administrador de uma congregação, entre em contato com o suporte antes.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setConfirmModal({
                                            isOpen: true,
                                            title: "EXCLUIR CONTA DEFINITIVAMENTE?",
                                            message: "Essa ação não pode ser desfeita. Todos os seus dados de perfil e acesso serão apagados permanentemente da plataforma.",
                                            variant: 'danger',
                                            confirmText: "Excluir Minha Conta",
                                            onConfirm: async () => {
                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                try {
                                                    // 1. Delete Public Profile
                                                    if (user?.uid) {
                                                        const userRef = doc(db, "users", user.uid);
                                                        await deleteDoc(userRef);
                                                    }

                                                    // 2. Logout
                                                    await authLogout();
                                                    toast.success("Conta excluída. Até logo!");
                                                    router.push('/login');
                                                } catch (error: any) {
                                                    console.error("Delete account error:", error);
                                                    toast.error("Erro ao excluir conta. Tente novamente.");
                                                }
                                            }
                                        });
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-red-600/20 whitespace-nowrap"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Excluir Minha Conta
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                <div className="pt-8 pb-12 flex flex-col items-center gap-4">
                    <a
                        href="https://github.com/campobranco/codigo-fonte"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-all duration-300"
                    >
                        <div className="flex items-center gap-1.5 text-main">
                            <Github className="w-4 h-4" />
                            <span className="text-xs font-semibold">Projeto Open Source <span className="text-[10px] opacity-60 font-normal">(MIT)</span></span>
                        </div>

                        <Image
                            src="https://img.shields.io/github/stars/campobranco/codigo-fonte?style=social"
                            alt="GitHub Repo stars"
                            width={0}
                            height={0}
                            style={{ width: 'auto', height: '20px' }}
                            className="grayscale group-hover:grayscale-0 transition-all duration-300"
                            unoptimized
                        />
                    </a>

                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] opacity-30 hover:opacity-100 transition-opacity">
                        Campo Branco v{APP_VERSION}
                    </p>
                </div>
            </main>

            {/* Bottom Navigation */}
            <BottomNav />

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                description={confirmModal.message}
                variant={confirmModal.variant}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
            />
        </div >
    );
}
