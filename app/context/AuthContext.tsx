// app/context/AuthContext.tsx
// Contexto global de autenticação usando Firebase Auth
// Gerencia sessão do usuário, perfil, permissões e configurações de congregação

"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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
    simulateRole: (role: string | null) => void;
    isSimulating: boolean;
    actualRole: string | null;
    termType: 'city' | 'neighborhood';
    congregationType: 'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE' | null;
    notificationsEnabled: boolean;
    setNotificationsEnabled: (enabled: boolean) => Promise<void>;
    canManageMembers: boolean;
    canInviteMembers: boolean;
}

// Valores padrão do contexto (estado inicial antes de carregar)
const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    role: null,
    congregationId: null,
    logout: async () => { },
    profileName: null,
    isAdminRoleGlobal: false,
    isElder: false,
    isServant: false,
    isAdmin: false,
    simulateRole: () => { },
    isSimulating: false,
    actualRole: null,
    termType: 'city',
    congregationType: null,
    notificationsEnabled: true,
    setNotificationsEnabled: async () => { },
    canManageMembers: false,
    canInviteMembers: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [actualRole, setActualRole] = useState<string | null>(null);
    const [simulatedRole, setSimulatedRole] = useState<string | null>(null);
    const [congregationId, setCongregationId] = useState<string | null>(null);
    const [profileName, setProfileName] = useState<string | null>(null);
    const [termType, setTermType] = useState<'city' | 'neighborhood'>('city');
    const [congregationType, setCongregationType] = useState<'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE' | null>(null);
    const [notificationsEnabled, setNotificationsEnabledInternal] = useState(true);

    // Papel efetivo: simulado (se ativo) ou real do banco
    const role = simulatedRole || actualRole;

    // Timeout de segurança para evitar loading infinito
    useEffect(() => {
        const safetyTimeout = setTimeout(() => {
            setLoading(false);
        }, 10000);

        return () => clearTimeout(safetyTimeout);
    }, []);

    // Ouve mudanças de estado de autenticação
    useEffect(() => {
        const { onIdTokenChanged } = require("firebase/auth");
        const unsubscribe = onIdTokenChanged(auth, async (firebaseUser: User | null) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                
                // Salva o token no cookie para uso nas API routes (servidor)
                try {
                    const token = await firebaseUser.getIdToken(true);
                    const isSecure = window.location.protocol === 'https:';
                    document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax${isSecure ? '; Secure' : ''}`;
                } catch (e) {
                    console.warn("Não foi possível salvar o token no cookie:", e);
                }
            } else {
                setUser(null);
                setActualRole(null);
                setSimulatedRole(null);
                setCongregationId(null);
                setProfileName(null);
                document.cookie = '__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Ouve mudanças no perfil do usuário no Firestore em TEMPO REAL
    useEffect(() => {
        if (!user) return;

        console.log(`[DEBUG] Iniciando listener de perfil: users/${user.uid}`);
        const userRef = doc(db, 'users', user.uid);
        
        const unsubscribe = onSnapshot(userRef, async (userSnap) => {
            try {
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || 'campobrancojw@gmail.com';
                    
                    if (user.email === masterEmail && data.role !== 'ADMIN') {
                        // Força ADMIN para o email mestre
                        await setDoc(userRef, {
                            role: 'ADMIN',
                            updatedAt: serverTimestamp()
                        }, { merge: true });
                        // O próximo snapshot disparará com os dados atualizados
                    } else {
                        setActualRole(data.role || 'PUBLICADOR');
                        const resolvedCongId = data.congregationId || data.congregation_id || null;
                        setCongregationId(resolvedCongId);
                        setProfileName(data.name || data.display_name || user.displayName || user.email);
                        setNotificationsEnabledInternal(data.notificationsEnabled ?? true);
                        console.log(`[DEBUG] Perfil atualizado (Tempo Real): role=${data.role}, congregationId=${resolvedCongId}`);
                    }
                } else {
                    // Novo usuário
                    const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL || 'campobrancojw@gmail.com';
                    const isMaster = user.email === masterEmail;
                    const newUserProfile = {
                        name: user.displayName || (isMaster ? 'Admin' : 'Membro'),
                        email: user.email,
                        role: (isMaster ? 'ADMIN' : 'PUBLICADOR'),
                        congregationId: null,
                        updatedAt: serverTimestamp(),
                        createdAt: serverTimestamp()
                    };
                    await setDoc(userRef, newUserProfile);
                }
            } catch (error) {
                console.error("Erro no listener de perfil:", error);
            } finally {
                setLoading(false);
            }
        }, (error) => {
            console.error("Erro fatal no listener de perfil:", error);
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

        let isMounted = true;
        const fetchCong = async () => {
            try {
                const congRef = doc(db, 'congregations', congregationId);
                const congSnap = await getDoc(congRef);

                if (isMounted && congSnap.exists()) {
                    const data = congSnap.data();
                    setTermType(data.termType || 'city');

                    const cat = (data.category || '').toLowerCase();
                    if (cat.includes('sinais')) setCongregationType('SIGN_LANGUAGE');
                    else if (cat.includes('estrangeiro')) setCongregationType('FOREIGN_LANGUAGE');
                    else setCongregationType('TRADITIONAL');
                }
            } catch (err) {
                console.error("Erro ao buscar configurações da congregação:", err);
            }
        };

        fetchCong();
        return () => { isMounted = false; };
    }, [congregationId]);

    // Realiza logout do Firebase
    const logout = async () => {
        await signOut(auth);
        const isSecure = window.location.protocol === 'https:';
        document.cookie = `__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    };

    // Atualiza a preferência de notificações do usuário no Firestore
    const updateNotificationsEnabled = async (enabled: boolean) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), { notificationsEnabled: enabled });
            setNotificationsEnabledInternal(enabled);
        } catch (error) {
            console.error("Erro ao atualizar notificações:", error);
            throw error;
        }
    };

    // Permite que Admins simulem outros papéis para testar permissões
    const simulateRole = (newRole: string | null) => {
        if (actualRole === 'ADMIN') {
            setSimulatedRole(newRole);
        }
    };

    // Flags de permissão derivadas do papel atual
    const isAdminRoleGlobal = role === 'ADMIN';
    const isElder = role === 'ANCIAO' || isAdminRoleGlobal;
    const isServant = role === 'SERVO' || isElder;
    const isAdmin = isElder;
    const canManageMembers = isElder;
    const canInviteMembers = isServant;

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
            simulateRole,
            isSimulating: !!simulatedRole,
            actualRole,
            termType,
            congregationType,
            notificationsEnabled,
            setNotificationsEnabled: updateNotificationsEnabled,
            canManageMembers,
            canInviteMembers
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
