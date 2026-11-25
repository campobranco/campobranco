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
    s12?: { manage?: boolean };
    members?: { manage?: boolean; invite?: boolean };
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
    
    // SERVO herda acesso completo aos módulos operacionais e convite de publicadores, mas NÃO à gestão de membros
    if (isServant && (
        domain === 'maps' ||
        domain === 'witnessing' ||
        domain === 's13' ||
        domain === 's12' ||
        domain === 'reports' ||
        perm === 'members.invite'
    )) return true;
    
    // Consultar permissão customizada no objeto estruturado
    const domainPerms = permissions?.[domain as keyof UserPermissions];
    if (!domainPerms || typeof domainPerms !== 'object') return false;
    
    return !!(domainPerms as Record<string, boolean | undefined>)[action];
};

