
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Script de Conversão V4 - Estrito e Limpo para Migração.
 * - Datas no formato: 2026-02-18 10:00:00+00
 * - Quebra de linha Windows (\r\n)
 * - UUIDs determinísticos apenas para strings não vazias.
 * - JSONB formatado de forma simples.
 */

const jsonSource = 'backups/firebase_simple_2026-02-18T12-46-54-093Z.json';
const outputDir = 'backups/csv_db';

const SCHEMAS = {
    'cities': ['id', 'name', 'uf', 'region', 'congregation_id', 'created_at', 'parent_city'],
    'congregations': ['id', 'name', 'city_id', 'category', 'term_type', 'created_at', 'invite_token'],
    'users': ['id', 'email', 'name', 'role', 'congregation_id', 'params', 'terms_accepted_at', 'created_at', 'updated_at', 'preferences'],
    'territories': ['id', 'name', 'number', 'city_id', 'congregation_id', 'status', 'map_url', 'notes', 'created_at', 'updated_at', 'manual_last_completed_date', 'last_visit', 'assigned_to', 'assigned_at'],
    'addresses': ['id', 'territory_id', 'congregation_id', 'street', 'number', 'complement', 'coordinates', 'notes', 'status', 'created_at', 'city_id', 'resident_name', 'phone', 'lat', 'lng', 'google_maps_link', 'is_active', 'is_deaf', 'is_minor', 'is_student', 'is_neurodivergent', 'gender', 'observations', 'visit_status', 'last_visited_at', 'neighborhood', 'sort_order'],
    'witnessing_points': ['id', 'name', 'congregation_id', 'city_id', 'address', 'location', 'lat', 'lng', 'schedule', 'status', 'active_users', 'current_publishers', 'created_at'],
    'shared_lists': ['id', 'congregation_id', 'created_by', 'name', 'expires_at', 'created_at', 'assigned_to', 'assigned_name', 'territory_id', 'status', 'returned_at', 'context', 'title', 'type', 'items', 'assigned_at', 'city_id']
};

const fieldMappings = {
    '_id': 'id',
    'cityId': 'city_id',
    'congregationId': 'congregation_id',
    'territoryId': 'territory_id',
    'imageUrl': 'map_url',
    'isDeaf': 'is_deaf',
    'isMinor': 'is_minor',
    'isStudent': 'is_student',
    'isNeurodivergent': 'is_neurodivergent',
    'isActive': 'is_active',
    'residentName': 'resident_name',
    'googleMapsLink': 'google_maps_link',
    'visitStatus': 'visit_status',
    'lastVisitedAt': 'last_visited_at',
    'sortOrder': 'sort_order',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'createdBy': 'created_by',
    'assignedTo': 'assigned_to',
    'expiresAt': 'expires_at',
    'returnedAt': 'returned_at',
    'assignedAt': 'assigned_at',
    'manualLastCompletedDate': 'manual_last_completed_date',
    'parentCity': 'parent_city',
    'inviteToken': 'invite_token',
    'termType': 'term_type',
    'activeUsers': 'active_users',
    'currentPublishers': 'current_publishers'
};

const uuidFields = [
    'id', 'city_id', 'congregation_id', 'territory_id', 'created_by',
    'assigned_to', 'user_id', 'address_id', 'parent_city'
];

function toUUID(str) {
    if (!str || typeof str !== 'string' || str.trim() === '') return '';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) return str;
    const hash = crypto.createHash('sha256').update(str.trim()).digest('hex');
    return [
        hash.substring(0, 8), hash.substring(8, 12), '4' + hash.substring(13, 16),
        ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
        hash.substring(20, 32)
    ].join('-');
}

function formatDate(val) {
    const secs = val._seconds || val.seconds;
    const date = new Date(secs * 1000);
    return date.toISOString().replace('T', ' ').replace('Z', '+00');
}

function formatValue(value, key) {
    if (value === null || value === undefined) return '';

    // Datas
    if (typeof value === 'object' && (value._seconds !== undefined || value.seconds !== undefined)) {
        return formatDate(value);
    }

    // IDs
    if (uuidFields.includes(key)) {
        return toUUID(String(value));
    }

    // Objetos/Arrays
    if (typeof value === 'object') {
        const str = JSON.stringify(value);
        return `"${str.replace(/"/g, '""')}"`;
    }

    let stringVal = String(value);
    if (stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('\r') || stringVal.includes('"')) {
        stringVal = `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
}

async function run() {
    console.log(`🚀 Conversão V4 (Strict Row Format)`);
    const rawData = fs.readFileSync(jsonSource, 'utf8');
    const data = JSON.parse(rawData);
    const collections = data.data || data;

    for (const collectionName in SCHEMAS) {
        const items = collections[collectionName];
        if (!items || !Array.isArray(items)) continue;

        console.log(`📦 Gerando ${collectionName}.csv...`);
        const targetColumns = SCHEMAS[collectionName];
        const csvRows = [targetColumns.join(',')];

        for (const item of items) {
            const mappedItem = {};
            for (const key in item) {
                const targetKey = fieldMappings[key] || key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
                mappedItem[targetKey] = item[key];
            }
            const rowValues = targetColumns.map(col => formatValue(mappedItem[col], col));
            csvRows.push(rowValues.join(','));
        }

        fs.writeFileSync(path.join(outputDir, `${collectionName}.csv`), csvRows.join('\r\n'), 'utf8');
    }
    console.log('\n✨ Conversão finalizada com sucesso!');
}

run();
