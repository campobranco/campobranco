"use client";

import { useEffect, useState, Fragment } from 'react';
import { db } from '@/lib/firebase';
// TODO(mutations): migrate to mutation layer - legacy module (admin/report/dashboard)
// eslint-disable-next-line no-restricted-imports
import { collection, onSnapshot, updateDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { Loader2, Shield, Save, Key, Map, FileText, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/context/AuthContext';

interface UserPermissions {
    mapsView?: boolean;
    mapsCreate?: boolean;
    mapsEdit?: boolean;
    mapsDelete?: boolean;
    reportsView?: boolean;
    witnessingView?: boolean;
    witnessingCreate?: boolean;
    witnessingEdit?: boolean;
    witnessingDelete?: boolean;
    referencePointsManage?: boolean;
}

interface UserProfile {
    id: string;
    email: string;
    roles?: string[]; // Array support
    role?: string; // Legacy support
    name?: string;
    provider?: string;
    permissions?: UserPermissions;
}

const ROLE_DEFINITIONS = [
    { label: 'Publicador', value: 'PUBLICADOR', weight: 1 },
    { label: 'Servo de Territórios', value: 'SERVO', weight: 2 },
    { label: 'Superintendente de Serviço', value: 'ANCIAO', weight: 3 },
    { label: 'ADMIN', value: 'ADMIN', weight: 4 },
];

export default function UserManagementList({ congregationId }: { congregationId?: string | null }) {
    const { user: currentUser, isAdminRoleGlobal, isElder } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Staging changes: { userId: Set<string> }
    const [pendingChanges, setPendingChanges] = useState<Record<string, Set<string>>>({});

    // Custom Permissions States
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const [editingPermissions, setEditingPermissions] = useState<UserPermissions>({});
    const [savingPermissions, setSavingPermissions] = useState(false);

    useEffect(() => {
        let q;
        if (isAdminRoleGlobal) {
            q = congregationId
                ? query(collection(db, 'users'), where('congregationId', '==', congregationId), orderBy('name'))
                : query(collection(db, 'users'), orderBy('name'));
        } else if (congregationId) {
            q = query(collection(db, 'users'), where('congregationId', '==', congregationId), orderBy('name'));
        } else {
            setLoadingData(false);
            return;
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => {
                const d = doc.data();
                // Normalize roles on fetch for consistent UI
                let normalizedRoles: string[] = [];
                if (Array.isArray(d.roles)) normalizedRoles = d.roles;
                else if (d.role) normalizedRoles = [d.role];
                else normalizedRoles = ['PUBLICADOR'];

                return {
                    id: doc.id,
                    ...d,
                    roles: normalizedRoles,
                    permissions: d.permissions || {}
                };
            }) as UserProfile[];
            setUsers(usersData);
            setLoadingData(false);
        }, (error) => {
            console.error("Error fetching users: ", error);
            setLoadingData(false);
        });
        return () => unsubscribe();
    }, [congregationId]);

    const canAssignRole = (targetRole: string): boolean => {
        if (isAdminRoleGlobal) return true;
        if (isElder) {
            // Elders can assign Publicador and Servo, but NOT Anciao or Admin
            return ['PUBLICADOR', 'SERVO'].includes(targetRole);
        }
        return false;
    };

    const toggleRole = (userId: string, currentRoles: string[], roleToToggle: string) => {
        // Initialize pending state if not exists
        const userPending = pendingChanges[userId]
            ? new Set(pendingChanges[userId])
            : new Set(currentRoles);

        if (userPending.has(roleToToggle)) {
            userPending.delete(roleToToggle);
            // Ensure at least PUBLICADOR remains if logic dictates, though Firestore allows empty.
            // Let's enforce implicit PUBLICADOR usually, but flexibility is key.
        } else {
            userPending.add(roleToToggle);
        }

        setPendingChanges(prev => ({ ...prev, [userId]: userPending }));
    };

    const handleSaveChanges = async (userId: string) => {
        const newRoles = Array.from(pendingChanges[userId]);
        setUpdatingId(userId);

        try {
            const userRef = doc(db, 'users', userId);

            // Calculate legacy 'role' string (highest weight) for backward compat
            let highestRole = 'PUBLICADOR';
            let maxWeight = 0;

            newRoles.forEach(r => {
                const def = ROLE_DEFINITIONS.find(d => d.value === r);
                if (def && def.weight > maxWeight) {
                    maxWeight = def.weight;
                    highestRole = r;
                }
            });

            await updateDoc(userRef, {
                roles: newRoles,
                role: highestRole // Keep syncing legacy field
            });

            // Clear pending
            setPendingChanges(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });
        } catch (error) {
            console.error("Error saving roles:", error);
            toast.error("Erro ao salvar funções.");
        } finally {
            setUpdatingId(null);
        }
    };

    const toggleExpandUser = (targetUser: UserProfile) => {
        if (expandedUserId === targetUser.id) {
            setExpandedUserId(null);
            setEditingPermissions({});
        } else {
            setExpandedUserId(targetUser.id);
            setEditingPermissions(targetUser.permissions || {});
        }
    };

    const togglePermissionField = (field: keyof UserPermissions) => {
        setEditingPermissions(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleSavePermissions = async (userId: string) => {
        setSavingPermissions(true);
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                permissions: editingPermissions
            });
            toast.success("Permissões salvas com sucesso!");
            setExpandedUserId(null);
            setEditingPermissions({});
        } catch (error) {
            console.error("Error saving permissions:", error);
            toast.error("Erro ao salvar permissões customizadas.");
        } finally {
            setSavingPermissions(false);
        }
    };

    if (loadingData) {
        return (
            <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/2">Funções (Multisseleção)</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map((u) => {
                            const currentRoles = u.roles || [];
                            const pendingForUser = pendingChanges[u.id];
                            const displayRoles = pendingForUser ? Array.from(pendingForUser) : currentRoles;
                            const hasChanges = !!pendingForUser;

                            return (
                                <Fragment key={u.id}>
                                    <tr className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-light/50 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                                    {u.email ? u.email.substring(0, 2).toUpperCase() : '??'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm whitespace-nowrap">{u.name || 'Sem nome'}</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{u.email}</p>
                                                    {/* Labels */}
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {displayRoles.map(r => (
                                                            <span key={r} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase
                                                                ${r === 'ADMIN' ? 'bg-red-100 text-red-700' :
                                                                    r === 'ANCIAO' ? 'bg-purple-100 text-purple-700' :
                                                                        r === 'SERVO' ? 'bg-primary-light text-primary-dark' :
                                                                            'bg-green-100 text-green-700'}
                                                            `}>
                                                                {ROLE_DEFINITIONS.find(def => def.value === r)?.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="grid grid-cols-2 gap-2">
                                                {ROLE_DEFINITIONS.filter(d => ['PUBLICADOR', 'SERVO'].includes(d.value)).map((def) => {
                                                    const isAssigned = displayRoles.includes(def.value);
                                                    const allowed = canAssignRole(def.value);

                                                    return (
                                                        <label
                                                            key={def.value}
                                                            className={`flex items-center p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer
                                                                ${isAssigned ? 'bg-primary-light/50 border-blue-200 text-primary-dark' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'}
                                                                ${!allowed ? 'opacity-40 cursor-not-allowed bg-gray-50' : ''}
                                                            `}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isAssigned}
                                                                onChange={() => toggleRole(u.id, currentRoles, def.value)}
                                                                disabled={!allowed}
                                                                className="w-4 h-4 rounded text-primary focus:ring-primary-light/500 border-gray-300 mr-2"
                                                            />
                                                            {def.label}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => toggleExpandUser(u)}
                                                    className={`p-2 rounded-lg transition-all active:scale-95 flex items-center justify-center border
                                                        ${expandedUserId === u.id
                                                            ? 'bg-primary border-primary text-white shadow-md'
                                                            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600 hover:text-primary hover:border-blue-200'
                                                        }
                                                    `}
                                                    title="Permissões Detalhadas"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>

                                                {updatingId === u.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                ) : (
                                                    hasChanges && (
                                                        <button
                                                            onClick={() => handleSaveChanges(u.id)}
                                                            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center"
                                                            title="Salvar Funções"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedUserId === u.id && (
                                        <tr className="bg-gray-50/70 border-b border-gray-100 animate-in fade-in duration-300">
                                            <td colSpan={3} className="px-8 py-6">
                                                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                                                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                                                        <Key className="w-5 h-5 text-primary" />
                                                        <h3 className="font-bold text-gray-900 text-sm">Permissões Detalhadas para {u.name || u.email}</h3>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        {/* Seção Mapas */}
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2 font-bold text-gray-800 text-xs uppercase tracking-wider">
                                                                <Map className="w-4 h-4 text-primary" />
                                                                <span>Mapas e Territórios</span>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                {[
                                                                    { key: 'mapsView', label: 'Visualizar' },
                                                                    { key: 'mapsCreate', label: 'Criar' },
                                                                    { key: 'mapsEdit', label: 'Editar' },
                                                                    { key: 'mapsDelete', label: 'Excluir' },
                                                                    { key: 'referencePointsManage', label: 'Gerenciar Referências' }
                                                                ].map((p) => {
                                                                    const isChecked = !!editingPermissions[p.key as keyof UserPermissions];
                                                                    return (
                                                                        <label
                                                                            key={p.key}
                                                                            className={`flex items-center p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all hover:bg-gray-50
                                                                                ${isChecked ? 'bg-primary-light/30 border-blue-200 text-primary-dark font-bold' : 'bg-white border-gray-200 text-gray-600'}
                                                                            `}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => togglePermissionField(p.key as keyof UserPermissions)}
                                                                                className="w-4 h-4 rounded text-primary focus:ring-primary-light border-gray-300 mr-2.5"
                                                                            />
                                                                            {p.label}
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Seção Relatórios */}
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2 font-bold text-gray-800 text-xs uppercase tracking-wider">
                                                                <FileText className="w-4 h-4 text-purple-600" />
                                                                <span>Relatórios</span>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                {[
                                                                    { key: 'reportsView', label: 'Visualizar Relatórios' }
                                                                ].map((p) => {
                                                                    const isChecked = !!editingPermissions[p.key as keyof UserPermissions];
                                                                    return (
                                                                        <label
                                                                            key={p.key}
                                                                            className={`flex items-center p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all hover:bg-gray-50
                                                                                ${isChecked ? 'bg-purple-50/50 border-purple-200 text-purple-700 font-bold' : 'bg-white border-gray-200 text-gray-600'}
                                                                            `}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => togglePermissionField(p.key as keyof UserPermissions)}
                                                                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-200 border-gray-300 mr-2.5"
                                                                            />
                                                                            {p.label}
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Seção Testemunho Público */}
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2 font-bold text-gray-800 text-xs uppercase tracking-wider">
                                                                <Store className="w-4 h-4 text-green-600" />
                                                                <span>Testemunho Público</span>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                {[
                                                                    { key: 'witnessingView', label: 'Visualizar' },
                                                                    { key: 'witnessingCreate', label: 'Criar Ponto' },
                                                                    { key: 'witnessingEdit', label: 'Editar Ponto' },
                                                                    { key: 'witnessingDelete', label: 'Excluir Ponto' }
                                                                ].map((p) => {
                                                                    const isChecked = !!editingPermissions[p.key as keyof UserPermissions];
                                                                    return (
                                                                        <label
                                                                            key={p.key}
                                                                            className={`flex items-center p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all hover:bg-gray-50
                                                                                ${isChecked ? 'bg-green-50/50 border-green-200 text-green-700 font-bold' : 'bg-white border-gray-200 text-gray-600'}
                                                                            `}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => togglePermissionField(p.key as keyof UserPermissions)}
                                                                                className="w-4 h-4 rounded text-green-600 focus:ring-green-200 border-gray-300 mr-2.5"
                                                                            />
                                                                            {p.label}
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
                                                        <button
                                                            onClick={() => toggleExpandUser(u)}
                                                            className="px-4 py-2 border border-gray-200 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            onClick={() => handleSavePermissions(u.id)}
                                                            disabled={savingPermissions}
                                                            className="bg-primary hover:bg-primary-dark disabled:bg-primary-light/50 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                                                        >
                                                            {savingPermissions ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Save className="w-3.5 h-3.5" />
                                                            )}
                                                            Salvar Permissões
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
