import fetch from 'node-fetch';

async function fetchRealSnapshotsRest() {
    console.log("=== RAW FIRESTORE REST API QUERY: shared_list_snapshots ===");
    const projectId = "campobrancodev";
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'shared_list_snapshots' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'sharedListId' },
                    op: 'EQUAL',
                    value: { stringValue: 'boCWEmobfNKXpqoVmnsR' }
                }
            }
        }
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody)
    });

    const data = await res.json();
    console.log("HTTP Status:", res.status);
    console.log("RAW FIRESTORE REST RESPONSE:");
    console.log(JSON.stringify(data, null, 2));
}

fetchRealSnapshotsRest().catch(console.error);
