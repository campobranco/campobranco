import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function parseBool(val: string): boolean {
    return ['true', '1', 't', 'sim', 'yes'].includes((val || '').toLowerCase().trim());
}

function normalizeTerritoryName(name: string): string {
    const trimmed = (name || '').trim();
    if (/^\d+$/.test(trimmed) && trimmed.length === 1) {
        return trimmed.padStart(2, '0');
    }
    return trimmed;
}

function parseCSVLine(line: string, separator = ';'): string[] {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
            row.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    row.push(current.trim());
    return row;
}

function detectSeparator(headerLine: string): string {
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;
    return semicolonCount >= commaCount ? ';' : ',';
}

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        let token = '';

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            const cookie = req.headers.get('cookie');
            token = cookie?.split('__session=')[1]?.split(';')[0] || '';
        }

        if (!token) {
            return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
        }

        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (e) {
            return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
        }

        const url = new URL(req.url);
        const simulate = url.searchParams.get('simulate') === 'true';
        const strict = url.searchParams.get('strict') !== 'false';
        const congregationId = url.searchParams.get('congregationId');

        if (!congregationId) {
            return NextResponse.json({ error: 'Congregação não informada' }, { status: 400 });
        }

        // Fetch User and Permissions
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const adminData = userDoc.data();

        // Admin pode inserir para qualquer um. Ancião/Servo apenas para a própria congregação
        if (!adminData || (adminData.role !== 'ADMIN' && adminData.congregationId !== congregationId && adminData.congregation_id !== congregationId)) {
            return NextResponse.json({ error: 'Acesso negado à congregação.' }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(buffer);
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length < 2) {
            return NextResponse.json({ error: 'CSV vazio ou sem dados' }, { status: 400 });
        }

        const rawHeader = lines[0].replace(/^\ufeff/, '');
        const sep = detectSeparator(rawHeader);
        const header = parseCSVLine(rawHeader, sep);

        const COL: Record<string, string[]> = {
            cityName: ['Cidade', 'Nome da cidade (Cities name)', 'Nome da cidade'],
            uf: ['UF (Cities uf)', 'UF'],
            mapNum: ['Número do Mapa (Territories name)', 'Número do Mapa'],
            mapDesc: ['Descrição (Territories notes)', 'Descrição'],
            street: ['Endereço (street)', 'Endereço'],
            residentsCount: ['Quantidade de residentes', 'Número de residentes (residents_count)', 'Número de residentes', 'Número de Residentes'],
            residentName: ['Nome (resident_name)', 'Nome'],
            googleMapsLink: ['Link do Maps (google_maps_link)', 'Link do Maps', 'Link do Google Maps'],
            wazeLink: ['Link do Waze (waze_link)', 'Link do Waze'],
            isActive: ['Status (is_active)', 'Status'],
            isDeaf: ['Surdo (is_deaf)', 'Surdo'],
            isMinor: ['Menor de idade (is_minor)', 'Menor de idade'],
            isStudent: ['Estudante (is_student)', 'Estudante'],
            isNeurodivergent: ['Neurodivergente  (is_neurodivergent)', 'Neurodivergente (is_neurodivergent)', 'Neurodivergente'],
            gender: ['Gênero (gender)', 'Gênero'],
            observations: ['Observações', 'Observação (observations)', 'Observação'],
            visitStatus: ['Resultado da ultima visita', 'visit_status'],
            sortOrder: ['Ordem na listagem', 'sort_order'],
        };

        const colIndex: Record<string, number> = {};
        for (const [key, candidates] of Object.entries(COL)) {
            const idx = candidates.findIndex(c => header.some(h => h.trim() === c));
            const matchedHeader = header.findIndex(h => candidates.includes(h.trim()));
            colIndex[key] = matchedHeader;
        }

        if (colIndex.cityName < 0 || colIndex.mapNum < 0) {
            return NextResponse.json({
                error: `Cabeçalho inválido. Colunas obrigatórias: "Nome da cidade" e "Número do Mapa". Encontrado: ${header.join(' | ')}`
            }, { status: 422 });
        }

        const results = {
            created: { cities: 0, territories: 0, addresses: 0 },
            updated: { territories: 0, addresses: 0 },
            skipped: 0,
            errors: [] as { line: number; reason: string }[]
        };

        const cityCache: Record<string, string> = {};
        const territoryCache: Record<string, string> = {};

        const batch = lines.slice(1);

        for (let i = 0; i < batch.length; i++) {
            const lineNum = i + 2;
            const row = parseCSVLine(batch[i], sep);

            const get = (key: string): string => {
                const idx = colIndex[key];
                if (idx < 0 || idx >= row.length) return '';
                return (row[idx] || '').trim();
            };

            const cityName = get('cityName');
            const uf = get('uf').toUpperCase();
            const mapNumRaw = get('mapNum');
            const mapNum = normalizeTerritoryName(mapNumRaw);

            if (!cityName || !mapNum) continue;

            try {
                // 1. CIDADE
                const cityKey = `${uf}:${cityName.toLowerCase()}`;
                let cityId = cityCache[cityKey];

                if (!cityId) {
                    const citiesRef = adminDb.collection('cities');
                    const snapshot = await citiesRef.where('congregationId', '==', congregationId)
                        .where('uf', '==', uf)
                        .get();

                    let existingCity: any = undefined;
                    // Procura case-insensitive
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.name && data.name.toLowerCase() === cityName.toLowerCase()) {
                            existingCity = { id: doc.id, ...data };
                        }
                    });

                    // Caso falhe, procura pelo campo legado 'congregation_id' para garantir a retrocompatibilidade
                    if (!existingCity && snapshot.empty) {
                        const snapshotLegacy = await citiesRef.where('congregation_id', '==', congregationId)
                            .where('uf', '==', uf)
                            .get();
                        snapshotLegacy.forEach(doc => {
                            const data = doc.data();
                            if (data.name && data.name.toLowerCase() === cityName.toLowerCase()) {
                                existingCity = { id: doc.id, ...data };
                            }
                        });
                    }

                    if (existingCity) {
                        cityId = existingCity.id;
                    } else if (!simulate) {
                        const newCityRef = await citiesRef.add({
                            name: cityName,
                            uf: uf,
                            congregationId: congregationId,
                            created_at: new Date().toISOString()
                        });
                        cityId = newCityRef.id;
                        results.created.cities++;
                    } else {
                        cityId = `sim-city-${cityKey}`;
                        results.created.cities++;
                    }
                    cityCache[cityKey] = cityId;
                }

                // 2. TERRITÓRIO
                const territoryKey = `${congregationId}:${cityId}:${mapNum}`;
                let territoryId = territoryCache[territoryKey];
                const mapDesc = get('mapDesc');

                if (!territoryId) {
                    const terrRef = adminDb.collection('territories');
                    let snapshot = await terrRef.where('congregationId', '==', congregationId)
                        .where('cityId', '==', cityId)
                        .where('name', '==', mapNum)
                        .limit(1)
                        .get();

                    if (snapshot.empty) {
                        // try legacy field formatting
                        snapshot = await terrRef.where('congregation_id', '==', congregationId)
                            .where('city_id', '==', cityId)
                            .where('name', '==', mapNum)
                            .limit(1)
                            .get();
                    }

                    if (!snapshot.empty) {
                        const existingTerr: any = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
                        territoryId = existingTerr.id;

                        if (mapDesc && existingTerr.notes !== mapDesc && !simulate) {
                            await adminDb.collection('territories').doc(territoryId).update({ notes: mapDesc });
                            results.updated.territories++;
                        }
                    } else if (!simulate) {
                        const newTerrRef = await terrRef.add({
                            congregationId: congregationId,
                            cityId: cityId,
                            name: mapNum,
                            notes: mapDesc || null,
                            created_at: new Date().toISOString()
                        });
                        territoryId = newTerrRef.id;
                        results.created.territories++;
                    } else {
                        territoryId = `sim-terr-${territoryKey}`;
                        results.created.territories++;
                    }
                    territoryCache[territoryKey] = territoryId;
                }

                // 3. ENDEREÇO
                const street = get('street');
                if (!street) continue;

                const addressData: Record<string, any> = {
                    congregationId: congregationId,
                    cityId: cityId,
                    territoryId: territoryId,
                    street,
                    residentsCount: parseInt(get('residentsCount')) || 1,
                    residentName: get('residentName') || null,
                    googleMapsLink: get('googleMapsLink') || null,
                    wazeLink: get('wazeLink') || null,
                    isActive: get('isActive') !== '' ? parseBool(get('isActive')) : true,
                    isDeaf: parseBool(get('isDeaf')),
                    isMinor: parseBool(get('isMinor')),
                    isStudent: parseBool(get('isStudent')),
                    isNeurodivergent: parseBool(get('isNeurodivergent')),
                    gender: get('gender') || null,
                    observations: get('observations') || null,
                    visitStatus: get('visitStatus') || 'not_contacted',
                    sortOrder: parseInt(get('sortOrder')) || 0,
                    updatedAt: new Date().toISOString()
                };

                if (simulate) {
                    results.created.addresses++;
                    continue;
                }

                const addrsRef = adminDb.collection('addresses');
                const addrSnap = await addrsRef.where('territoryId', '==', territoryId).get();
                const addrLegacySnap = await addrsRef.where('territory_id', '==', territoryId).get();

                let existingAddr: any = undefined;

                addrSnap.forEach(doc => {
                    if (doc.data().street && doc.data().street.toLowerCase() === street.toLowerCase()) {
                        existingAddr = { id: doc.id, ...doc.data() };
                    }
                });

                if (!existingAddr) {
                    addrLegacySnap.forEach(doc => {
                        if (doc.data().street && doc.data().street.toLowerCase() === street.toLowerCase()) {
                            existingAddr = { id: doc.id, ...doc.data() };
                        }
                    });
                }

                if (existingAddr) {
                    const hasChanged =
                        existingAddr.residentName !== addressData.residentName ||
                        existingAddr.googleMapsLink !== addressData.googleMapsLink ||
                        existingAddr.gender !== addressData.gender ||
                        existingAddr.isActive !== addressData.isActive;

                    if (hasChanged) {
                        await addrsRef.doc(existingAddr.id).update(addressData);
                        results.updated.addresses++;
                    } else {
                        results.skipped++;
                    }
                } else {
                    addressData.createdAt = new Date().toISOString();
                    await addrsRef.add(addressData);
                    results.created.addresses++;
                }

            } catch (err: any) {
                results.errors.push({ line: lineNum, reason: err.message });
                if (strict) {
                    return NextResponse.json({ error: `Erro na linha ${lineNum}: ${err.message}` }, { status: 500 });
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error("Import API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
