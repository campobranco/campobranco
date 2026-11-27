import { saveAddress } from '@/lib/services/addresses';
import { getDoc, writeBatch } from 'firebase/firestore';

jest.mock('@/lib/firebase', () => ({
    db: { __isMockDb: true },
}));

jest.mock('@/lib/services/audit_logs', () => ({
    logActivity: jest.fn().mockResolvedValue(undefined),
}));

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

jest.mock('firebase/firestore', () => ({
    collection: jest.fn((_db, name) => ({ __collection: name })),
    doc: jest.fn((colOrDb, nameOrId, maybeId) => {
        if (typeof maybeId === 'string') {
            return { id: maybeId, path: `${nameOrId}/${maybeId}` };
        }
        if (typeof nameOrId === 'string') {
            return { id: nameOrId, path: nameOrId };
        }
        return { id: 'new-address-id', path: 'addresses/new-address-id' };
    }),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
    increment: jest.fn((val) => ({ __increment: val })),
    writeBatch: jest.fn(() => ({
        set: mockBatchSet,
        update: mockBatchUpdate,
        delete: mockBatchDelete,
        commit: mockBatchCommit,
    })),
}));

describe('saveAddress', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('deve criar endereço com street completo sem exigir number', async () => {
        const result = await saveAddress(null, {
            street: 'R. Alamo, 136 - Conjunto Habitacional',
            congregationId: 'cong-1',
            cityId: 'city-1',
            territoryId: 'terr-1',
        });

        expect(result).toEqual({ success: true, id: 'new-address-id' });
        expect(writeBatch).toHaveBeenCalledTimes(1);
        expect(mockBatchSet).toHaveBeenCalledTimes(2);
        expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('deve falhar na criação se street estiver ausente ou vazio', async () => {
        const result = await saveAddress(null, {
            street: '   ',
            congregationId: 'cong-1',
        });

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/street/i);
        expect(mockBatchCommit).not.toHaveBeenCalled();
    });

    it('deve falhar na criação se congregationId estiver ausente', async () => {
        const result = await saveAddress(null, {
            street: 'R. Alamo, 136',
            congregationId: '',
        });

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/congregationId/i);
        expect(mockBatchCommit).not.toHaveBeenCalled();
    });

    it('deve permitir edição parcial (inativação) e atualizar stats usando oldData.cityId', async () => {
        (getDoc as jest.Mock).mockResolvedValueOnce({
            exists: () => true,
            data: () => ({
                street: 'R. Alamo, 136',
                congregationId: 'cong-1',
                cityId: 'city-1',
                isActive: true,
            }),
        });

        const result = await saveAddress('addr-1', {
            isActive: false,
            inactivatedAt: '2026-11-26T17:00:00.000Z',
        });

        expect(result).toEqual({ success: true, id: 'addr-1' });
        expect(mockBatchUpdate).toHaveBeenCalledTimes(1);
        expect(mockBatchSet).toHaveBeenCalledWith(
            { id: 'city-1', path: 'cities/city-1' },
            { stats: { totalAddresses: { __increment: -1 } } },
            { merge: true }
        );
        expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('deve falhar na edição se street for enviado explicitamente vazio', async () => {
        const result = await saveAddress('addr-1', {
            street: '   ',
        });

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/street/i);
        expect(mockBatchCommit).not.toHaveBeenCalled();
    });
});
