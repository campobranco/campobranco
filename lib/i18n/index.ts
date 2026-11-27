import ptBR from '@/locales/pt-BR.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';

export type Locale = 'pt-BR' | 'en' | 'es';

export const DEFAULT_LOCALE: Locale = 'pt-BR';

export const SUPPORTED_LOCALES: readonly Locale[] = ['pt-BR', 'en', 'es'];

export const LOCALE_LABELS: Record<Locale, string> = {
    'pt-BR': 'Português (BR)',
    en: 'English',
    es: 'Español',
};

function normalizeSearchText(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Filtra idiomas por nome exibido ou código (sem diferenciar acentos/maiúsculas).
 * Ex.: "espanol" encontra "Español"; "pt" encontra "pt-BR".
 */
export function filterLocales(locales: readonly Locale[], query: string): Locale[] {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) {
        return [...locales];
    }

    return locales.filter((item) => {
        const label = normalizeSearchText(LOCALE_LABELS[item]);
        const code = normalizeSearchText(item);
        return label.includes(normalizedQuery) || code.includes(normalizedQuery);
    });
}

type TranslationNode = string | { [key: string]: TranslationNode };

const DICTIONARIES: Record<Locale, TranslationNode> = {
    'pt-BR': ptBR as TranslationNode,
    en: en as TranslationNode,
    es: es as TranslationNode,
};

/**
 * Normaliza um código de idioma (ex.: "pt", "en-US", "es-ES") para um Locale suportado.
 * Retorna DEFAULT_LOCALE ('pt-BR') quando não houver correspondência.
 */
export function resolveLocale(input?: string | null): Locale {
    if (!input || typeof input !== 'string') {
        return DEFAULT_LOCALE;
    }

    const normalized = input.trim().toLowerCase();
    if (!normalized) {
        return DEFAULT_LOCALE;
    }

    if (normalized === 'pt-br' || normalized.startsWith('pt')) {
        return 'pt-BR';
    }
    if (normalized === 'en' || normalized.startsWith('en-')) {
        return 'en';
    }
    if (normalized === 'es' || normalized.startsWith('es-')) {
        return 'es';
    }

    return DEFAULT_LOCALE;
}

function lookupKey(dictionary: TranslationNode, key: string): string | null {
    const segments = key.split('.');
    let current: TranslationNode | undefined = dictionary;

    for (const segment of segments) {
        if (!current || typeof current !== 'object' || !(segment in current)) {
            return null;
        }
        current = current[segment];
    }

    return typeof current === 'string' ? current : null;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
    if (!params) {
        return template;
    }

    return template.replace(/\{(\w+)\}/g, (match, token) => {
        if (Object.prototype.hasOwnProperty.call(params, token)) {
            return String(params[token]);
        }
        return match;
    });
}

/**
 * Traduz uma chave semântica (ex.: "settings.language.title") com suporte a interpolação `{var}`.
 * Faz fallback explícito para `pt-BR` apenas quando a chave ainda não existe no idioma ativo.
 */
export function translate(
    locale: Locale,
    key: string,
    params?: Record<string, string | number>
): string {
    const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
    const localized = lookupKey(dict, key);

    if (localized !== null) {
        return interpolate(localized, params);
    }

    if (locale !== DEFAULT_LOCALE) {
        const fallback = lookupKey(DICTIONARIES[DEFAULT_LOCALE], key);
        if (fallback !== null) {
            return interpolate(fallback, params);
        }
    }

    return key;
}
