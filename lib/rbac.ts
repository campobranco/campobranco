// lib/rbac.ts

export interface PermissionDomain {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
}

export interface UserPermissions {
    maps?: PermissionDomain;
    reports?: { view?: boolean };
    witnessing?: PermissionDomain;
    s13?: PermissionDomain;
    referencePoints?: { manage?: boolean };
}

export interface RBACContext {
    role: string | null;
    permissions?: UserPermissions | null;
}

export const getRoleFlags = (role: string | null) => {
    const isAdminRoleGlobal = role === 'ADMIN';
    const isElder           = role === 'ANCIAO' || isAdminRoleGlobal;
    const isServant         = role === 'SERVO'  || isElder;

    return {
        isAdminRoleGlobal,
        isElder,
        isServant,
        isAdmin: isElder,
        canManageMembers: isElder,
        canInviteMembers: isServant,
    };
};

export const checkPermission = (context: RBACContext, perm: string): boolean => {
    const { role, permissions } = context;
    const { isAdminRoleGlobal, isElder, isServant } = getRoleFlags(role);

    const [domain, action] = perm.split('.');
    
    // Papéis com acesso total
    if (isAdminRoleGlobal || isElder) return true;
    
    // SERVO herda acesso completo a mapas, testemunho e pontos de referência, mas NÃO a relatórios ou S-13
    if (isServant && (domain === 'maps' || domain === 'witnessing' || domain === 'referencePoints')) return true;
    
    // Consultar permissão customizada no objeto estruturado
    const domainPerms = permissions?.[domain as keyof UserPermissions];
    if (!domainPerms || typeof domainPerms !== 'object') return false;
    
    return !!(domainPerms as Record<string, boolean | undefined>)[action];
};
