import { ensureUserProfileMutation } from '../lib/contracts/mutations/authMutations';

// Mock do Firebase Firestore no Jest
jest.mock('firebase/firestore', () => ({
    doc: jest.fn().mockReturnValue('mock-doc-ref'),
    setDoc: jest.fn().mockResolvedValue(undefined),
    deleteDoc: jest.fn().mockResolvedValue(undefined),
    collection: jest.fn().mockReturnValue('mock-coll'),
    query: jest.fn().mockReturnValue('mock-query'),
    where: jest.fn().mockReturnValue('mock-where'),
    getDocs: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    serverTimestamp: jest.fn().mockReturnValue('mock-timestamp')
}));

jest.mock('../lib/firebase', () => ({
    db: {}
}));

jest.mock('../lib/services/audit_logs', () => ({
    logActivity: jest.fn()
}));

describe('AuthMutations - ensureUserProfileMutation', () => {

    it('deve permitir a criação de perfil quando displayName é null utilizando a parte inicial do email', async () => {
        const input = {
            uid: 'test-uid-123',
            email: 'usuario.teste@exemplo.com',
            displayName: null,
            masterEmail: 'master@exemplo.com'
        };

        const result = await ensureUserProfileMutation(input);

        expect(result.success).toBe(true);
    });

    it('deve permitir a criação de perfil quando displayName é uma string vazia', async () => {
        const input = {
            uid: 'test-uid-456',
            email: 'maria@exemplo.com',
            displayName: '   ',
            masterEmail: 'master@exemplo.com'
        };

        const result = await ensureUserProfileMutation(input);

        expect(result.success).toBe(true);
    });

    it('deve falhar se o email for nulo ou vazio', async () => {
        const input = {
            uid: 'test-uid-789',
            email: '',
            displayName: 'Novo Usuário',
            masterEmail: 'master@exemplo.com'
        };

        const result = await ensureUserProfileMutation(input);

        expect(result.success).toBe(false);
        expect(result.message).toMatch(/E-mail do usuário obrigatório/);
    });
});
