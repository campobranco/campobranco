// app/context/AuthContext.tsx
// Contexto global de autenticação usando Firebase Auth
// Gerencia sessão do usuário, perfil, permissões e configurações de congregação

"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { FIREBASE_CONFIG, FIRESTORE_DATABASE_ID, DEFAULT_CONGREGATION_ID } from "@/lib/config";

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
    const [role, setRole] = useState<string | null>(null);
    const [congregationId, setCongregationId] = useState<string | null>(null);
    const [profileName, setProfileName] = useState<string | null>(null);
    const [termType, setTermType] = useState<'city' | 'neighborhood'>('city');
    const [congregationType, setCongregationType] = useState<'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE' | null>(null);
    const [notificationsEnabled, setNotificationsEnabledInternal] = useState(true);

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
                setRole(null);
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
                    const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL;
                    
                    if (masterEmail && user.email === masterEmail && data.role !== 'ADMIN') {
                        // Força ADMIN para o email mestre — NÃO libera o loading aqui.
                        // O próximo snapshot disparará com o role corrigido e liberará o loading.
                        await setDoc(userRef, {
                            role: 'ADMIN',
                            updatedAt: serverTimestamp()
                        }, { merge: true });
                        return; // Aguarda o próximo snapshot para evitar race condition
                    } else {
                        setRole(data.role || 'PUBLICADOR');
                        const resolvedCongId = data.congregationId || null;
                        setCongregationId(resolvedCongId);
                        setProfileName(data.name || user.displayName || user.email);
                        setNotificationsEnabledInternal(data.notificationsEnabled ?? true);
                        console.log(`[DEBUG] Perfil atualizado (Tempo Real): role=${data.role}, congregationId=${resolvedCongId}`);
                    }
                } else {
                    // Novo usuário — NÃO libera o loading aqui.
                    // O snapshot após o setDoc trará os dados e liberará o loading.
                    const masterEmail = process.env.NEXT_PUBLIC_MASTER_EMAIL;
                    const isMaster = masterEmail && user.email === masterEmail;
                    const newUserProfile = {
                        name: user.displayName || (isMaster ? 'Admin' : 'Membro'),
                        email: user.email,
                        role: (isMaster ? 'ADMIN' : 'PUBLICADOR'),
                        // Após a migração, vinculamos o master email automaticamente à congregação padrão
                        // se ele for o criador do sistema, para evitar que fique órfão.
                        congregationId: isMaster ? DEFAULT_CONGREGATION_ID : null,
                        updatedAt: serverTimestamp(),
                        createdAt: serverTimestamp()
                    };
                    await setDoc(userRef, newUserProfile);
                    return; // Aguarda o próximo snapshot para popular os dados
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
