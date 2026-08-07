import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

async function checkSharedListItems() {
    console.log("=== CHECKING SHARED LISTS & ADDRESSES ===");
    
    // 1. Get all shared_lists
    const listsSnap = await getDocs(collection(db, 'shared_lists'));
    console.log(`Total shared_lists: ${listsSnap.size}`);
    
    for (const lDoc of listsSnap.docs) {
        const lData = lDoc.data();
        console.log(`\nList ID: ${lDoc.id}`);
        console.log(`  Title: ${lData.title}, Status: ${lData.status}, Type: ${lData.type}`);
        console.log(`  Items array in list:`, lData.items);
        
        // Fetch snapshots for this list
        const snapQ = query(collection(db, 'shared_list_items'), where('sharedListId', '==', lDoc.id));
        const snapRes = await getDocs(snapQ);
        console.log(`  Snapshots in shared_list_items count: ${snapRes.size}`);
        
        const activeSnapshots = snapRes.docs.filter(d => d.data().data?.isActive !== false && d.data().isActive !== false);
        const inactiveSnapshots = snapRes.docs.filter(d => d.data().data?.isActive === false || d.data().isActive === false);
        console.log(`  -> Active Snapshots: ${activeSnapshots.length}, Inactive Snapshots: ${inactiveSnapshots.length}`);

        // Check actual addresses collection for the territoryId(s) in list.items
        if (lData.type === 'territory' && Array.isArray(lData.items)) {
            for (const terrId of lData.items) {
                const addrQ = query(collection(db, 'addresses'), where('territoryId', '==', terrId));
                const addrSnap = await getDocs(addrQ);
                console.log(`  Addresses in Firestore collection 'addresses' for territory ${terrId}: total = ${addrSnap.size}`);
                const activeAddrs = addrSnap.docs.filter(a => a.data().isActive !== false);
                const inactiveAddrs = addrSnap.docs.filter(a => a.data().isActive === false);
                console.log(`    -> Active addresses in DB: ${activeAddrs.length}, Inactive: ${inactiveAddrs.length}`);
                addrSnap.docs.forEach(a => {
                    console.log(`      Address ID: ${a.id} | Street: ${a.data().street} | isActive: ${a.data().isActive}`);
                });
            }
        }
    }
}

checkSharedListItems().catch(console.error);
