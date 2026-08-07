import fetch from 'node-fetch';

async function patchFirestoreDirectly() {
    console.log("=== PATCHING FIRESTORE DIRECTLY VIA REST API ===");
    const projectId = "campobrancodev";
    const docPath = "congregations/congregao-bom-pastor";
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}?updateMask.fieldPaths=category`;

    const body = {
        fields: {
            category: {
                stringValue: "TRADITIONAL"
            }
        }
    };

    const res = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log("REST API Response Status:", res.status);
    console.log("REST API Response Data:", JSON.stringify(data, null, 2));

    if (res.status === 200) {
        console.log("SUCCESSFULLY UPDATED category TO 'TRADITIONAL' IN FIRESTORE!");
    } else {
        console.error("Failed to update via REST API:", data);
    }
}

patchFirestoreDirectly().catch(console.error);
