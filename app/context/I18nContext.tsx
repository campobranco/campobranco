"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
    DEFAULT_LOCALE,
    Locale,
    SUPPORTED_LOCALES,
    resolveLocale,
    translate,
} from '@/lib/i18n';

const LOCALE_STORAGE_KEY = 'app-locale';

interface I18nContextType {
    locale: Locale;
    setLocale: (nextLocale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    supportedLocales: readonly Locale[];
}

const I18nContext = createContext<I18nContextType>({
    locale: DEFAULT_LOCALE,
    setLocale: () => {},
    t: (key, params) => translate(DEFAULT_LOCALE, key, params),
    supportedLocales: SUPPORTED_LOCALES,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
            const initial = saved
                ? resolveLocale(saved)
                : resolveLocale(typeof navigator !== 'undefined' ? navigator.language : null);

            setLocaleState(initial);
            if (typeof document !== 'undefined') {
                document.documentElement.lang = initial;
            }
        } catch (error) {
            console.error('[I18n] Erro ao carregar idioma salvo:', error);
        }
    }, []);

    const setLocale = useCallback((nextLocale: Locale) => {
        const resolved = resolveLocale(nextLocale);
        setLocaleState(resolved);

        try {
            localStorage.setItem(LOCALE_STORAGE_KEY, resolved);
        } catch (error) {
            console.error('[I18n] Erro ao persistir idioma:', error);
        }

        if (typeof document !== 'undefined') {
            document.documentElement.lang = resolved;
        }
    }, []);

    const t = useCallback(
        (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
        [locale]
    );

    return (
        <I18nContext.Provider
            value={{
                locale,
                setLocale,
                t,
                supportedLocales: SUPPORTED_LOCALES,
            }}
        >
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    return useContext(I18nContext);
}
