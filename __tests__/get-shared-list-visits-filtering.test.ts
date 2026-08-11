import { getSharedListWithData } from '../lib/services/shared_lists';
import { getDoc, getDocs } from 'firebase/firestore';

// Mock do Firestore para testar a função getSharedListWithData sem rede externa
jest.mock('firebase/firestore', () => ({
    doc: jest.fn().mockReturnValue('mock-doc-ref'),
    collection: jest.fn().mockReturnValue('mock-coll-ref'),
    query: jest.fn().mockReturnValue('mock-query-ref'),
    where: jest.fn().mockReturnValue('mock-where-clause'),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
}));

jest.mock('../lib/firebase', () => ({
    db: {}
}));

describe('Unit: getSharedListWithData — Cycle Visit Filtering', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('deve filtrar e excluir visitas de designações anteriores (createdAt < assignedAt)', async () => {
        // Data da atribuição atual do link: 11 de Agosto de 2026 às 14:00:00
        const currentAssignedAt = new Date('2026-08-11T14:00:00.000Z');

        // Mock da shared_list no Firestore
        (getDoc as jest.Mock).mockImplementation((docRef: any) => {
            if (docRef === 'mock-doc-ref') {
                return Promise.resolve({
                    exists: () => true,
                    id: 'link-territorio-1',
                    data: () => ({
                        title: 'Território 1',
                        congregationId: 'CONG-001',
                        assignedAt: currentAssignedAt,
                        status: 'active'
                    })
                });
            }
            // Retorna congregação para tipo TRADITIONAL
            return Promise.resolve({
                exists: () => true,
                data: () => ({ category: 'TRADITIONAL' })
            });
        });

        // Mock dos snapshots e das visitas no Firestore
        (getDocs as jest.Mock).mockImplementation((queryRef: any) => {
            // Chamada 1: Snapshots
            // Retorna lista de snapshots
            if ((getDocs as jest.Mock).mock.calls.length === 1) {
                return Promise.resolve({
                    docs: [
                        {
                            id: 'snap-1',
                            data: () => ({ itemId: 'addr-1', type: 'address', data: { street: 'Rua A', number: '10' } })
                        }
                    ]
                });
            }

            // Chamada 2: Visitas
            // Retorna 1 visita antiga (ciclo passado) e 1 visita recente (ciclo atual)
            return Promise.resolve({
                docs: [
                    {
                        id: 'visit-old',
                        data: () => ({
                            addressId: 'addr-1',
                            status: 'contacted',
                            notes: 'Visita antiga do ciclo passado',
                            createdAt: new Date('2026-08-01T10:00:00.000Z') // <-- ANTES do assignedAt atual
                        })
                    },
                    {
                        id: 'visit-current',
                        data: () => ({
                            addressId: 'addr-1',
                            status: 'notContacted',
                            notes: 'Visita da nova designação',
                            createdAt: new Date('2026-08-11T15:30:00.000Z') // <-- DEPOIS do assignedAt atual
                        })
                    }
                ]
            });
        });

        const result = await getSharedListWithData('link-territorio-1');

        expect(result.success).toBe(true);
        expect(result.visits).toHaveLength(1);
        expect(result.visits![0].id).toBe('visit-current');
        expect(result.visits![0].notes).toBe('Visita da nova designação');
    });

    it('deve retornar todas as visitas se assignedAt for nulo/ausente (compatibilidade legado)', async () => {
        (getDoc as jest.Mock).mockImplementation(() => Promise.resolve({
            exists: () => true,
            id: 'link-legacy',
            data: () => ({ title: 'Território Legado', congregationId: 'CONG-001' })
        }));

        (getDocs as jest.Mock).mockImplementation(() => Promise.resolve({
            docs: [
                { id: 'v1', data: () => ({ addressId: 'a1', status: 'contacted' }) },
                { id: 'v2', data: () => ({ addressId: 'a2', status: 'partial' }) }
            ]
        }));

        const result = await getSharedListWithData('link-legacy');

        expect(result.success).toBe(true);
        expect(result.visits).toHaveLength(2);
    });

});
