/**
 * scripts/migrate-users.ts
 * Script para migrar a coleção 'users' entre bancos de dados Firestore.
 * Origem: (default)
 * Destino: default
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });

const rawProjectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const rawClientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL || '';
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY || '';

const projectId = rawProjectId.replace(/^["']|["']$/g, '').trim();
const clientEmail = rawClientEmail.replace(/^["']|["']$/g, '').trim();
let privateKey = rawPrivateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim();

if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;

const app = initializeApp({
    credential: cert({
        project_id: projectId,
        client_email: clientEmail,
        private_key: privateKey,
    } as any),
    projectId
}, 'migrator'); // Nome único para evitar conflitos

// Instâncias para os dois bancos
const dbOld = getFirestore(app, '(default)');
const dbNew = getFirestore(app, 'default');

async function migrateUsers() {
    console.log('🚀 Iniciando migração de USUÁRIOS...');
    
    try {
        const usersSnap = await dbOld.collection('users').get();
        if (usersSnap.empty) {
            console.log('⚠️ Nenhum usuário encontrado no banco legado.');
            return;
        }

        console.log(`📦 Encontrados ${usersSnap.size} usuários. Migrando...`);

        const batchSize = 100;
        let count = 0;

        for (const doc of usersSnap.docs) {
            const userData = doc.data();
            // Mantém os IDs originais (UIDs do Firebase Auth)
            await dbNew.collection('users').doc(doc.id).set(userData);
            count++;
            if (count % batchSize === 0) console.log(`  - ${count} usuários processados...`);
        }

        console.log('✅ Migração de usuários concluída com sucesso!');
    } catch (error: any) {
        console.error('❌ Erro crítico:', error.message);
    } finally {
        process.exit(0);
    }
}

migrateUsers();
