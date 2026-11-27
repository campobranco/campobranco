jest.mock('@/lib/firebase', () => ({
    db: {},
}));

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    addDoc: jest.fn(),
    serverTimestamp: jest.fn(),
    runTransaction: jest.fn(),
    Timestamp: { fromDate: jest.fn() },
    orderBy: jest.fn(),
    limit: jest.fn(),
    writeBatch: jest.fn(),
}));

import {
    pickLatestVisitByAddress,
    resolveAddressStatusForLatestCycle,
} from '@/lib/services/shared_lists';

describe('Latest Visit Status Resolution', () => {
    it('pickLatestVisitByAddress seleciona a visita mais recente mesmo fora de ordem', () => {
        const visits = [
            {
                id: 'v1',
                addressId: 'addr-1',
                status: 'partial',
                createdAt: '2026-11-20T10:00:00.000Z',
            },
            {
                id: 'v2',
                addressId: 'addr-1',
                status: 'contacted',
                createdAt: { toMillis: () => Date.parse('2026-11-25T14:00:00.000Z') },
            },
            {
                id: 'v3',
                addressId: 'addr-1',
                status: 'notContacted',
                createdAt: { seconds: Math.floor(Date.parse('2026-11-22T09:00:00.000Z') / 1000) },
            },
        ];

        const latest = pickLatestVisitByAddress(visits);
        expect(latest.get('addr-1')?.id).toBe('v2');
        expect(latest.get('addr-1')?.status).toBe('contacted');
    });

    it('resolveAddressStatusForLatestCycle retorna o status da visita do ciclo mais recente', () => {
        const latestMap = new Map<string, any>([
            [
                'addr-1',
                {
                    addressId: 'addr-1',
                    status: 'partial',
                    visitDate: '2026-11-27T10:00:00.000Z',
                },
            ],
        ]);

        const result = resolveAddressStatusForLatestCycle(
            { id: 'addr-1', visitStatus: 'contacted', lastVisitedAt: '2026-10-01T10:00:00.000Z' },
            latestMap
        );

        expect(result.visitStatus).toBe('partial');
        expect(result.lastVisitedAt).toBe('2026-11-27T10:00:00.000Z');
    });

    it('resolveAddressStatusForLatestCycle retorna none (neutro) quando endereço não foi visitado no ciclo mais recente', () => {
        const latestMap = new Map<string, any>();

        const result = resolveAddressStatusForLatestCycle(
            { id: 'addr-2', visitStatus: 'contacted', lastVisitedAt: '2026-10-01T10:00:00.000Z' },
            latestMap
        );

        expect(result.visitStatus).toBe('none');
    });

    it('resolveAddressStatusForLatestCycle preserva doNotVisit mesmo sem visita no ciclo atual', () => {
        const latestMap = new Map<string, any>();

        const result = resolveAddressStatusForLatestCycle(
            { id: 'addr-3', visitStatus: 'doNotVisit', lastVisitedAt: '2026-09-01T10:00:00.000Z' },
            latestMap
        );

        expect(result.visitStatus).toBe('doNotVisit');
    });
});
