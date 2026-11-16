// lib/services/geocoding.ts
// Serviço de cliente para Geocoding via Nominatim (OpenStreetMap)
// Substitui a Server Action para permitir build estático (output: export)

/**
 * Realiza a geocodificação no lado do cliente.
 * Utiliza o serviço aberto Photon (baseado em dados OpenStreetMap) com fallback para Nominatim,
 * garantindo compatibilidade com navegadores web sem bloqueios de User-Agent policy.
 */
export async function geocodeAddress(query: string) {
    if (!query || query.length < 3) return [];

    const sanitizedQuery = query
        .replace(/[<>\"']/g, '')
        .trim()
        .slice(0, 500);

    // 1. Tenta Photon (Komoot / OSM) - Permite CORS no navegador sem restrição de User-Agent
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(sanitizedQuery)}&limit=1`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data?.features && data.features.length > 0) {
                const feat = data.features[0];
                const coords = feat.geometry?.coordinates;
                if (coords && coords.length >= 2) {
                    return [{
                        lat: String(coords[1]),
                        lon: String(coords[0]),
                        display_name: feat.properties?.name || sanitizedQuery
                    }];
                }
            }
        }
    } catch (photonErr) {
        console.warn('[Geocode] Photon lookup falhou, tentando fallback Nominatim:', photonErr);
    }

    // 2. Fallback: Nominatim (OpenStreetMap)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sanitizedQuery)}&limit=1`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`[Geocode] Error fetching: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];

    } catch (error) {
        console.error('[Geocode] Client Error:', error);
        return [];
    }
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
        const results = await geocodeAddress(queryTerm);
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

