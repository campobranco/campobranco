// Unit Test: Deterministic ID Map Storage Simulation

function generateSnapshotId(businessKey, itemId) {
    return `${businessKey}_${itemId}`;
}

const firestoreCollectionMock = new Map();

function setDocMock(docId, data) {
    firestoreCollectionMock.set(docId, data);
}

console.log("=== EMPIRICAL PROOF OF DETERMINISTIC ID BEHAVIOR ===");

const businessKey = "boCWEmobfNKXpqoVmnsR";
const items = ["address_101", "address_102", "address_103"];

// Execução 1: Primeira criação do mapa compartilhado
console.log("\n--- EXECUTANDO 1ª CRIAÇÃO DA LISTA ---");
items.forEach(itemId => {
    const docId = generateSnapshotId(businessKey, itemId);
    setDocMock(docId, { sharedListId: businessKey, itemId, visitStatus: 'none', version: 1 });
});

console.log("Quantidade total de documentos na coleção:", firestoreCollectionMock.size);
console.log("IDs gravados:", Array.from(firestoreCollectionMock.keys()));

// Execução 2: Reutilização/Regeração da MESMA lista compartilhada
console.log("\n--- EXECUTANDO 2ª CRIAÇÃO (REUTILIZAÇÃO DO MESMO businessKey) ---");
items.forEach(itemId => {
    const docId = generateSnapshotId(businessKey, itemId);
    setDocMock(docId, { sharedListId: businessKey, itemId, visitStatus: 'contacted', version: 2 });
});

console.log("Quantidade total de documentos após 2ª execução:", firestoreCollectionMock.size);
console.log("IDs gravados:", Array.from(firestoreCollectionMock.keys()));

if (firestoreCollectionMock.size === items.length) {
    console.log("\nPROVA MATEMÁTICA CONCLUÍDA:");
    console.log("Mesmo após a 2ª execução, a quantidade de documentos PERMANECEU EXATAMENTE 3.");
    console.log("IDs dos documentos continuam idênticos:");
    Array.from(firestoreCollectionMock.keys()).forEach(k => console.log(` - ${k}`));
} else {
    console.error("FALHA: Documentos foram duplicados!");
}
