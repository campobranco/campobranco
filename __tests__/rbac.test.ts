import { checkPermission, getRoleFlags, RBACContext } from '../lib/rbac';

describe('RBAC - Role Based Access Control', () => {

    describe('getRoleFlags', () => {
        it('deve identificar flags corretamente para ADMIN', () => {
            // Arrange
            const role = 'ADMIN';

            // Act
            const flags = getRoleFlags(role);

            // Assert
            expect(flags.isAdminRoleGlobal).toBe(true);
            expect(flags.isElder).toBe(true);
            expect(flags.isServant).toBe(true);
            expect(flags.isAdmin).toBe(true);
            expect(flags.canManageMembers).toBe(true);
            expect(flags.canInviteMembers).toBe(true);
        });

        it('deve identificar flags corretamente para ANCIAO', () => {
            // Arrange
            const role = 'ANCIAO';

            // Act
            const flags = getRoleFlags(role);

            // Assert
            expect(flags.isAdminRoleGlobal).toBe(false);
            expect(flags.isElder).toBe(true);
            expect(flags.isServant).toBe(true);
            expect(flags.isAdmin).toBe(true);
            expect(flags.canManageMembers).toBe(true);
            expect(flags.canInviteMembers).toBe(true);
        });

        it('deve identificar flags corretamente para SERVO', () => {
            // Arrange
            const role = 'SERVO';

            // Act
            const flags = getRoleFlags(role);

            // Assert
            expect(flags.isAdminRoleGlobal).toBe(false);
            expect(flags.isElder).toBe(false);
            expect(flags.isServant).toBe(true);
            expect(flags.isAdmin).toBe(false);
            expect(flags.canManageMembers).toBe(false);
            expect(flags.canInviteMembers).toBe(true);
        });

        it('deve identificar flags corretamente para PUBLICADOR', () => {
            // Arrange
            const role = 'PUBLICADOR';

            // Act
            const flags = getRoleFlags(role);

            // Assert
            expect(flags.isAdminRoleGlobal).toBe(false);
            expect(flags.isElder).toBe(false);
            expect(flags.isServant).toBe(false);
            expect(flags.isAdmin).toBe(false);
            expect(flags.canManageMembers).toBe(false);
            expect(flags.canInviteMembers).toBe(false);
        });

        it('deve tratar adequadamente role indefinido ou null (Edge Case)', () => {
            // Arrange
            const role = null;

            // Act
            const flags = getRoleFlags(role);

            // Assert
            expect(flags.isAdminRoleGlobal).toBe(false);
            expect(flags.isElder).toBe(false);
            expect(flags.isServant).toBe(false);
        });
    });

    describe('checkPermission', () => {
        it('deve conceder permissão total para ADMIN e ANCIAO', () => {
            // Arrange
            const adminContext: RBACContext = { role: 'ADMIN', permissions: null };
            const elderContext: RBACContext = { role: 'ANCIAO', permissions: null };

            // Act & Assert
            expect(checkPermission(adminContext, 'maps.create')).toBe(true);
            expect(checkPermission(adminContext, 'reports.view')).toBe(true);
            expect(checkPermission(elderContext, 's13.delete')).toBe(true);
            expect(checkPermission(elderContext, 'random.action')).toBe(true); // Superadmin behavior
        });

        it('deve conceder permissões limitadas inerentes para SERVO', () => {
            // Arrange
            const servantContext: RBACContext = { role: 'SERVO', permissions: null };

            // Act & Assert
            expect(checkPermission(servantContext, 'maps.edit')).toBe(true);
            expect(checkPermission(servantContext, 'witnessing.create')).toBe(true);
            expect(checkPermission(servantContext, 'referencePoints.manage')).toBe(true);
            
            // Não deve acessar relatórios nem S13
            expect(checkPermission(servantContext, 'reports.view')).toBe(false);
            expect(checkPermission(servantContext, 's13.create')).toBe(false);
        });

        it('deve conceder permissão para PUBLICADOR apenas se explicitamente definido', () => {
            // Arrange
            const pubContextSemPermissao: RBACContext = { role: 'PUBLICADOR', permissions: null };
            const pubContextComPermissao: RBACContext = { 
                role: 'PUBLICADOR', 
                permissions: { maps: { view: true, create: false } } 
            };

            // Act & Assert
            expect(checkPermission(pubContextSemPermissao, 'maps.view')).toBe(false);
            expect(checkPermission(pubContextComPermissao, 'maps.view')).toBe(true);
            expect(checkPermission(pubContextComPermissao, 'maps.create')).toBe(false);
        });

        it('deve lidar com strings de permissões malformadas (Edge Case)', () => {
            // Arrange
            const context: RBACContext = { role: 'PUBLICADOR', permissions: { maps: { view: true } } };

            // Act & Assert
            // Domínio inexistente ou malformado não deve travar
            expect(checkPermission(context, 'notexist')).toBe(false);
            expect(checkPermission(context, '')).toBe(false);
            expect(checkPermission(context, 'maps.delete')).toBe(false);
        });
    });
});
