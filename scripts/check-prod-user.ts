import * as admin from 'firebase-admin';

async function main() {
    try {
        const projectId = 'campo-branco';
        
        let customApp;
        if (!admin.apps.length) {
            customApp = admin.initializeApp({ projectId });
        } else {
            customApp = admin.apps[0]!;
        }

        const db = admin.firestore(customApp, 'default');
        
        const usersSnap = await db.collection('users').where('email', '==', 'campobrancojw@gmail.com').get();
        if (usersSnap.empty) {
            console.log("NOT FOUND: No user with email campobrancojw@gmail.com in production 'default' DB.");
        } else {
            usersSnap.forEach(doc => {
                console.log(`FOUND: ${doc.id}`);
                console.log(JSON.stringify(doc.data(), null, 2));
            });
        }
    } catch (e: any) {
        console.error("Error connecting to prod DB:", e.message);
    }
}

main();
