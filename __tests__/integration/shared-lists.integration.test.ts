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
import { createSharedList, findActiveSharedList, returnExpiredTerritoryAssignments } from '../../lib/services/shared_lists';

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
        const { signInAnonymously } = require('firebase/auth');
        
        await signInAnonymously(auth);

        // Garante que o UID criado é mapeado para o admin user no DB
        if (auth.currentUser) {
            await db.collection('users').doc(auth.currentUser.uid).set({
                name: 'Admin Tester',
                role: 'ADMIN',
                congregationId: 'CONG-XYZ'
            });
        }
    });

    // ─── SUÍTE DE REJEIÇÃO E GUARDS DE SCHEMA ──────────────────────────────

    describe('Guards de Validação e Rejeição Estrita (Negative Testing)', () => {

        test('Deve rejeitar a criação se o title estiver vazio ou apenas espaços', async () => {
            await expect(createSharedList({
                title: '',
                type: 'territory',
                items: ['T-001'],
                congregationId: 'CONG-XYZ',
                assignedTo: '',
                assignedName: ''
            })).rejects.toThrow('Título da lista compartilhada é obrigatório.');

            await expect(createSharedList({
                title: '   ',
                type: 'territory',
                items: ['T-001'],
                congregationId: 'CONG-XYZ',
                assignedTo: '',
                assignedName: ''
            })).rejects.toThrow('Título da lista compartilhada é obrigatório.');
        });

        test('Deve rejeitar a criação se o tipo da lista for inválido', async () => {
            await expect(createSharedList({
                title: 'Território T-001',
                type: 'INVALID_TYPE' as any,
                items: ['T-001'],
                congregationId: 'CONG-XYZ',
                assignedTo: '',
                assignedName: ''
            })).rejects.toThrow("Tipo de lista compartilhada inválido: 'INVALID_TYPE'.");
        });

        test('Deve rejeitar a criação se o congregationId for nulo ou vazio', async () => {
            await expect(createSharedList({
                title: 'Território T-001',
                type: 'territory',
                items: ['T-001'],
                congregationId: '',
                assignedTo: '',
                assignedName: ''
            })).rejects.toThrow('ID da congregação é obrigatório.');
        });

        test('Deve rejeitar a criação se a lista de itens estiver vazia', async () => {
            await expect(createSharedList({
                title: 'Território T-001',
                type: 'territory',
                items: [],
                congregationId: 'CONG-XYZ',
                assignedTo: '',
                assignedName: ''
            })).rejects.toThrow('Lista de itens compartilhados não pode estar vazia.');
        });

        test('Deve rejeitar a transação se referenciar território inexistente', async () => {
            const res = await createSharedList({
                title: 'Território Inexistente',
                type: 'territory',
                items: ['TERR-999'],
                congregationId: 'CONG-XYZ',
                assignedTo: '',
                assignedName: '',
                territories: [{ id: 'TERR-999', name: 'Inexistente', status: 'Disponível' }]
            });
            expect(res.success).toBe(false);
            expect(res.error).toBe('Território TERR-999 inexistente.');
        });

    });

    // ─── SUÍTE DE FLUXOS E PERSISTÊNCIA FIRESTORE ──────────────────────────

    describe('Validação de Persistência no Firestore Emulator', () => {

        test('Cenário 1: Criação normal de link compartilhado e persistência estrita no Firestore', async () => {
            const result = await createSharedList({
                title: 'Território T-001',
                type: 'territory',
                items: ['T-001'],
                congregationId: 'CONG-XYZ',
                assignedTo: '',
                assignedName: '',
                territories: [{ id: 'T-001', name: 'T-001', status: 'Disponível' }]
            });

            // Validações rigorosas de contrato
            expect(result.success).toBe(true);
            expect(result.id).toBe('T-001'); // ID determinístico de negócio

            // Leitura direta no Firestore para validar o documento gravado em shared_lists
            const listSnap = await db.collection('shared_lists').doc('T-001').get();
            expect(listSnap.exists).toBe(true);
            expect(listSnap.data()?.status).toBe('active');
            expect(listSnap.data()?.version).toBe(1);
            expect(listSnap.data()?.congregationId).toBe('CONG-XYZ');
            expect(listSnap.data()?.assignedAt).toBeDefined();

            // Validar se o documento em territories mudou para "Emprestado"
            const terrSnap = await db.collection('territories').doc('T-001').get();
            expect(terrSnap.data()?.status).toBe('Emprestado');
            expect(terrSnap.data()?.activeLinkId).toBe('T-001');

            // Validar se o snapshot em shared_list_snapshots foi gravado corretamente
            const snapDoc = await db.collection('shared_list_snapshots').doc('T-001_T-001').get();
            expect(snapDoc.exists).toBe(true);
            expect(snapDoc.data()?.sharedListId).toBe('T-001');
            expect(snapDoc.data()?.itemId).toBe('T-001');
            expect(snapDoc.data()?.type).toBe('territory');
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
            expect(multiResult.id).toBe('T-001_T-002'); // ID composto ordenado

            // 4. Tenta buscar link ativo com os mesmos itens na ordem inversa: [T-002, T-001]
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
            expect(result.id).toBe('T-003');

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

        test('Cenário 8: Processamento e devolução automática de designações expiradas (Idempotência e Métricas)', async () => {
            // 1. Cria uma lista compartilhada expirada no passado (expiresAt = 1 hora atrás)
            const expiredDate = new Date(Date.now() - 3600000);
            const result = await createSharedList({
                title: 'Lista Expirada Teste',
                type: 'territory',
                items: ['T-001'],
                congregationId: 'CONG-XYZ',
                assignedTo: 'user-123',
                assignedName: 'User Test',
                territories: [{ id: 'T-001', name: 'T-001', status: 'Disponível' }]
            });
            expect(result.success).toBe(true);

            // Força no Firestore o expiresAt no passado
            await db.collection('shared_lists').doc(result.id).update({
                expiresAt: admin.firestore.Timestamp.fromDate(expiredDate)
            });

            // 2. Executa a função de devolução automática
            const stats = await returnExpiredTerritoryAssignments('CONG-XYZ');

            expect(stats.foundCount).toBeGreaterThanOrEqual(1);
            expect(stats.processedCount).toBeGreaterThanOrEqual(1);
            expect(stats.errorCount).toBe(0);
            expect(typeof stats.hasMore).toBe('boolean');
            expect(typeof stats.durationMs).toBe('number');

            // Verifica que o território T-001 foi desvinculado e voltou a "Disponível"
            const terrSnap = await db.collection('territories').doc('T-001').get();
            expect(terrSnap.data()?.status).toBe('Disponível');

            // Verifica que a lista passou para "completed"
            const listSnap = await db.collection('shared_lists').doc(result.id).get();
            expect(listSnap.data()?.status).toBe('completed');

            // 3. Execução secundária para testar Idempotência estrita (deve encontrar 0 listas ativas expiradas)
            const secondRunStats = await returnExpiredTerritoryAssignments('CONG-XYZ');
            expect(secondRunStats.foundCount).toBe(0);
            expect(secondRunStats.processedCount).toBe(0);
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
