import { assignTerritoryMutation } from '../lib/contracts/mutations/territoryMutations';

// Mock da camada de infraestrutura (Firebase) para não estourar erro de API Key no Jest
jest.mock('../lib/services/shared_lists', () => ({
    createSharedList: jest.fn().mockResolvedValue({ success: true, id: 'mock-id' }),
    processSharedListAction: jest.fn()
}));

describe('Unit: Mutation Edge Input Guards', () => {

    it('should block execution and fail fast if congregationId is missing', async () => {
        const result = await assignTerritoryMutation({
            title: 'Teste',
            type: 'territory',
            items: ['T-001'],
            congregationId: '', // <-- Faltando
            assignedTo: 'USER-123', 
            assignedName: 'João'
        });

        expect(result.success).toBe(false);
        expect(result.code).toBe('MISSING_CONGREGATION');
    });

    it('should block execution and fail fast if no territories are selected', async () => {
        const result = await assignTerritoryMutation({
            title: 'Teste',
            type: 'territory',
            items: [],
            congregationId: 'CONG-123',
            assignedTo: 'USER-123', 
            assignedName: 'João',
            territories: [] // <-- Nenhum território na lista
        });

        expect(result.success).toBe(false);
        expect(result.message).toMatch(/Nenhum território selecionado/);
    });

});
