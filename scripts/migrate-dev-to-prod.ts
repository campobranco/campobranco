import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Carregar variáveis de ambiente de dev
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') });

async function migrate() {
    console.log('🚀 Iniciando script de migração de DEV para PROD...');

    // 1. Configurar App de DEV
    const devKeyPath = path.resolve(process.cwd(), 'campobrancodev-firebase-adminsdk-fbsvc-c56157d231.json');
    if (!fs.existsSync(devKeyPath)) {
        console.error(`❌ Arquivo de chaves de DEV não encontrado em: ${devKeyPath}`);
        process.exit(1);
    }
    const devServiceAccount = JSON.parse(fs.readFileSync(devKeyPath, 'utf8'));

    const appDev = initializeApp({
        credential: cert(devServiceAccount),
        projectId: devServiceAccount.project_id
    }, 'dev');

    // 2. Configurar App de PROD
    // IMPORTANTE: Utilizando a credencial de produção correta passada pelo usuário
    const prodKeyPath = path.resolve(process.cwd(), 'campo-branco-firebase-adminsdk-fbsvc-f2b23168ce.json');
    if (!fs.existsSync(prodKeyPath)) {
        console.error(`❌ Arquivo de chaves de PROD não encontrado em: ${prodKeyPath}`);
        process.exit(1);
    }
    const prodServiceAccount = JSON.parse(fs.readFileSync(prodKeyPath, 'utf8'));

    const appProd = initializeApp({
        credential: cert(prodServiceAccount),
        projectId: prodServiceAccount.project_id
    }, 'prod');

    // Explicitando o databaseId como "default" para ambos
    const dbDev = getFirestore(appDev, 'default');
    const dbProd = getFirestore(appProd, 'default');
    const authDev = getAuth(appDev);
    const authProd = getAuth(appProd);

    console.log(`🔌 Conectado em DEV: ${devServiceAccount.project_id} (banco: default)`);
    console.log(`🔌 Conectado em PROD: ${prodServiceAccount.project_id} (banco: default)`);

    // Migrar Usuários do Auth
    try {
        console.log('\n📦 Migrando Usuários do Auth...');
        let listUsersResult = await authDev.listUsers();
        let usersMigrated = 0;
        
        while (true) {
            for (const userRecord of listUsersResult.users) {
                try {
                    await authProd.getUser(userRecord.uid);
                    // Usuário já existe pelo UID, pula
                    continue;
                } catch (e: any) {
                    if (e.code !== 'auth/user-not-found') {
                        console.error(`  ⚠️ Erro ao verificar UID ${userRecord.uid}:`, e.message);
                        continue;
                    }
                }

                // Verificar por email
                if (userRecord.email) {
                    try {
                        await authProd.getUserByEmail(userRecord.email);
                        // Usuário já existe por email, pula
                        continue;
                    } catch (e: any) {
                        if (e.code !== 'auth/user-not-found') {
                            console.error(`  ⚠️ Erro ao verificar Email ${userRecord.email}:`, e.message);
                            continue;
                        }
                    }
                }

                // Criar usuário
                try {
                    await authProd.createUser({
                        uid: userRecord.uid,
                        email: userRecord.email,
                        emailVerified: userRecord.emailVerified,
                        phoneNumber: userRecord.phoneNumber,
                        displayName: userRecord.displayName,
                        photoURL: userRecord.photoURL,
                        disabled: userRecord.disabled,
                    });
                    
                    // Copiar claims personalizadas
                    if (userRecord.customClaims) {
                        await authProd.setCustomUserClaims(userRecord.uid, userRecord.customClaims);
                    }
                    usersMigrated++;
                } catch (createErr: any) {
                    console.error(`  ⚠️ Erro ao criar usuário ${userRecord.email || userRecord.uid}:`, createErr.message);
                }
            }
            if (listUsersResult.pageToken) {
                listUsersResult = await authDev.listUsers(1000, listUsersResult.pageToken);
            } else {
                break;
            }
        }
        console.log(`✅ Foram migrados ${usersMigrated} novos usuários do Auth.`);
    } catch (err: any) {
        console.error('❌ Erro global ao migrar usuários do Auth:', err.stack || err.message);
    }

    // Migrar dados do Firestore
    async function copyCollection(devRef: FirebaseFirestore.CollectionReference, prodRef: FirebaseFirestore.CollectionReference, collectionName: string) {
        const snapshot = await devRef.get();
        if (snapshot.empty) return;

        console.log(`  - Copiando [${collectionName}] (${snapshot.size} docs)`);

        for (const doc of snapshot.docs) {
            await prodRef.doc(doc.id).set(doc.data());

            // Buscar subcoleções
            const subcollections = await doc.ref.listCollections();
            for (const subcol of subcollections) {
                await copyCollection(subcol, prodRef.doc(doc.id).collection(subcol.id), `${collectionName}/${doc.id}/${subcol.id}`);
            }
        }
    }

    try {
        console.log('\n📦 Migrando Coleções do Firestore...');
        const topLevelCollections = await dbDev.listCollections();
        for (const collection of topLevelCollections) {
            await copyCollection(collection, dbProd.collection(collection.id), collection.id);
        }
        console.log('✅ Migração do Firestore concluída com sucesso!');
    } catch (err: any) {
        console.error('❌ Erro ao migrar Firestore:', err.stack || err.message);
    }

    console.log('\n✨ Migração concluída.');
    process.exit(0);
}

migrate();
