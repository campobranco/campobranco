// lib/services/geocoding.ts
// Serviço de cliente para Geocoding via Nominatim (OpenStreetMap)
// Substitui a Server Action para permitir build estático (output: export)

/**
 * Realiza a geocodificação de um endereço no lado do cliente.
 * Nota: Pode haver limitações de User-Agent no navegador, mas Nominatim geralmente permite CORS.
 */
export async function geocodeAddress(query: string) {
    if (!query || query.length < 3) return [];

    const sanitizedQuery = query
        .replace(/[<>\"']/g, '')
        .trim()
        .slice(0, 500);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout

        // No cliente, não podemos definir User-Agent livremente (o navegador controla)
        // Mas podemos tentar passar informações via params se necessário.
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sanitizedQuery)}&limit=1`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`[Geocode] Error fetching: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        return data || [];

    } catch (error) {
        console.error('[Geocode] Client Error:', error);
        return [];
    }
}
