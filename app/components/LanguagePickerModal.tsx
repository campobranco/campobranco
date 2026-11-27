"use client";

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check } from 'lucide-react';
import { useTranslation } from '@/app/context/I18nContext';
import { LOCALE_LABELS, Locale, filterLocales } from '@/lib/i18n';

interface LanguagePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (locale: Locale) => void;
}

/**
 * Seletor de idioma com busca. Projetado para escalar para muitas opções
 * (busca por nome ou código, lista rolável), em vez de botões lado a lado.
 */
export default function LanguagePickerModal({ isOpen, onClose, onSelect }: LanguagePickerModalProps) {
    const { locale, t, supportedLocales } = useTranslation();
    const [isMounted, setIsMounted] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Reinicia a busca e foca o campo apenas ao abrir (não a cada re-render do pai)
    useEffect(() => {
        if (!isOpen) return;
        setQuery('');
        inputRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !isMounted) return null;

    const results = filterLocales(supportedLocales, query);

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="language-picker-title"
                onClick={(e) => e.stopPropagation()}
                className="bg-surface border border-surface-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
            >
                <div className="flex items-center justify-between p-4 border-b border-surface-border">
                    <h2 id="language-picker-title" className="text-lg font-bold text-main">
                        {t('settings.language.title')}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('common.close')}
                        className="p-2 hover:bg-background rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-muted hover:text-main" />
                    </button>
                </div>

                <div className="p-4 border-b border-surface-border">
                    <div className="relative">
                        <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            ref={inputRef}
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('settings.language.searchPlaceholder')}
                            aria-label={t('settings.language.searchPlaceholder')}
                            className="w-full bg-background border border-surface-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-main placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                    </div>
                </div>

                <ul role="listbox" aria-label={t('settings.language.label')} className="flex-1 overflow-y-auto p-2">
                    {results.length === 0 ? (
                        <li className="p-6 text-center text-sm text-muted">
                            {t('settings.language.noResults')}
                        </li>
                    ) : (
                        results.map((item) => {
                            const selected = item === locale;
                            return (
                                <li key={item} role="option" aria-selected={selected}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onSelect(item);
                                            onClose();
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                                            selected ? 'bg-primary-light/50 dark:bg-primary-dark/30' : 'hover:bg-background'
                                        }`}
                                    >
                                        <span className="flex flex-col">
                                            <span className="font-bold text-sm text-main">{LOCALE_LABELS[item]}</span>
                                            <span className="text-xs text-muted font-mono">{item}</span>
                                        </span>
                                        {selected && <Check className="w-4 h-4 text-primary" />}
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>
            </div>
        </div>,
        document.body
    );
}
