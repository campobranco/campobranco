// app/context/AuthContext.tsx
// Contexto global de autenticação usando Firebase Auth
// Gerencia sessão do usuário, perfil, permissões e configurações de congregação

"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { User, signOut } from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserPermissions, getRoleFlags, checkPermission } from "@/lib/rbac";
import { ensureUserProfileMutation, updateUserNotificationsMutation } from "@/lib/contracts/mutations/authMutations";
import { logActivityMutation as logActivity } from "@/lib/contracts/mutations/auditMutations";

// Tipagem do contexto de autenticação
interface AuthContextType {
    user: User | null;
    loading: boolean;
    role: string | null;
    congregationId: string | null;
    logout: () => Promise<void>;
    profileName: string | null;
    isAdminRoleGlobal: boolean;
    isElder: boolean;
    isServant: boolean;
    isAdmin: boolean;
    termType: 'city' | 'neighborhood';
    congregationType: 'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE' | null;
    notificationsEnabled: boolean;
    setNotificationsEnabled: (enabled: boolean) => Promise<void>;
    canManageMembers: boolean;
    canInviteMembers: boolean;
    permissions: UserPermissions | null;
    // Helper centralizado: 'domain.action' e.g. 'maps.view', 's13.create'
    can: (perm: string) => boolean;
    // Flags computadas (retrocompatibilidade)
    canViewReports: boolean;
    canManageMaps: boolean;
    canCreateMaps: boolean;
    canEditMaps: boolean;
    canDeleteMaps: boolean;
    canManageWitnessing: boolean;
    canCreateWitnessing: boolean;
    canEditWitnessing: boolean;
    canDeleteWitnessing: boolean;
    canViewS13: boolean;
    canCreateS13: boolean;
    canEditS13: boolean;
    canDeleteS13: boolean;
    canManageReferencePoints: boolean;
}

// Normaliza permissões do Firestore (flat ou agrupado) para o formato agrupado
function normalizePermissions(raw: any): UserPermissions {
    if (!raw) return {};
    return {
        maps: {
            view:   raw.maps?.view   ?? raw.mapsView   ?? undefined,
            create: raw.maps?.create ?? raw.mapsCreate ?? undefined,
            edit:   raw.maps?.edit   ?? raw.mapsEdit   ?? undefined,
            delete: raw.maps?.delete ?? raw.mapsDelete ?? undefined,
        },
        witnessing: {
            view:   raw.witnessing?.view   ?? raw.witnessingView   ?? undefined,
            create: raw.witnessing?.create ?? raw.witnessingCreate ?? undefined,
            edit:   raw.witnessing?.edit   ?? raw.witnessingEdit   ?? undefined,
            delete: raw.witnessing?.delete ?? raw.witnessingDelete ?? undefined,
        },
        s13: {
            view:   raw.s13?.view   ?? raw.s13View   ?? undefined,
            create: raw.s13?.create ?? raw.s13Create ?? undefined,
            edit:   raw.s13?.edit   ?? raw.s13Edit   ?? undefined,
            delete: raw.s13?.delete ?? raw.s13Delete ?? undefined,
        },
        reports: {
            view: raw.reports?.view ?? raw.reportsView ?? undefined,
        },
        referencePoints: {
            manage: raw.referencePoints?.manage ?? raw.referencePointsManage ?? undefined,
        },
    };
}

// Valores padrão do contexto (estado inicial antes de carregar)
const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    role: null,
    congregationId: null,
    logout: async () => {},
    profileName: null,
    isAdminRoleGlobal: false,
    isElder: false,
    isServant: false,
    isAdmin: false,
    termType: 'city',
    congregationType: null,
    notificationsEnabled: true,
    setNotificationsEnabled: async () => {},
    canManageMembers: false,
    canInviteMembers: false,
    permissions: null,
    can: () => false,
    canViewReports: false,
    canManageMaps: false,
    canCreateMaps: false,
    canEditMaps: false,
    canDeleteMaps: false,
    canManageWitnessing: false,
    canCreateWitnessing: false,
    canEditWitnessing: false,
    canDeleteWitnessing: false,
    canViewS13: false,
    canCreateS13: false,
    canEditS13: false,
    canDeleteS13: false,
    canManageReferencePoints: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<UserPermissions | null>(null);
    const [congregationId, setCongregationId] = useState<string | null>(null);
    const [profileName, setProfileName] = useState<string | null>(null);
    const [termType, setTermType] = useState<'city' | 'neighborhood'>('city');
    const [congregationType, setCongregationType] = useState<'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE' | null>(null);
    const [notificationsEnabled, setNotificationsEnabledInternal] = useState(true);

    // Timeout de segurança para evitar loading infinito
    useEffect(() => {
        const safetyTimeout = setTimeout(() => setLoading(false), 10000);
        return () => clearTimeout(safetyTimeout);
    }, []);

    // Ouve mudanças de estado de autenticação (token renovação)
    useEffect(() => {
        const { onIdTokenChanged } = require("firebase/auth");
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser: User | null) => {
            if (firebaseUser) {
                const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || '').trim().toLowerCase();
                const userEmail = (firebaseUser.email || '').trim().toLowerCase();
                const isMaster = masterEmail && userEmail === masterEmail;

                if (isMaster) {
                    console.log(`[AUTH] Admin Mestre detectado: ${userEmail}`);
                    setRole('ADMIN');
                }

                setUser(firebaseUser);

                // Salva o token no cookie para uso nas API routes
                try {
                    const token = await firebaseUser.getIdToken(true);
                    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
                    document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax${isSecure ? '; Secure' : ''}`;
                } catch (e) {
                    console.warn("[AUTH] Não foi possível salvar o token no cookie:", e);
                }
            } else {
                setUser(null);
                setRole(null);
                setPermissions(null);
                setCongregationId(null);
                setProfileName(null);
                if (typeof document !== 'undefined') {
                    document.cookie = '__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                }
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Intercepta e registra automaticamente todas as falhas globais de permissão (permission-denied)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const error = event.reason;
            const errMsg = error?.message || String(error || '');
            const errCode = error?.code || '';

            if (
                errCode === 'permission-denied' ||
                errMsg.toLowerCase().includes('permission-denied') ||
                errMsg.toLowerCase().includes('insufficient permissions') ||
                errMsg.toLowerCase().includes('permissão')
            ) {
                console.warn('[SECURITY] Falha de permissão capturada globalmente:', errMsg);
                logActivity({
                    level: 'WARN',
                    category: 'AUTH',
                    action: 'PERMISSION_DENIED',
                    message: `PERMISSAO_NEGADA: Acesso bloqueado por falta de privilégio`,
                    details: `Mensagem: ${errMsg} | Código: ${errCode || 'N/A'}`
                });
            }
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }, []);

    // Ouve mudanças no perfil do usuário no Firestore em TEMPO REAL
    useEffect(() => {
        if (!user) return;

        console.log(`[AUTH] Iniciando listener de perfil: users/${user.uid}`);
        const userRef = doc(db, 'users', user.uid);

        const unsubscribe = onSnapshot(userRef, async (userSnap) => {
            try {
                const data = userSnap.exists() ? userSnap.data() : null;
                const masterEmail = (process.env.NEXT_PUBLIC_MASTER_EMAIL || '').trim().toLowerCase();
                const userEmail = (user.email || '').trim().toLowerCase();
                const isMaster = masterEmail && userEmail === masterEmail;

                if (isMaster) {
                    setRole('ADMIN');
                }

                if (userSnap.exists() && data) {
                    const assignedRole = isMaster ? 'ADMIN' : (data.role || 'PUBLICADOR');
                    console.log(`[AUTH] Perfil carregado -> User: ${user.email} | Role: ${assignedRole} | CongregationId: ${data.congregationId || 'NULL'}`);
                    setRole(assignedRole);
                    setPermissions(normalizePermissions(data.permissions ?? null));
                    
                    const storedCong = typeof window !== 'undefined' ? localStorage.getItem('selectedCongregationId') : null;
                    const finalCongId = data.congregationId || storedCong || (isMaster ? 'ls-catanduva' : null);
                    setCongregationId(finalCongId);
                    if (finalCongId && typeof window !== 'undefined') {
                        localStorage.setItem('selectedCongregationId', finalCongId);
                    }

                    setProfileName(data.name || user.displayName || user.email);
                    setNotificationsEnabledInternal(data.notificationsEnabled ?? true);
                } else {
                    console.log(`[AUTH] Documento de perfil não encontrado em users/${user.uid}`);
                    if (isMaster) {
                        setRole('ADMIN');
                        const storedCong = typeof window !== 'undefined' ? localStorage.getItem('selectedCongregationId') : null;
                        const finalCongId = storedCong || 'ls-catanduva';
                        setCongregationId(finalCongId);
                        if (typeof window !== 'undefined') {
                            localStorage.setItem('selectedCongregationId', finalCongId);
                        }
                    } else {
                        setRole('PUBLICADOR');
                        setCongregationId(null);
                    }
                }
            } catch (error) {
                console.error("[AUTH] Erro no listener de perfil:", error);
            } finally {
                // Sincronização completa concluída: só libera após o ciclo do React processar
                setTimeout(() => setLoading(false), 50);
            }
        }, (error) => {
            console.error("[AUTH] Erro fatal no listener de perfil:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Busca configurações da congregação (tipo de termo, categoria)
    useEffect(() => {
        if (!congregationId) {
            setTermType('city');
            setCongregationType(null);
            return;
        }

        let active = true;
        const fetchCong = async () => {
            const congIdLower = congregationId.toLowerCase();
            if (congIdLower.startsWith('ls') || congIdLower.includes('ls-') || congIdLower.includes('sinais') || congIdLower.includes('libras')) {
                if (active) setCongregationType('SIGN_LANGUAGE');
                return;
            }

            try {
                const congRef = doc(db, 'congregations', congregationId);
                const congSnap = await getDoc(congRef);
                if (active && congSnap.exists()) {
                    const data = congSnap.data();
                    setTermType(data.termType || 'city');
                    const type = data.type || '';
                    const cat = (data.category || '').toLowerCase();
                    const isSign = type === 'SIGN_LANGUAGE' || cat.includes('sinais') || cat.includes('libras') || cat.includes('surdo') || cat.includes('ls') || !data.category;
                    const isForeign = type === 'FOREIGN_LANGUAGE' || cat.includes('estrangeiro');

                    if (isSign) {
                        setCongregationType('SIGN_LANGUAGE');
                    } else if (isForeign) {
                        setCongregationType('FOREIGN_LANGUAGE');
                    } else {
                        setCongregationType('TRADITIONAL');
                    }
                }
            } catch (err) {
                console.error("[AUTH] Erro ao buscar configurações da congregação:", err);
            }
        };

        fetchCong();
        return () => { active = false; };
    }, [congregationId]);

    // --- FLAGS DE CARGO ---
    const { isAdminRoleGlobal, isElder, isServant, isAdmin, canManageMembers, canInviteMembers } = getRoleFlags(role);

    // --- HELPER CENTRALIZADO DE PERMISSÃO ---
    const can = (perm: string): boolean => {
        return checkPermission({ role, permissions }, perm);
    };

    // --- FLAGS COMPUTADAS (retrocompatibilidade com o restante do código) ---
    const canViewReports       = can('reports.view');
    const canManageMaps        = can('maps.view') || can('maps.create') || can('maps.edit') || can('maps.delete');
    const canCreateMaps        = can('maps.create');
    const canEditMaps          = can('maps.edit');
    const canDeleteMaps        = can('maps.delete');
    const canManageWitnessing  = can('witnessing.view') || can('witnessing.create') || can('witnessing.edit') || can('witnessing.delete');
    const canCreateWitnessing  = can('witnessing.create');
    const canEditWitnessing    = can('witnessing.edit');
    const canDeleteWitnessing  = can('witnessing.delete');
    const canViewS13           = can('s13.view') || can('s13.create') || can('s13.edit') || can('s13.delete');
    const canCreateS13         = can('s13.create');
    const canEditS13           = can('s13.edit');
    const canDeleteS13         = can('s13.delete');
    const canManageReferencePoints = can('referencePoints.manage');

    // Realiza logout do Firebase
    const logout = async () => {
        const currentUserEmail = user?.email;
        const currentUid = user?.uid;
        const currentRole = role;

        try {
            await logActivity({
                level: 'INFO',
                category: 'AUTH',
                action: 'USER_LOGOUT',
                message: `USER_LOGOUT: Usuário ${currentUserEmail || 'autenticado'} encerrou a sessão`,
                user: currentUserEmail || undefined,
                userId: currentUid || undefined,
                role: currentRole || undefined,
                congregationId: congregationId || undefined,
                details: `Encerramento de sessão efetuado pelo usuário`
            });
        } catch (e) {
            console.error("Erro ao registrar log de logout:", e);
        }

        await signOut(auth);
        setUser(null);
        setRole(null);
        setPermissions(null);
        setCongregationId(null);
        setProfileName(null);
        if (typeof document !== 'undefined') {
            const isSecure = window.location.protocol === 'https:';
            document.cookie = `__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${isSecure ? '; Secure' : ''}`;
        }
    };

    // Atualiza a preferência de notificações do usuário no Firestore
    const updateNotificationsEnabled = async (enabled: boolean) => {
        if (!user) return;
        try {
            const res = await updateUserNotificationsMutation({ uid: user.uid, enabled });
            if (!res.success) throw new Error(res.message);
            setNotificationsEnabledInternal(enabled);
        } catch (error) {
            console.error("[AUTH] Erro ao atualizar notificações:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            role,
            congregationId,
            profileName,
            logout,
            isAdminRoleGlobal,
            isElder,
            isServant,
            isAdmin,
            termType,
            congregationType,
            notificationsEnabled,
            setNotificationsEnabled: updateNotificationsEnabled,
            canManageMembers,
            canInviteMembers,
            permissions,
            can,
            canViewReports,
            canManageMaps,
            canCreateMaps,
            canEditMaps,
            canDeleteMaps,
            canManageWitnessing,
            canCreateWitnessing,
            canEditWitnessing,
            canDeleteWitnessing,
            canViewS13,
            canCreateS13,
            canEditS13,
            canDeleteS13,
            canManageReferencePoints,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
