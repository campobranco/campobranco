// Configura variáveis de ambiente do emulador explicitamente antes de conectar ao db
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

// Configura variáveis fictícias do Firebase Client SDK para inicializar no Jest
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'mock-api-key-for-emulator-testing-only';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-test';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'demo-test.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'demo-test.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '1234567890';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:1234567890:web:mockappid';
process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID = '(default)';

import admin from 'firebase-admin';
import { createSharedList, findActiveSharedList } from '../../lib/services/shared_lists';

// Inicializa o app admin do Firebase caso não esteja inicializado
if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'demo-test' });
}

const db = admin.firestore();

describe('Integration: Shared Links — Firestore Emulator', () => {

    beforeEach(async () => {
        // Limpar o banco de dados do Firestore no Emulator antes de cada teste
        const response = await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-test/databases/(default)/documents', {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`Failed to clear emulator database: ${response.statusText}`);
        }

        // Criar dados mínimos necessários para os testes
        const batch = db.batch();
        
        // T-001 e T-002 disponíveis
        batch.set(db.collection('territories').doc('T-001'), {
            id: 'T-001',
            name: 'T-001',
            status: 'Disponível',
            activeLinkId: null,
            congregationId: 'CONG-XYZ'
        });
        batch.set(db.collection('territories').doc('T-002'), {
            id: 'T-002',
            name: 'T-002',
            status: 'Disponível',
            activeLinkId: null,
            congregationId: 'CONG-XYZ'
        });

        // T-003 orfão (Emprestado mas sem qualquer shared_list ativa associada)
        batch.set(db.collection('territories').doc('T-003'), {
            id: 'T-003',
            name: 'T-003',
            status: 'Emprestado',
            activeLinkId: null, // Sem link ativo mapeado = órfão
            congregationId: 'CONG-XYZ'
        });

        // Usuário autenticado para passar pelas firestore.rules
        batch.set(db.collection('users').doc('user-123'), {
            name: 'User Test',
            role: 'ADMIN',
            congregationId: 'CONG-XYZ'
        });

        await batch.commit();

        // Faz login mockado no Firebase Auth Client para passar nos rules do Firestore Emulator
        const { auth } = require('../../lib/firebase');
        const { signInWithCustomToken } = require('firebase/auth');
        
        // No emulador de auth podemos usar signInAnonymously ou criar um usuário customizado,
        // mas o emulador permite sign-in com credenciais básicas/customizadas sem verificação estrita.
        // Vamos usar um helper direto para injetar as propriedades auth no client.
        // Como o Firestore no emulador do client confia na sessão ativa do SDK Auth client:
        const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
        try {
            await createUserWithEmailAndPassword(auth, 'teste@campobranco.com', 'senha123');
        } catch {
            await signInWithEmailAndPassword(auth, 'teste@campobranco.com', 'senha123');
        }

        // Garante que o UID criado é mapeado para o admin user no DB
        if (auth.currentUser) {
            await db.collection('users').doc(auth.currentUser.uid).set({
                name: 'Admin Tester',
                role: 'ADMIN',
                congregationId: 'CONG-XYZ'
            });
        }
    });

    test('Cenário 1: Criação normal de link compartilhado para território disponível', async () => {
        const result = await createSharedList({
            title: 'Território T-001',
            type: 'territory',
            items: ['T-001'],
            congregationId: 'CONG-XYZ',
            assignedTo: '',
            assignedName: '',
            territories: [{ id: 'T-001', name: 'T-001', status: 'Disponível' }]
        });

        expect(result.success).toBe(true);
        expect(result.id).toBeDefined();

        // Validar se o território foi atualizado para "Emprestado"
        const terrSnap = await db.collection('territories').doc('T-001').get();
        expect(terrSnap.data()?.status).toBe('Emprestado');
    });

    test('Cenário 2: Reutilização de link ativo existente (getOrCreate)', async () => {
        // 1. Cria o primeiro link
        const first = await createSharedList({
            title: 'Território T-001',
            type: 'territory',
            items: ['T-001'],
            congregationId: 'CONG-XYZ',
            assignedTo: '',
            assignedName: '',
            territories: [{ id: 'T-001', name: 'T-001', status: 'Disponível' }]
        });
        expect(first.success).toBe(true);

        // 2. Tenta criar novamente para o mesmo território (mesmo que ele esteja "Emprestado" agora)
        const second = await createSharedList({
            title: 'Território T-001',
            type: 'territory',
            items: ['T-001'],
            congregationId: 'CONG-XYZ',
            assignedTo: '',
            assignedName: '',
            territories: [{ id: 'T-001', name: 'T-001', status: 'Emprestado' }]
        });

        expect(second.success).toBe(true);
        expect(second.id).toBe(first.id); // Deve reusar o ID do primeiro link criado
    });

    test('Cenário 3: Multi-territórios exatos (conjuntos ordenados)', async () => {
        // 1. Cria link contendo apenas T-001
        await createSharedList({
            title: 'Apenas T-001',
            type: 'territory',
            items: ['T-001'],
            congregationId: 'CONG-XYZ',
            assignedTo: '',
            assignedName: '',
            territories: [{ id: 'T-001', name: 'T-001', status: 'Disponível' }]
        });

        // 2. Redefine o status de T-001 no banco para Disponível e limpa o activeLinkId para permitir a criação do link combinado de múltiplos territórios
        await db.collection('territories').doc('T-001').update({ status: 'Disponível', activeLinkId: null });

        // 3. Cria link para [T-001, T-002]
        const multiResult = await createSharedList({
            title: 'Multi T-001 e T-002',
            type: 'territory',
            items: ['T-001', 'T-002'],
            congregationId: 'CONG-XYZ',
            assignedTo: '',
            assignedName: '',
            territories: [
                { id: 'T-001', name: 'T-001', status: 'Disponível' },
                { id: 'T-002', name: 'T-002', status: 'Disponível' }
            ]
        });

        expect(multiResult.success).toBe(true);

        // 3. Tenta buscar link ativo com os mesmos itens na ordem inversa: [T-002, T-001]
        const recovered = await findActiveSharedList(['T-002', 'T-001'], 'CONG-XYZ');
        expect(recovered).not.toBeNull();
        expect(recovered?.id).toBe(multiResult.id); // Deve encontrar pois o set de itens é idêntico
    });

    test('Cenário 4: Identificação e Recomposição de estado órfão (Self-Healing Transacional Silencioso V15)', async () => {
        // T-003 está cadastrado como "Emprestado" mas não possui link ativo associado (estado órfão/inconsistente).
        // Sob a V15, a inconsistência é recomposta silenciosamente e a transação conclui a criação com sucesso.
        const result = await createSharedList({
            title: 'Território T-003',
            type: 'territory',
            items: ['T-003'],
            congregationId: 'CONG-XYZ',
            assignedTo: '',
            assignedName: '',
            territories: [{ id: 'T-003', name: 'T-003', status: 'Emprestado' }]
        });

        expect(result.success).toBe(true);
        expect(result.id).toBeDefined();

        // Garante que o território foi atualizado corretamente no Firestore pós auto-recomposição
        const terrSnap = await db.collection('territories').doc('T-003').get();
        expect(terrSnap.data()?.status).toBe('Emprestado');
        expect(terrSnap.data()?.activeLinkIds).toContain(result.id);
    });

    test('Cenário 5: Concorrência simultânea (Race Condition Recovery)', async () => {
        // Dispara simultaneamente duas tentativas de criação de link para o território T-001 disponível.
        const [resA, resB] = await Promise.all([
            createSharedList({
                title: 'Território T-001',
                type: 'territory',
                items: ['T-001'],
                congregationId: 'CONG-XYZ',
                assignedTo: '',
                assignedName: '',
                territories: [{ id: 'T-001', name: 'T-001', status: 'Disponível' }]
            }),
            createSharedList({
                title: 'Território T-001',
                type: 'territory',
                items: ['T-001'],
                congregationId: 'CONG-XYZ',
                assignedTo: '',
                assignedName: '',
                territories: [{ id: 'T-001', name: 'T-001', status: 'Disponível' }]
            })
        ]);

        expect(resA.success).toBe(true);
        expect(resB.success).toBe(true);
        expect(resA.id).toBe(resB.id); // Ambos devem terminar apontando para o mesmo ID único
    });

    test('Cenário 6: Permissão de designação concorrente múltipla', async () => {
        // 1. Cria a primeira lista A para T-001 (Chave: T-001)
        const resultA = await createSharedList({
            title: 'Lista A',
            type: 'territory',
            items: ['T-001'],
            congregationId: 'CONG-XYZ',
            assignedTo: 'user-001',
            assignedName: 'User 001',
            territories: [{ id: 'T-001', name: 'T-001', status: 'Disponível' }]
        });
        expect(resultA.success).toBe(true);

        // 2. Tenta criar uma segunda lista B heterogênea (Chave: T-001_T-002) que tenta englobar T-001 para outro usuário
        const resultB = await createSharedList({
            title: 'Lista B',
            type: 'territory',
            items: ['T-001', 'T-002'],
            congregationId: 'CONG-XYZ',
            assignedTo: 'user-002',
            assignedName: 'User 002',
            territories: [
                { id: 'T-001', name: 'T-001', status: 'Emprestado' },
                { id: 'T-002', name: 'T-002', status: 'Disponível' }
            ]
        });

        expect(resultB.success).toBe(true);

        // O território T-001 deve conter ambos os IDs de links ativos em activeLinkIds
        const terrSnap = await db.collection('territories').doc('T-001').get();
        const activeLinkIds = terrSnap.data()?.activeLinkIds || [];
        expect(activeLinkIds).toContain(resultA.id);
        expect(activeLinkIds).toContain(resultB.id);
    });

    test('Cenário 7: Ciclo completo de vida de estado e reusabilidade temporal', async () => {
        const { processSharedListAction } = require('../../lib/services/shared_lists');

        // 1. Cria lista ativa para T-001
        const result = await createSharedList({
            title: 'Lista Ativa',
            type: 'territory',
            items: ['T-001'],
            congregationId: 'CONG-XYZ',
            assignedTo: 'user-123',
            assignedName: 'User Test',
            territories: [{ id: 'T-001', name: 'T-001', status: 'Disponível' }]
        });
        expect(result.success).toBe(true);

        // 2. Devolve o mapa (completa a transição do lifecycle temporal, limpando locks e status)
        const actionResult = await processSharedListAction(result.id, 'returnMap', {
            userId: 'user-123',
            currentUserRole: 'ADMIN'
        });
        expect(actionResult.success).toBe(true);

        // Verifica que o território foi limpo no Firestore e voltou para "Disponível"
        const terrSnap = await db.collection('territories').doc('T-001').get();
        expect(terrSnap.data()?.status).toBe('Disponível');
        expect(terrSnap.data()?.activeLinkId).toBeNull();

        // 3. Tenta recriar uma nova lista B usando o mesmo território T-001 (deve permitir normalmente)
        const newResult = await createSharedList({
            title: 'Lista Reatribuída',
            type: 'territory',
            items: ['T-001'],
            congregationId: 'CONG-XYZ',
            assignedTo: 'user-123',
            assignedName: 'User Test',
            territories: [{ id: 'T-001', name: 'T-001', status: 'Disponível' }]
        });
        expect(newResult.success).toBe(true);
        expect(newResult.id).toBe(result.id); // O ID determinístico permanece idêntico (chave de negócio)

        // Valida que a nova versão física (CAS) foi gravada no documento determinístico
        const listSnap = await db.collection('shared_lists').doc(newResult.id).get();
        expect(listSnap.data()?.version).toBe(2); // Era versão 1, agora deve ser versão 2 (CAS Versionado)
    });

    // -----------------------------------------------------------------
    // TESTES DE REGRAS DE SEGURANÇA (FIRESTORE RULES)
    // -----------------------------------------------------------------

    describe('Firestore Security Rules', () => {
        let clientAuth: any;
        let clientDb: any;
        const { doc: cDoc, setDoc: cSetDoc, updateDoc: cUpdateDoc, getDoc: cGetDoc, collection: cCollection } = require('firebase/firestore');
        const { signOut: cSignOut, createUserWithEmailAndPassword: cCreateUser, signInWithEmailAndPassword: cSignIn } = require('firebase/auth');

        beforeAll(() => {
            const firebaseModule = require('../../lib/firebase');
            clientAuth = firebaseModule.auth;
            clientDb = firebaseModule.db;
        });

        beforeEach(async () => {
            // Garante que o client auth está deslogado
            if (clientAuth.currentUser) {
                await cSignOut(clientAuth);
            }
        });

        // Helper para criar e logar um usuário com determinado papel e congregação
        const setupTestUser = async (email: string, role: string, congregationId: string) => {
            let credential;
            try {
                credential = await cCreateUser(clientAuth, email, 'senha123');
            } catch {
                credential = await cSignIn(clientAuth, email, 'senha123');
            }
            
            const uid = credential.user.uid;
            
            // Grava o perfil via Admin SDK (bypassing rules)
            await db.collection('users').doc(uid).set({
                name: 'Security Test User',
                email: email,
                role: role,
                congregationId: congregationId,
                permissions: {}
            });

            return uid;
        };

        test('Negativo: Criar perfil de usuário diretamente com role: ADMIN deve falhar', async () => {
            const credential = await cCreateUser(clientAuth, 'hacker_admin@test.com', 'senha123');
            const userRef = cDoc(clientDb, 'users', credential.user.uid);

            await expect(
                cSetDoc(userRef, {
                    name: 'Hacker',
                    email: 'hacker_admin@test.com',
                    role: 'ADMIN',
                    congregationId: 'CONG-A'
                })
            ).rejects.toThrow(/permission/i);
        });

        test('Positivo: Criar perfil de usuário diretamente com role: PUBLICADOR deve passar', async () => {
            const credential = await cCreateUser(clientAuth, 'legit_pub@test.com', 'senha123');
            const userRef = cDoc(clientDb, 'users', credential.user.uid);

            await expect(
                cSetDoc(userRef, {
                    name: 'Novo Membro',
                    email: 'legit_pub@test.com',
                    role: 'PUBLICADOR',
                    congregationId: null
                })
            ).resolves.not.toThrow();
        });

        test('Negativo: Usuário comum tentando alterar sua própria role de PUBLICADOR para ADMIN deve falhar', async () => {
            const uid = await setupTestUser('user_common@test.com', 'PUBLICADOR', 'CONG-A');
            const userRef = cDoc(clientDb, 'users', uid);

            await expect(
                cUpdateDoc(userRef, {
                    role: 'ADMIN'
                })
            ).rejects.toThrow(/permission/i);
        });

        test('Negativo: Usuário comum tentando alterar seu congregationId deve falhar', async () => {
            const uid = await setupTestUser('user_common@test.com', 'PUBLICADOR', 'CONG-A');
            const userRef = cDoc(clientDb, 'users', uid);

            await expect(
                cUpdateDoc(userRef, {
                    congregationId: 'CONG-B'
                })
            ).rejects.toThrow(/permission/i);
        });

        test('Negativo: Alterar o email para valor diferente do contido no token Auth deve falhar', async () => {
            const uid = await setupTestUser('user_common@test.com', 'PUBLICADOR', 'CONG-A');
            const userRef = cDoc(clientDb, 'users', uid);

            await expect(
                cUpdateDoc(userRef, {
                    email: 'hacker_mail@test.com'
                })
            ).rejects.toThrow(/permission/i);
        });

        test('Negativo: Alterar e-mail válido mas tentar alterar role na mesma transação deve falhar', async () => {
            const uid = await setupTestUser('user_common@test.com', 'PUBLICADOR', 'CONG-A');
            const userRef = cDoc(clientDb, 'users', uid);

            await expect(
                cUpdateDoc(userRef, {
                    email: 'user_common@test.com',
                    role: 'ADMIN'
                })
            ).rejects.toThrow(/permission/i);
        });

        test('Positivo: Sincronizar e-mail correto com o Auth token mantendo demais campos deve passar', async () => {
            const uid = await setupTestUser('user_common@test.com', 'PUBLICADOR', 'CONG-A');
            const userRef = cDoc(clientDb, 'users', uid);

            await expect(
                cUpdateDoc(userRef, {
                    email: 'user_common@test.com',
                    name: 'Novo Nome'
                })
            ).resolves.not.toThrow();
        });

        test('Negativo: Usuário da CONG-A tentando criar visita para CONG-B deve falhar', async () => {
            await setupTestUser('user_a@test.com', 'PUBLICADOR', 'CONG-A');
            const visitRef = cDoc(cCollection(clientDb, 'visits'));

            await expect(
                cSetDoc(visitRef, {
                    addressId: 'ADDR-1',
                    congregationId: 'CONG-B',
                    status: 'contacted'
                })
            ).rejects.toThrow(/permission/i);
        });

        test('Negativo: Usuário da CONG-A tentando ler visita da CONG-B deve falhar', async () => {
            await setupTestUser('user_a@test.com', 'PUBLICADOR', 'CONG-A');

            // Cria a visita da CONG-B via Admin SDK
            await db.collection('visits').doc('visit-b').set({
                addressId: 'ADDR-B',
                congregationId: 'CONG-B',
                status: 'contacted'
            });

            const visitRef = cDoc(clientDb, 'visits', 'visit-b');

            await expect(
                cGetDoc(visitRef)
            ).rejects.toThrow();
        });

        test('Negativo: Usuário da CONG-A tentando alterar o congregationId de uma visita existente deve falhar', async () => {
            await setupTestUser('user_a@test.com', 'PUBLICADOR', 'CONG-A');

            // Cria a visita da CONG-A via Admin SDK
            await db.collection('visits').doc('visit-a').set({
                addressId: 'ADDR-A',
                congregationId: 'CONG-A',
                status: 'contacted'
            });

            const visitRef = cDoc(clientDb, 'visits', 'visit-a');

            await expect(
                cUpdateDoc(visitRef, {
                    congregationId: 'CONG-B'
                })
            ).rejects.toThrow();
        });

        test('Negativo: Usuário da CONG-A tentando ler histórico de endereço pertencente a CONG-B deve falhar', async () => {
            await setupTestUser('user_a@test.com', 'PUBLICADOR', 'CONG-A');

            // Cria endereço da CONG-B no Admin
            await db.collection('addresses').doc('addr-b').set({
                street: 'Rua B',
                congregationId: 'CONG-B'
            });

            // Cria histórico sob o endereço da CONG-B
            await db.collection('addresses').doc('addr-b').collection('history').doc('hist-1').set({
                notes: 'Visita anterior'
            });

            const histRef = cDoc(clientDb, 'addresses', 'addr-b', 'history', 'hist-1');

            await expect(
                cGetDoc(histRef)
            ).rejects.toThrow();
        });

        test('Negativo: Usuário da CONG-A tentando gravar itens em lista compartilhada da CONG-B deve falhar', async () => {
            await setupTestUser('user_a@test.com', 'PUBLICADOR', 'CONG-A');

            // Cria lista da CONG-B
            await db.collection('shared_lists').doc('list-b').set({
                title: 'Mapa B',
                congregationId: 'CONG-B'
            });

            const itemRef = cDoc(clientDb, 'shared_lists', 'list-b', 'items', 'item-1');

            await expect(
                cSetDoc(itemRef, {
                    addressId: 'addr-1',
                    worked: true
                })
            ).rejects.toThrow(/permission/i);
        });

        // --- TESTES POSITIVOS DE MESMA CONGREGAÇÃO ---

        test('Positivo: Usuário da CONG-A criando visita para CONG-A deve passar', async () => {
            await setupTestUser('user_a@test.com', 'PUBLICADOR', 'CONG-A');
            const visitRef = cDoc(cCollection(clientDb, 'visits'));

            await expect(
                cSetDoc(visitRef, {
                    addressId: 'ADDR-A',
                    congregationId: 'CONG-A',
                    status: 'contacted'
                })
            ).resolves.not.toThrow();
        });

        test('Positivo: Usuário da CONG-A lendo visita da CONG-A deve passar', async () => {
            await setupTestUser('user_a@test.com', 'PUBLICADOR', 'CONG-A');

            // Cria a visita da CONG-A via Admin SDK
            await db.collection('visits').doc('visit-a-read').set({
                addressId: 'ADDR-A',
                congregationId: 'CONG-A',
                status: 'contacted'
            });

            const visitRef = cDoc(clientDb, 'visits', 'visit-a-read');
            const snap = await cGetDoc(visitRef);
            expect(snap.exists()).toBe(true);
            expect(snap.data().congregationId).toBe('CONG-A');
        });

        test('Positivo: Usuário da CONG-A lendo histórico de endereço da CONG-A deve passar', async () => {
            await setupTestUser('user_a@test.com', 'PUBLICADOR', 'CONG-A');

            // Cria endereço da CONG-A no Admin
            await db.collection('addresses').doc('addr-a').set({
                street: 'Rua A',
                congregationId: 'CONG-A'
            });

            // Cria histórico sob o endereço da CONG-A
            await db.collection('addresses').doc('addr-a').collection('history').doc('hist-a').set({
                notes: 'Visita ok'
            });

            const histRef = cDoc(clientDb, 'addresses', 'addr-a', 'history', 'hist-a');
            const snap = await cGetDoc(histRef);
            expect(snap.exists()).toBe(true);
        });
    });

    afterAll(async () => {
        // Desconecta e encerra instâncias abertas para evitar leaks de conexão no Jest
        const { deleteApp } = require('firebase/app');
        const { auth, app } = require('../../lib/firebase');
        
        if (auth.currentUser) {
            await auth.signOut();
        }
        await deleteApp(app);
        await admin.app().delete();
    });

});
