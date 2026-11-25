/**
 * Returns the Leaflet tile layer URL and options adapted to the active color theme.
 */
export function getMapTileConfig() {
    const apiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;

    if (apiKey) {
        return {
            url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(apiKey)}`,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19,
        };
    }

    return {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    };
}
