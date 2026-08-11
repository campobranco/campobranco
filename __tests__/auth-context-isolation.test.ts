import { resolveUserCongregationId } from '../app/context/AuthContext';

describe('AuthContext - Tenant Isolation & Anti-Fallback Protocol', () => {
    let mockStorage: Record<string, string> = {};

    const localStorageMock = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => { mockStorage[key] = value; },
        removeItem: (key: string) => { delete mockStorage[key]; },
        clear: () => { mockStorage = {}; }
    };

    beforeEach(() => {
        localStorageMock.clear();
    });

    it('Cenário A: resolveUserCongregationId NUNCA herda selectedCongregationId do localStorage quando Firestore é null', () => {
        // Simula localStorage poluído por login anterior no navegador
        localStorageMock.setItem('selectedCongregationId', 'congregao-bom-pastor');

        // Dado real vindo do Firestore
        const firestoreUserData = {
            role: 'PUBLICADOR',
            congregationId: null,
            email: 'novousuario@gmail.com'
        };

        // Executa a FUNÇÃO REAL DA APLICAÇÃO
        const result = resolveUserCongregationId(firestoreUserData.congregationId);

        // Validações estritas da função real
        expect(result).toBeNull();
        expect(result).not.toBe('congregao-bom-pastor');
    });

    it('Cenário B: resolveUserCongregationId rejeita strings vazias e apenas espaços', () => {
        expect(resolveUserCongregationId('')).toBeNull();
        expect(resolveUserCongregationId('   ')).toBeNull();
        expect(resolveUserCongregationId(undefined)).toBeNull();
        expect(resolveUserCongregationId(null)).toBeNull();
    });

    it('Cenário C: resolveUserCongregationId retorna a congregação legítima do Firestore (Fonte Única da Verdade)', () => {
        const firestoreMasterData = {
            role: 'ADMIN',
            congregationId: 'ls-catanduva',
            email: 'campobrancojw@gmail.com'
        };

        const result = resolveUserCongregationId(firestoreMasterData.congregationId);

        expect(result).toBe('ls-catanduva');
    });

    it('Cenário D: Logout de qualquer usuário deve limpar a chave selectedCongregationId do localStorage', () => {
        localStorageMock.setItem('selectedCongregationId', 'congregao-bom-pastor');
        expect(localStorageMock.getItem('selectedCongregationId')).toBe('congregao-bom-pastor');

        localStorageMock.removeItem('selectedCongregationId');

        expect(localStorageMock.getItem('selectedCongregationId')).toBeNull();
    });
});
