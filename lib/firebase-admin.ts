// lib/firebase-admin.ts
// Cliente Firebase Admin para uso exclusivo no servidor (API routes, Server Components)
// Usa Service Account ou ADC para acesso privilegiado ao Firestore

import { initializeApp, getApps, cert, App, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

// Inicializa o Admin SDK de forma segura, tentando múltiplas fontes de credenciais
function initAdminApp(): App {
    const existingApps = getApps();
    if (existingApps.length > 0) {
        return existingApps[0];
    }

    const projectId = (
        process.env.FIREBASE_PROJECT_ID || 
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        'campo-branco' // Fallback para o ID conhecido
    ).replace(/^["']|["']$/g, '').trim();

    console.log(`🔧 Firebase Admin: Iniciando para projeto [${projectId}]`);

    // Verificação de presença de variáveis
    const hasKey = !!(process.env.FB_ADMIN_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY);
    const hasEmail = !!(process.env.FB_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL);
    
    console.log(`🔍 Firebase Admin: Check de variáveis - Chave: ${hasKey}, Email: ${hasEmail}`);

    // Prioridade 1: Chaves individuais (App Hosting / Vercel Secrets)
    const rawKey = process.env.FB_ADMIN_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = (process.env.FB_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL || '').replace(/^["']|["']$/g, '').trim();

    if (rawKey && clientEmail) {
        try {
            // Limpeza profunda da chave
            let privateKey = rawKey
                .replace(/^["']|["']$/g, '') // Remove aspas externas
                .replace(/\\n/g, '\n')       // Converte \n literais
                .trim();
            
            // Se a chave veio sem novas linhas (tudo em uma linha só), tenta restaurar a estrutura
            if (!privateKey.includes('\n') && privateKey.includes(' ')) {
                // Algumas vezes a chave é colada com espaços em vez de newlines
                privateKey = privateKey.replace(/ /g, '\n');
            }

            // Garante que o cabeçalho e rodapé estejam presentes e corretos
            if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
                privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}`;
            }
            if (!privateKey.includes('-----END PRIVATE KEY-----')) {
                privateKey = `${privateKey}\n-----END PRIVATE KEY-----`;
            }

            console.log(`🚀 Firebase Admin: Inicializando via chaves individuais. ID: ${projectId}, Email: ${clientEmail.substring(0, 10)}...`);
            
            return initializeApp({
                credential: cert({ 
                    projectId, 
                    clientEmail, 
                    privateKey 
                }),
                projectId
            });
        } catch (e: any) {
            console.error('❌ Firebase Admin: Erro nas chaves individuais:', e.message);
        }
    }

    // Prioridade 2: ADC (Application Default Credentials)
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
        try {
            console.log('🌐 Firebase Admin: Tentando ADC (Ambiente Google)...');
            return initializeApp({
                credential: applicationDefault(),
                projectId: projectId
            });
        } catch (e: any) {
            console.warn('⚠️ Firebase Admin: ADC falhou:', e.message);
        }
    }

    // Prioridade 3: service-account.json local (dev)
    const saPath = path.join(process.cwd(), 'service-account.json');
    if (fs.existsSync(saPath)) {
        try {
            const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
            console.log('✅ Firebase Admin: Inicializado via arquivo local');
            return initializeApp({
                credential: cert(serviceAccount),
                projectId: serviceAccount.project_id || projectId
            });
        } catch (e) {
            console.error('❌ Firebase Admin: Erro no arquivo local:', e);
        }
    }

    const missing = [];
    if (!hasKey) missing.push('PRIVATE_KEY');
    if (!hasEmail) missing.push('CLIENT_EMAIL');
    
    console.warn(`⚠️ Firebase Admin: Nenhuma credencial válida encontrada. Faltando: [${missing.join(', ')}]. Usando mock.`);
    return { name: '[mock]', options: { projectId } } as any;
}

// Instâncias do Admin SDK - inicializadas de forma segura
const adminApp: App = initAdminApp();
const isMock = adminApp.name === '[mock]';

// Evita chamar getFirestore/getAuth se o app for mock (comum no build do Next.js)
// Mock robusto para o Firestore (evita erros de encadeamento como .where().orderBy().get())
const createFirestoreMock = (collectionName: string) => {
    const mock: any = {
        doc: () => mock,
        where: () => mock,
        orderBy: () => mock,
        limit: () => mock,
        get: async () => {
            throw new Error(`Firestore indisponível: Credenciais ausentes para acessar "${collectionName}". Verifique as variáveis de ambiente (FB_ADMIN_PRIVATE_KEY).`);
        }
    };
    return mock;
};

export const adminDb: Firestore = !isMock
    ? getFirestore(adminApp, process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || '(default)')
    : {
        collection: (name: string) => createFirestoreMock(name)
    } as any;


export const adminAuth: Auth = !isMock
    ? getAuth(adminApp)
    : {
        verifyIdToken: async () => { throw new Error('Autenticação indisponível: Credenciais de administrador ausentes no servidor.'); }
    } as any;

