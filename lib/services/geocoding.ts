// lib/services/geocoding.ts
// Serviço de cliente para Geocoding via Photon (OpenStreetMap), Nominatim e ViaCEP (100% gratuito)
// Compatível com build estático (output: export)

import { extractCoordsFromMapUrl } from '@/lib/map-links';

export interface GeocodeResult {
    lat: string;
    lon: string;
    display_name: string;
}

export interface GeocodeOptions {
    limit?: number;
    biasLat?: number;
    biasLng?: number;
    cityName?: string;
}

const ABBREVIATION_RULES: Array<[RegExp, string]> = [
    [/(^|[\s,\-])R\.?(?=\s+[A-Za-zÀ-ÿ])/gi, '$1Rua'],
    [/(^|[\s,\-])Av\.?(?=\s+[A-Za-zÀ-ÿ])/gi, '$1Avenida'],
    [/(^|[\s,\-])Pç\.?(?=\s+[A-Za-zÀ-ÿ])/gi, '$1Praça'],
    [/(^|[\s,\-])Pça\.?(?=\s+[A-Za-zÀ-ÿ])/gi, '$1Praça'],
    [/(^|[\s,\-])Al\.?(?=\s+[A-Za-zÀ-ÿ])/gi, '$1Alameda'],
    [/(^|[\s,\-])Trav\.?(?=\s+[A-Za-zÀ-ÿ])/gi, '$1Travessa'],
    [/(^|[\s,\-])Tv\.?(?=\s+[A-Za-zÀ-ÿ])/gi, '$1Travessa'],
    [/(^|[\s,\-])Rod\.?(?=\s+[A-Za-zÀ-ÿ])/gi, '$1Rodovia'],
    [/(^|[\s,\-])Estr\.?(?=\s+[A-Za-zÀ-ÿ])/gi, '$1Estrada'],
];

/**
 * Expande abreviações comuns de logradouros brasileiros (R., Av., Pça., etc.).
 */
export function expandBrazilianStreetAbbreviations(query: string): string {
    let result = query;
    for (const [pattern, replacement] of ABBREVIATION_RULES) {
        result = result.replace(pattern, replacement);
    }
    return result.replace(/\s+/g, ' ').trim();
}

/**
 * Extrai CEP brasileiro de 8 dígitos (com ou sem hífen) se presente na busca.
 */
export function extractBrazilianCep(query: string): string | null {
    const match = query.match(/\b(\d{5})-?(\d{3})\b/);
    return match ? `${match[1]}${match[2]}` : null;
}

function normalizeForCompare(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Gera lista ordenada e deduplicada de candidatos de busca, da forma mais específica
 * até versões simplificadas (sem bairro/CEP e sem número) para contornar limitações do OSM.
 */
export function buildSearchCandidates(rawQuery: string, cityName?: string): string[] {
    const clean = rawQuery.replace(/[<>\"']/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);
    if (!clean) return [];

    const expanded = expandBrazilianStreetAbbreviations(clean);
    const cleanCity = (cityName || '').trim();
    const hasCity = cleanCity && cleanCity !== '...' && normalizeForCompare(expanded).includes(normalizeForCompare(cleanCity));

    const candidates: string[] = [];
    const pushUnique = (val: string) => {
        const normalized = val.replace(/\s*,\s*,+/g, ', ').replace(/^,\s*|,\s*$/g, '').replace(/\s+/g, ' ').trim();
        if (normalized.length >= 3 && !candidates.includes(normalized)) {
            candidates.push(normalized);
        }
    };

    // 1. Query expandida (acrescentando cidade se não estiver presente)
    pushUnique(cleanCity && cleanCity !== '...' && !hasCity ? `${expanded}, ${cleanCity}` : expanded);

    // 2. Remove CEP e trecho de bairro entre "-" e "," (ex: "Rua Álamo, 225 - Vila Mota, Catanduva - SP, 15804-389")
    const withoutCep = expanded.replace(/\b\d{5}-?\d{3}\b/g, '').replace(/,\s*$/, '').trim();
    const withoutNeighborhood = withoutCep
        .replace(/\s+-\s+[^,]+,\s*/g, ', ')
        .replace(/\s+-\s+([A-Z]{2})\b/g, ', $1')
        .trim();
    pushUnique(cleanCity && cleanCity !== '...' && !normalizeForCompare(withoutNeighborhood).includes(normalizeForCompare(cleanCity))
        ? `${withoutNeighborhood}, ${cleanCity}`
        : withoutNeighborhood);

    // 3. Apenas logradouro + cidade/UF (remove número da casa caso o OSM não tenha numeração)
    const withoutNumber = withoutNeighborhood.replace(/,\s*\d+[A-Za-z]?\b/g, '').trim();
    pushUnique(cleanCity && cleanCity !== '...' && !normalizeForCompare(withoutNumber).includes(normalizeForCompare(cleanCity))
        ? `${withoutNumber}, ${cleanCity}`
        : withoutNumber);

    return candidates;
}

/**
 * Extrai coordenadas diretas coladas na busca (ex: "-21.1201, -48.9846") ou em URLs de mapas.
 */
export function parseDirectCoordinates(query: string): { lat: number; lng: number } | null {
    const clean = (query || '').trim();
    if (!clean) return null;

    const fromUrl = extractCoordsFromMapUrl(clean);
    if (fromUrl) return fromUrl;

    const directMatch = clean.match(/^(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)$/);
    if (!directMatch) return null;

    const lat = parseFloat(directMatch[1]);
    const lng = parseFloat(directMatch[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
        return null;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return null;
    }

    return { lat, lng };
}

const STREET_STOPWORDS = new Set([
    'rua', 'avenida', 'praca', 'alameda', 'travessa', 'rodovia', 'estrada',
    'da', 'de', 'do', 'das', 'dos', 'e', 'sp', 'rj', 'mg', 'ba', 'pr', 'rs', 'sc', 'go', 'df', 'brasil'
]);

function extractSignificantStreetTokens(query: string, cityName?: string): string[] {
    const firstSegment = query.split(',')[0] || query;
    const normalizedCity = cityName ? normalizeForCompare(cityName) : '';
    const tokens = normalizeForCompare(firstSegment)
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3 && !/^\d+$/.test(token) && !STREET_STOPWORDS.has(token));

    return normalizedCity ? tokens.filter((t) => t !== normalizedCity) : tokens;
}

function isPhotonFeatureRelevant(
    props: Record<string, any> | undefined,
    streetTokens: string[],
    cityName?: string
): boolean {
    if (!props) return false;

    const cleanCity = cityName && cityName !== '...' ? normalizeForCompare(cityName) : '';
    const featureCity = normalizeForCompare(String(props.city || props.town || props.village || ''));
    if (cleanCity && featureCity && !featureCity.includes(cleanCity) && !cleanCity.includes(featureCity)) {
        return false;
    }

    if (streetTokens.length === 0) return true;

    const featureStreet = normalizeForCompare(String(props.street || props.name || ''));
    return streetTokens.some((token) => featureStreet.includes(token));
}

function formatPhotonDisplayName(props: Record<string, any> | undefined, fallback: string): string {
    if (!props) return fallback;
    const streetPart = [props.street || props.name, props.housenumber].filter(Boolean).join(', ');
    const district = props.district || props.suburb || '';
    const cityState = [props.city || props.town || props.village, props.state].filter(Boolean).join(' - ');
    const parts = [streetPart, district, cityState].filter(Boolean);
    return parts.length > 0 ? parts.join(' • ') : fallback;
}

async function fetchPhoton(
    query: string,
    limit: number,
    biasLat?: number,
    biasLng?: number,
    cityName?: string
): Promise<GeocodeResult[]> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const biasParams =
            typeof biasLat === 'number' && typeof biasLng === 'number' && Number.isFinite(biasLat) && Number.isFinite(biasLng)
                ? `&lat=${encodeURIComponent(String(biasLat))}&lon=${encodeURIComponent(String(biasLng))}`
                : '';

        const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${limit}${biasParams}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) return [];
        const data = await response.json();
        if (!Array.isArray(data?.features)) return [];

        const streetTokens = extractSignificantStreetTokens(query, cityName);

        return data.features
            .filter(
                (feat: any) =>
                    Array.isArray(feat?.geometry?.coordinates) &&
                    feat.geometry.coordinates.length >= 2 &&
                    isPhotonFeatureRelevant(feat.properties, streetTokens, cityName)
            )
            .map((feat: any) => ({
                lat: String(feat.geometry.coordinates[1]),
                lon: String(feat.geometry.coordinates[0]),
                display_name: formatPhotonDisplayName(feat.properties, query),
            }));
    } catch {
        return [];
    }
}

async function fetchNominatim(query: string, limit: number): Promise<GeocodeResult[]> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&countrycodes=br&addressdetails=1`,
            { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (!response.ok) return [];
        const data = await response.json();
        if (!Array.isArray(data)) return [];

        return data
            .filter((item: any) => item?.lat && item?.lon)
            .map((item: any) => ({
                lat: String(item.lat),
                lon: String(item.lon),
                display_name: String(item.display_name || query),
            }));
    } catch {
        return [];
    }
}

async function fetchViaCepFallback(cep: string, limit: number, biasLat?: number, biasLng?: number): Promise<GeocodeResult[]> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) return [];
        const data = await response.json();
        if (!data || data.erro || !data.localidade) return [];

        const cepQuery = [data.logradouro, data.localidade, data.uf, 'Brasil'].filter(Boolean).join(', ');
        const photonResults = await fetchPhoton(cepQuery, limit, biasLat, biasLng);
        if (photonResults.length > 0) return photonResults;
        return await fetchNominatim(cepQuery, limit);
    } catch {
        return [];
    }
}

function deduplicateResults(results: GeocodeResult[]): GeocodeResult[] {
    const seen = new Set<string>();
    const unique: GeocodeResult[] = [];
    for (const item of results) {
        const key = `${Number(item.lat).toFixed(4)},${Number(item.lon).toFixed(4)}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
        }
    }
    return unique;
}

/**
 * Realiza a geocodificação no lado do cliente com expansão de abreviações,
 * fallback progressivo (sem bairro/CEP/número) e suporte a CEP via ViaCEP.
 */
export async function geocodeAddress(query: string, options?: GeocodeOptions): Promise<GeocodeResult[]> {
    if (!query || query.trim().length < 3) return [];

    const directCoords = parseDirectCoordinates(query);
    if (directCoords) {
        return [{
            lat: String(directCoords.lat),
            lon: String(directCoords.lng),
            display_name: `${directCoords.lat}, ${directCoords.lng}`,
        }];
    }

    const limit = options?.limit ?? 5;
    const candidates = buildSearchCandidates(query, options?.cityName);

    for (const candidate of candidates) {
        const nominatimResults = await fetchNominatim(candidate, limit);
        if (nominatimResults.length > 0) {
            return deduplicateResults(nominatimResults);
        }

        const photonResults = await fetchPhoton(candidate, limit, options?.biasLat, options?.biasLng, options?.cityName);
        if (photonResults.length > 0) {
            return deduplicateResults(photonResults);
        }
    }

    const cep = extractBrazilianCep(query);
    if (cep) {
        const cepResults = await fetchViaCepFallback(cep, limit, options?.biasLat, options?.biasLng);
        if (cepResults.length > 0) {
            return deduplicateResults(cepResults);
        }
    }

    return [];
}

/**
 * Resolve as coordenadas centrais de uma cidade/congregação.
 * Verifica se já existem lat/lng salvas no registro da cidade; se não, consulta o geocoding por nome e UF/Brasil.
 */
export async function resolveCityCenterCoordinates(cityData?: { lat?: number | null; lng?: number | null; name?: string | null; uf?: string | null } | null): Promise<{ lat: number; lng: number } | null> {
    if (!cityData) return null;

    if (typeof cityData.lat === 'number' && typeof cityData.lng === 'number' && !isNaN(cityData.lat) && !isNaN(cityData.lng)) {
        return { lat: cityData.lat, lng: cityData.lng };
    }

    if (cityData.lat && cityData.lng) {
        const parsedLat = parseFloat(String(cityData.lat));
        const parsedLng = parseFloat(String(cityData.lng));
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            return { lat: parsedLat, lng: parsedLng };
        }
    }

    if (cityData.name && cityData.name.trim().length >= 2) {
        const queryTerm = `${cityData.name.trim()}${cityData.uf ? `, ${cityData.uf.trim()}` : ''}, Brasil`;
        const results = await geocodeAddress(queryTerm, { limit: 1 });
        if (results && results.length > 0 && results[0]?.lat && results[0]?.lon) {
            const geoLat = parseFloat(results[0].lat);
            const geoLng = parseFloat(results[0].lon);
            if (!isNaN(geoLat) && !isNaN(geoLng)) {
                return { lat: geoLat, lng: geoLng };
            }
        }
    }

    return null;
}
