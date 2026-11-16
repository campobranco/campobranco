import { performGoogleSignIn } from '@/app/login/LoginClient';
import capacitorConfig from '@/capacitor.config';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';

jest.mock('@/lib/firebase', () => ({
    auth: { name: 'mock-web-auth' },
    db: {},
}));

jest.mock('@capacitor/core', () => ({
    Capacitor: {
        isNativePlatform: jest.fn(),
    },
}));

jest.mock('@capacitor-firebase/authentication', () => ({
    FirebaseAuthentication: {
        signInWithGoogle: jest.fn(),
        signOut: jest.fn(),
    },
}));

jest.mock('firebase/auth', () => ({
    GoogleAuthProvider: Object.assign(
        jest.fn().mockImplementation(() => ({
            addScope: jest.fn(),
            setCustomParameters: jest.fn(),
        })),
        {
            credential: jest.fn((idToken?: string | null, accessToken?: string | null) => ({
                providerId: 'google.com',
                idToken,
                accessToken,
            })),
        }
    ),
    signInWithCredential: jest.fn(),
    signInWithPopup: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
}));

describe('Autenticação Google Nativa (Capacitor + Firebase Web SDK Bridge)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('deve repassar a credencial nativa (idToken) para signInWithCredential no SDK Web quando em plataforma nativa', async () => {
        // Arrange
        const mockAuth = { name: 'mock-web-auth' } as any;
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
        (FirebaseAuthentication.signInWithGoogle as jest.Mock).mockResolvedValue({
            user: { uid: 'native-uid-123', email: 'publicador@campobranco.com' },
            credential: {
                idToken: 'mock-google-id-token',
                accessToken: 'mock-google-access-token',
            },
        });
        (signInWithCredential as jest.Mock).mockResolvedValue({
            user: { uid: 'native-uid-123', email: 'publicador@campobranco.com' },
        });

        // Act
        const result = await performGoogleSignIn(mockAuth);

        // Assert
        expect(FirebaseAuthentication.signInWithGoogle).toHaveBeenCalledTimes(1);
        expect(GoogleAuthProvider.credential).toHaveBeenCalledWith(
            'mock-google-id-token',
            'mock-google-access-token'
        );
        expect(signInWithCredential).toHaveBeenCalledWith(
            mockAuth,
            expect.objectContaining({
                idToken: 'mock-google-id-token',
                accessToken: 'mock-google-access-token',
            })
        );
        expect(result.user?.uid).toBe('native-uid-123');
    });

    it('deve rejeitar explicitamente (Teste Negativo / Anti-Fallback) se o login nativo não retornar idToken nem accessToken', async () => {
        // Arrange
        const mockAuth = { name: 'mock-web-auth' } as any;
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
        (FirebaseAuthentication.signInWithGoogle as jest.Mock).mockResolvedValue({
            user: { uid: 'native-uid-123', email: 'publicador@campobranco.com' },
            credential: null,
        });

        // Act & Assert
        await expect(performGoogleSignIn(mockAuth)).rejects.toThrow(
            'Credencial Google inválida: idToken/accessToken ausente no retorno nativo.'
        );
        expect(signInWithCredential).not.toHaveBeenCalled();
    });

    it('deve utilizar signInWithPopup normalmente quando estiver no navegador Web/PWA', async () => {
        // Arrange
        const mockAuth = { name: 'mock-web-auth' } as any;
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
        (signInWithPopup as jest.Mock).mockResolvedValue({
            user: { uid: 'web-uid-456', email: 'web@campobranco.com' },
        });

        // Act
        const result = await performGoogleSignIn(mockAuth);

        // Assert
        expect(FirebaseAuthentication.signInWithGoogle).not.toHaveBeenCalled();
        expect(signInWithPopup).toHaveBeenCalledTimes(1);
        expect(result.user?.uid).toBe('web-uid-456');
    });

    it('deve declarar o provedor google.com na configuração do Capacitor para inicializar o GoogleAuthProviderHandler no Android', () => {
        // Arrange & Act
        const fbAuthPluginConfig = capacitorConfig.plugins?.FirebaseAuthentication;

        // Assert
        expect(fbAuthPluginConfig).toBeDefined();
        expect(fbAuthPluginConfig?.skipNativeAuth).toBe(false);
        expect(fbAuthPluginConfig?.providers).toContain('google.com');
    });
});
