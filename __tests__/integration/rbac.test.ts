
import { requireAuth } from '../../lib/auth';

// Mock Dependencies
jest.mock('next/headers', () => ({
    cookies: () => ({
        get: jest.fn().mockReturnValue({ value: 'mock-session-cookie' })
    })
}));

// Mock the local firebase-admin wrapper
jest.mock('../../lib/firebase-admin', () => {
    return {
        adminDb: {
            collection: (name: string) => ({
                doc: (id: string) => ({
                    get: jest.fn().mockImplementation(() => {
                        if (name === 'users' && id === 'test-user-id') {
                            return Promise.resolve({
                                exists: true,
                                data: () => ({
                                    role: 'PUBLICADOR',
                                    congregationId: 'cong-123'
                                })
                            });
                        }
                        return Promise.resolve({ exists: false });
                    })
                })
            })
        },
        adminAuth: {
            verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-user-id', email: 'test@example.com' }),
            verifySessionCookie: jest.fn().mockResolvedValue({ uid: 'test-user-id', email: 'test@example.com' })
        }
    };
});

// Mock react cache
jest.mock('react', () => ({
    ...jest.requireActual('react'),
    cache: (fn: any) => fn
}));

describe('Integration: RBAC (requireAuth)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should allow access if user has required role', async () => {
        const user = await requireAuth(['PUBLICADOR']);
        expect(user).toBeDefined();
        expect(user.role).toBe('PUBLICADOR');
    });

    it('should throw error if user lacks required role', async () => {
        // Changed expected error to "Forbidden" or "Unauthorized" matching lib/auth.ts
        await expect(requireAuth(['ANCIAO'])).rejects.toThrow('Forbidden');
    });
});
