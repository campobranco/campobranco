import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';

async function migrateAuth() {
    console.log('🚀 Iniciando script de migração EXCLUSIVA de Auth (DEV -> PROD)...');

    // 1. Setup DEV App
    const devKeyPath = path.resolve(process.cwd(), 'campobrancodev-firebase-adminsdk-fbsvc-c56157d231.json');
    const devServiceAccount = JSON.parse(fs.readFileSync(devKeyPath, 'utf8'));

    const appDev = initializeApp({
        credential: cert(devServiceAccount),
        projectId: devServiceAccount.project_id
    }, 'dev');

    // 2. Setup PROD App
    const prodKeyPath = path.resolve(process.cwd(), 'campo-branco-firebase-adminsdk-prod.json');
    const prodServiceAccount = JSON.parse(fs.readFileSync(prodKeyPath, 'utf8'));

    const appProd = initializeApp({
        credential: cert(prodServiceAccount),
        projectId: prodServiceAccount.project_id
    }, 'prod');

    const authDev = getAuth(appDev);
    const authProd = getAuth(appProd);

    console.log('\n📦 Lendo usuários do ambiente de Desenvolvimento (DEV)...');
    try {
        let listUsersResult = await authDev.listUsers();
        let usersMigrated = 0;
        
        while (true) {
            for (const userRecord of listUsersResult.users) {
                console.log(`  - Verificando usuário: ${userRecord.email || userRecord.uid}`);
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
                    
                    if (userRecord.customClaims) {
                        await authProd.setCustomUserClaims(userRecord.uid, userRecord.customClaims);
                    }
                    console.log(`    ✅ Usuário importado com sucesso: ${userRecord.email}`);
                    usersMigrated++;
                } catch (createErr: any) {
                    console.error(`    ⚠️ Erro ao criar usuário ${userRecord.email}:`, createErr.message);
                }
            }
            if (listUsersResult.pageToken) {
                listUsersResult = await authDev.listUsers(1000, listUsersResult.pageToken);
            } else {
                break;
            }
        }
        console.log(`\n✅ Concluído! Foram importados ${usersMigrated} usuários para Produção.`);
    } catch (err: any) {
        console.error('❌ Erro global:', err.stack || err.message);
    }

    process.exit(0);
}

migrateAuth();
