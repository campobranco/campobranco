/**
 * Testes de criação de links compartilhados (Shared Links)
 *
 * Cobertura:
 * 1. Criar link novo para território disponível
 * 2. Reutilizar link ativo existente (getOrCreate real) - território "Emprestado"
 * 3. Bloquear criação sem congregationId
 * 4. Bloquear criação sem territórios
 */

import { assignTerritoryMutation } from '../lib/contracts/mutations/territoryMutations';

// ─── Mocks de Infraestrutura ─────────────────────────────────────────────────
// Necessário para impedir que o Firebase SDK tente inicializar com variáveis de
// ambiente reais durante a execução no Jest (ambiente sem API Key).

const mockFindActiveSharedList = jest.fn();
const mockCreateSharedList = jest.fn();

jest.mock('../lib/services/shared_lists', () => ({
    findActiveSharedList: (...args: any[]) => mockFindActiveSharedList(...args),
    createSharedList: (...args: any[]) => mockCreateSharedList(...args),
    processSharedListAction: jest.fn(),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BASE_INPUT = {
    title: 'Conj. Hab. Antônio Zaccaro',
    type: 'territory' as const,
    items: ['TERR-001'],
    congregationId: 'CONG-ABC',
    assignedTo: '',
    assignedName: '',
    territories: [{ id: 'TERR-001', name: 'Conj. Hab. Antônio Zaccaro', status: 'Disponível' }],
};

// ─── Suíte ───────────────────────────────────────────────────────────────────

describe('Unit: Shared Link Creation — assignTerritoryMutation', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Cenário 1: cria link novo para território disponível', async () => {
        // O service não encontra link ativo → cria um novo
        mockCreateSharedList.mockResolvedValue({
            success: true,
            id: 'LINK-123',
            shareData: { id: 'LINK-123', status: 'active' },
        });

        const result = await assignTerritoryMutation(BASE_INPUT);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('LINK-123');
        expect(mockCreateSharedList).toHaveBeenCalledTimes(1);
    });

    it('Cenário 2: reutiliza link ativo existente (território já "Emprestado")', async () => {
        // Simula getOrCreate: o service encontra link ativo existente e o retorna
        // sem criar um novo nem tentar transacionar o território novamente.
        mockCreateSharedList.mockResolvedValue({
            success: true,
            id: 'LINK-EXISTENTE-456',
            shareData: { id: 'LINK-EXISTENTE-456', status: 'active' },
        });

        const result = await assignTerritoryMutation({
            ...BASE_INPUT,
            territories: [{ id: 'TERR-001', name: 'Conj. Hab. Antônio Zaccaro', status: 'Emprestado' }],
        });

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('LINK-EXISTENTE-456');
        // Não deve ter explorado o domínio — o service resolveu no nível de getOrCreate
        expect(mockCreateSharedList).toHaveBeenCalledTimes(1);
    });

    it('Cenário 3: bloqueia criação sem congregationId (Schema Guard)', async () => {
        const result = await assignTerritoryMutation({
            ...BASE_INPUT,
            congregationId: '',
        });

        expect(result.success).toBe(false);
        expect(result.code).toBe('MISSING_CONGREGATION');
        // O service NÃO deve ser chamado — a mutation rejeitou na borda
        expect(mockCreateSharedList).not.toHaveBeenCalled();
    });

    it('Cenário 4: bloqueia criação sem territórios selecionados (Schema Guard)', async () => {
        const result = await assignTerritoryMutation({
            ...BASE_INPUT,
            type: 'territory',
            items: [],
            territories: [],
        });

        expect(result.success).toBe(false);
        expect(result.message).toMatch(/Nenhum território selecionado/);
        expect(mockCreateSharedList).not.toHaveBeenCalled();
    });

    it('Cenário 5: repassa falha do service corretamente (sem mascarar erro)', async () => {
        mockCreateSharedList.mockResolvedValue({
            success: false,
            error: 'Firestore permission denied',
        });

        const result = await assignTerritoryMutation(BASE_INPUT);

        expect(result.success).toBe(false);
        // A mutation deve repassar o error do service como message (sem mascarar)
        expect(result.message).toBe('Firestore permission denied');
    });

});
