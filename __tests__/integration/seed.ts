import admin from 'firebase-admin';

// Conecta ao Emulator explicitamente
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'demo-test' });
}

const db = admin.firestore();

async function resetFirestore() {
    console.log('🔄 Cleaning Firestore emulator database...');
    try {
        const response = await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-test/databases/(default)/documents', {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`Failed to clear emulator: ${response.statusText}`);
        }
        console.log('✅ Firestore cleared.');
    } catch (e) {
        console.warn('⚠️ Could not clear Firestore. Ensure emulator is running.', e);
        process.exit(1);
    }
}

async function seedFirestore() {
    console.log('🌱 Seeding initial state...');
    
    const batch = db.batch();

    // 1. Territories
    const t001 = db.collection('territories').doc('T-001');
    batch.set(t001, {
        name: 'T-001',
        city: 'Seed City',
        status: 'LIVRE',
        congregationId: 'CONG-SEED'
    });

    const t002 = db.collection('territories').doc('T-002');
    batch.set(t002, {
        name: 'T-002',
        city: 'Seed City',
        status: 'DESIGNADO', // Usando status DESIGNADO como esperado pelo app
        congregationId: 'CONG-SEED'
    });

    // 2. Mock Users
    const adminUser = db.collection('users').doc('admin-123');
    batch.set(adminUser, {
        name: 'Admin Seed',
        role: 'admin',
        congregationId: 'CONG-SEED'
    });

    const publisher = db.collection('users').doc('publisher-123');
    batch.set(publisher, {
        name: 'Publisher Seed',
        role: 'publisher',
        congregationId: 'CONG-SEED'
    });

    await batch.commit();
    console.log('✅ Database seeded successfully.');
}

async function run() {
    await resetFirestore();
    await seedFirestore();
    process.exit(0);
}

run();
