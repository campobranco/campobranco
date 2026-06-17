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

import * as admin from 'firebase-admin';
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
        expect(terrSnap.data()?.activeLinkId).toBe(result.id);
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

    test('Cenário 6: Conflito heterogêneo por invariância de domínio cross-key', async () => {
        // 1. Cria a primeira lista A para T-001 (Chave: T-001)
        const resultA = await createSharedList({
            title: 'Lista A',
            type: 'territory',
            items: ['T-001'],
            congregationId: 'CONG-XYZ',
            assignedTo: '',
            assignedName: '',
            territories: [{ id: 'T-001', name: 'T-001', status: 'Disponível' }]
        });
        expect(resultA.success).toBe(true);

        // 2. Tenta criar uma segunda lista B heterogênea (Chave: T-001_T-002) que tenta englobar T-001
        // Deve falhar com a regra de negócio TERRITORY_ALREADY_ASSIGNED
        const resultB = await createSharedList({
            title: 'Lista B',
            type: 'territory',
            items: ['T-001', 'T-002'],
            congregationId: 'CONG-XYZ',
            assignedTo: '',
            assignedName: '',
            territories: [
                { id: 'T-001', name: 'T-001', status: 'Emprestado' },
                { id: 'T-002', name: 'T-002', status: 'Disponível' }
            ]
        });

        expect(resultB.success).toBe(false);
        expect(resultB.code).toBe('TERRITORY_ALREADY_ASSIGNED');
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
