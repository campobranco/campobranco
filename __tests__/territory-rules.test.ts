import { 
    canAssignTerritory, 
    canReturnTerritory, 
    canDeleteTerritory, 
    TerritoryState, 
    TerritoryDependencies 
} from '../lib/domain/territoryRules';

describe('Territory Business Rules (Core Domain)', () => {

    describe('1. Designação (canAssignTerritory)', () => {
        it('Cenário 1: Território disponível + Usuário válido = Designação permitida', () => {
            const territory: TerritoryState = { id: 't1', status: 'Disponível' };
            const result = canAssignTerritory(territory, 'user-123');
            expect(result.valid).toBe(true);
        });

        it('Cenário 2: Território já emprestado = Erro (TERRITORY_ALREADY_ASSIGNED)', () => {
            const territory: TerritoryState = { id: 't1', status: 'Emprestado', assignedTo: 'user-999' };
            const result = canAssignTerritory(territory, 'user-123');
            expect(result.valid).toBe(false);
            expect(result.code).toBe('TERRITORY_ALREADY_ASSIGNED');
        });

        it('Cenário 3: Usuário vazio/nulo = Permitido (Link Aberto)', () => {
            const territory: TerritoryState = { id: 't1', status: 'Disponível' };
            const result = canAssignTerritory(territory, '');
            expect(result.valid).toBe(true);
            
            const resultNull = canAssignTerritory(territory, null);
            expect(resultNull.valid).toBe(true);
        });

        it('Cenário Extra: Status inválido = Erro (INVALID_STATUS)', () => {
            const territory: TerritoryState = { id: 't1', status: 'XYZ' };
            const result = canAssignTerritory(territory, 'user-123');
            expect(result.valid).toBe(false);
            expect(result.code).toBe('INVALID_STATUS');
        });

        it('Cenário Extra: Dados corrompidos (status null) = Erro (INVALID_TERRITORY_STATE)', () => {
            const territory: TerritoryState = { id: 't1', status: null };
            const result = canAssignTerritory(territory, 'user-123');
            expect(result.valid).toBe(false);
            expect(result.code).toBe('INVALID_TERRITORY_STATE');
        });
    });

    describe('2. Devolução (canReturnTerritory)', () => {
        it('Cenário 4: Usuário é o atual responsável = Devolução permitida', () => {
            const territory: TerritoryState = { id: 't1', status: 'Emprestado', assignedTo: 'user-123' };
            const result = canReturnTerritory(territory, 'PUBLICADOR', 'user-123');
            expect(result.valid).toBe(true);
        });

        it('Cenário 5: Usuário não é o responsável = Erro (UNAUTHORIZED_RETURN)', () => {
            const territory: TerritoryState = { id: 't1', status: 'Emprestado', assignedTo: 'user-999' };
            const result = canReturnTerritory(territory, 'PUBLICADOR', 'user-123');
            expect(result.valid).toBe(false);
            expect(result.code).toBe('UNAUTHORIZED_RETURN');
        });

        it('Cenário 6: Admin/Ancião devolvendo território de terceiros = Permitido', () => {
            const territory: TerritoryState = { id: 't1', status: 'Emprestado', assignedTo: 'user-999' };
            const resultAdmin = canReturnTerritory(territory, 'ADMIN', 'admin-1');
            expect(resultAdmin.valid).toBe(true);

            const resultElder = canReturnTerritory(territory, 'ANCIAO', 'elder-1');
            expect(resultElder.valid).toBe(true);
        });

        it('Cenário 8/9 (Integridade): Tentar devolver território Disponível = Erro (TERRITORY_NOT_ASSIGNED)', () => {
            const territory: TerritoryState = { id: 't1', status: 'Disponível' };
            const result = canReturnTerritory(territory, 'ADMIN', 'admin-1');
            expect(result.valid).toBe(false);
            expect(result.code).toBe('TERRITORY_NOT_ASSIGNED');
        });
    });

    describe('3. Exclusão (canDeleteTerritory)', () => {
        it('Cenário 7a: Bloquear exclusão se existirem dependências = Erro (HAS_DEPENDENCIES)', () => {
            const territory: TerritoryState = { id: 't1' };
            const deps: TerritoryDependencies = { activeAddressesCount: 27 };
            
            const result = canDeleteTerritory(territory, deps);
            expect(result.valid).toBe(false);
            expect(result.code).toBe('HAS_DEPENDENCIES');
            expect(result.message).toContain('27 endereços vinculados');
        });

        it('Cenário 7b: Permitir exclusão se não houver dependências', () => {
            const territory: TerritoryState = { id: 't1' };
            const deps: TerritoryDependencies = { activeAddressesCount: 0 };
            
            const result = canDeleteTerritory(territory, deps);
            expect(result.valid).toBe(true);
        });
    });
});
