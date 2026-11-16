import { resolveCityCenterCoordinates } from '@/lib/services/geocoding';

describe('resolveCityCenterCoordinates - Centralização de Mapa por Cidade/Congregação', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('deve retornar coordenadas diretas se fornecidas numericamente', async () => {
        const result = await resolveCityCenterCoordinates({
            lat: -21.1421,
            lng: -48.9520,
            name: 'Ariranha',
            uf: 'SP'
        });

        expect(result).toEqual({ lat: -21.1421, lng: -48.9520 });
    });

    it('deve converter strings numéricas de coordenadas com segurança', async () => {
        const result = await resolveCityCenterCoordinates({
            lat: '-21.1421' as any,
            lng: '-48.9520' as any,
            name: 'Ariranha'
        });

        expect(result).toEqual({ lat: -21.1421, lng: -48.9520 });
    });

    it('deve consultar geocoding pelo nome da cidade quando coordenadas não estiverem preenchidas', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => [{
                lat: '-21.1878',
                lon: '-48.7889'
            }]
        } as any);

        const result = await resolveCityCenterCoordinates({
            name: 'Ariranha',
            uf: 'SP'
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('Ariranha%2C%20SP%2C%20Brasil'),
            expect.any(Object)
        );
        expect(result).toEqual({ lat: -21.1878, lng: -48.7889 });
    });

    it('deve retornar null se os dados da cidade forem nulos ou vazios', async () => {
        const result1 = await resolveCityCenterCoordinates(null);
        const result2 = await resolveCityCenterCoordinates({ name: '' });

        expect(result1).toBeNull();
        expect(result2).toBeNull();
    });
});
