import { resolveLocale, translate, filterLocales, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n';

describe('filterLocales (busca do seletor de idioma)', () => {
    it('deve retornar todos os idiomas quando a busca estiver vazia', () => {
        expect(filterLocales(SUPPORTED_LOCALES, '   ')).toEqual(['pt-BR', 'en', 'es']);
    });

    it('deve encontrar idioma pelo nome ignorando acentos e maiúsculas', () => {
        expect(filterLocales(SUPPORTED_LOCALES, 'ESPANOL')).toEqual(['es']);
        expect(filterLocales(SUPPORTED_LOCALES, 'portugues')).toEqual(['pt-BR']);
    });

    it('deve encontrar idioma pelo código', () => {
        expect(filterLocales(SUPPORTED_LOCALES, 'pt-br')).toEqual(['pt-BR']);
    });

    it('deve retornar lista vazia quando nada corresponder', () => {
        expect(filterLocales(SUPPORTED_LOCALES, 'klingon')).toEqual([]);
    });
});

describe('i18n (resolveLocale e translate)', () => {
    it('deve listar os idiomas iniciais suportados', () => {
        expect(SUPPORTED_LOCALES).toEqual(['pt-BR', 'en', 'es']);
        expect(DEFAULT_LOCALE).toBe('pt-BR');
    });

    it('deve resolver códigos de idioma regionais e desconhecidos corretamente', () => {
        expect(resolveLocale('pt')).toBe('pt-BR');
        expect(resolveLocale('pt-BR')).toBe('pt-BR');
        expect(resolveLocale('en-US')).toBe('en');
        expect(resolveLocale('es-ES')).toBe('es');
        expect(resolveLocale('fr-FR')).toBe('pt-BR');
        expect(resolveLocale(undefined)).toBe('pt-BR');
    });

    it('deve traduzir chaves aninhadas em pt-BR, en e es', () => {
        expect(translate('pt-BR', 'nav.maps')).toBe('MAPAS');
        expect(translate('en', 'nav.maps')).toBe('MAPS');
        expect(translate('es', 'nav.settings')).toBe('AJUSTES');
    });

    it('deve interpolar variáveis simples no template', () => {
        expect(translate('pt-BR', 'settings.language.updatedToast', { language: 'English' })).toBe(
            'Idioma alterado para English.'
        );
        expect(translate('en', 'settings.language.updatedToast', { language: 'English' })).toBe(
            'Language changed to English.'
        );
    });

    it('deve retornar a própria chave quando ela não existir em nenhum idioma', () => {
        expect(translate('en', 'chave.inexistente.teste')).toBe('chave.inexistente.teste');
    });
});
