import {
    buildSearchCandidates,
    expandBrazilianStreetAbbreviations,
    extractBrazilianCep,
    geocodeAddress,
    parseDirectCoordinates,
} from '@/lib/services/geocoding';

describe('geocoding (normalização e candidatos progressivos)', () => {
    it('deve expandir abreviações de logradouros brasileiros', () => {
        expect(expandBrazilianStreetAbbreviations('R. Álamo, 225')).toBe('Rua Álamo, 225');
        expect(expandBrazilianStreetAbbreviations('Av. São Domingos, 100')).toBe('Avenida São Domingos, 100');
        expect(expandBrazilianStreetAbbreviations('Pça. da Matriz')).toBe('Praça da Matriz');
    });

    it('deve extrair CEP brasileiro com ou sem hífen', () => {
        expect(extractBrazilianCep('R. Álamo, 225 - Catanduva - SP, 15804-389')).toBe('15804389');
        expect(extractBrazilianCep('Rua Sem Cep, 10')).toBeNull();
    });

    it('deve gerar candidatos progressivos removendo bairro/CEP e número', () => {
        const candidates = buildSearchCandidates(
            'R. Álamo, 225 - Vila Mota, Catanduva - SP, 15804-389',
            'Catanduva'
        );

        expect(candidates[0]).toBe('Rua Álamo, 225 - Vila Mota, Catanduva - SP, 15804-389');
        expect(candidates).toContain('Rua Álamo, 225, Catanduva, SP');
        expect(candidates).toContain('Rua Álamo, Catanduva, SP');
    });

    it('deve reconhecer coordenadas coladas diretamente ou em links de mapa', () => {
        expect(parseDirectCoordinates('-21.120137, -48.984610')).toEqual({
            lat: -21.120137,
            lng: -48.98461,
        });
        expect(parseDirectCoordinates('https://waze.com/ul?ll=-21.138,-48.972&navigate=yes')).toEqual({
            lat: -21.138,
            lng: -48.972,
        });
        expect(parseDirectCoordinates('Rua Álamo, 225')).toBeNull();
    });

    it('deve rejeitar resultado falso do Photon fora da rua/cidade buscada', async () => {
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockImplementation((url: string) => {
            if (url.includes('nominatim')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            }
            if (url.includes('photon')) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            features: [
                                {
                                    geometry: { coordinates: [-48.9, -21.1] },
                                    properties: { name: 'Rua Catanduva', city: 'Outra Cidade', state: 'SP' },
                                },
                            ],
                        }),
                });
            }
            return Promise.resolve({ ok: false });
        }) as unknown as typeof fetch;

        try {
            const results = await geocodeAddress('R. da Humildade, 201, Catanduva - SP', { cityName: 'Catanduva' });
            expect(results).toEqual([]);
        } finally {
            global.fetch = originalFetch;
        }
    });
});
