import {
    buildGoogleMapsLink,
    buildWazeLink,
    extractCoordsFromMapUrl,
    formatAddressQuery,
    hasValidCoordinates,
    resolveNavigationLinks,
} from '@/lib/map-links';
import { sanitizeUrl } from '@/lib/validation';

describe('map-links (geração automática de links Waze e Google Maps)', () => {
    it('deve priorizar coordenadas exatas sobre o texto do endereço', () => {
        const waze = buildWazeLink({
            lat: -21.138,
            lng: -48.972,
            address: 'R. Alamo, 136',
            cityName: 'Catanduva',
        });
        const gmaps = buildGoogleMapsLink({
            lat: -21.138,
            lng: -48.972,
            address: 'R. Alamo, 136',
            cityName: 'Catanduva',
        });

        expect(waze).toBe('https://waze.com/ul?ll=-21.138,-48.972&navigate=yes');
        expect(gmaps).toBe('https://www.google.com/maps/search/?api=1&query=-21.138,-48.972');
        expect(sanitizeUrl(waze)).toBe(waze);
        expect(sanitizeUrl(gmaps)).toBe(gmaps);
    });

    it('deve ignorar coordenadas (0, 0) e usar o endereço com cidade', () => {
        expect(hasValidCoordinates(0, 0)).toBeNull();

        const waze = buildWazeLink({
            lat: 0,
            lng: 0,
            address: 'R. Álamo, 136',
            cityName: 'Catanduva',
        });
        const gmaps = buildGoogleMapsLink({
            lat: 0,
            lng: 0,
            address: 'R. Álamo, 136',
            cityName: 'Catanduva',
        });

        expect(waze).toBe('https://waze.com/ul?q=R.%20%C3%81lamo%2C%20136%2C%20Catanduva&navigate=yes');
        expect(gmaps).toBe('https://www.google.com/maps/search/?api=1&query=R.%20%C3%81lamo%2C%20136%2C%20Catanduva');
        expect(sanitizeUrl(waze)).toBe(waze);
        expect(sanitizeUrl(gmaps)).toBe(gmaps);
    });

    it('não deve duplicar o nome da cidade se já estiver no endereço', () => {
        expect(formatAddressQuery('R. Alamo, 136 - Catanduva - SP', 'Catanduva')).toBe(
            'R. Alamo, 136 - Catanduva - SP'
        );
    });

    it('deve preservar links manuais e gerar apenas os campos vazios em resolveNavigationLinks', () => {
        const resolved = resolveNavigationLinks({
            googleMapsLink: 'https://maps.app.goo.gl/abc123',
            wazeLink: '',
            lat: -21.138,
            lng: -48.972,
            address: 'R. Alamo, 136',
        });

        expect(resolved.googleMapsLink).toBe('https://maps.app.goo.gl/abc123');
        expect(resolved.wazeLink).toBe('https://waze.com/ul?ll=-21.138,-48.972&navigate=yes');
    });

    it('deve extrair coordenadas de URLs completas do Google Maps e Waze', () => {
        expect(
            extractCoordsFromMapUrl(
                'https://www.google.com/maps/place/R.+das+Macas/@-21.140,-48.970,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-21.141234!4d-48.971234'
            )
        ).toEqual({ lat: -21.141234, lng: -48.971234 });

        expect(
            extractCoordsFromMapUrl('https://www.google.com/maps/@-21.1201,-48.9846,18z')
        ).toEqual({ lat: -21.1201, lng: -48.9846 });

        expect(
            extractCoordsFromMapUrl('https://waze.com/ul?ll=-21.138,-48.972&navigate=yes')
        ).toEqual({ lat: -21.138, lng: -48.972 });

        expect(extractCoordsFromMapUrl('https://maps.app.goo.gl/xyz')).toBeNull();
    });
});
