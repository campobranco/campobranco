'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface AppIconContextType {
    isCanary: boolean;
    appIconSrc: string;
    appleTouchIconSrc: string;
    faviconSrc: string;
}

const AppIconContext = createContext<AppIconContextType>({
    isCanary: false,
    appIconSrc: '/app-icon.svg',
    appleTouchIconSrc: '/apple-touch-icon.png',
    faviconSrc: '/favicon.ico',
});

export const AppIconProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isCanary, setIsCanary] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const hostname = window.location.hostname;
        const canaryDetected = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('campobrancodev.web.app');
        setIsCanary(canaryDetected);

        if (!canaryDetected) return;

        const applyCanaryFavicons = () => {
            // Garante que todas as tags <link rel="icon">, <link rel="shortcut icon"> e <link rel="apple-touch-icon"> apontem para -c
            const links = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon'], link[rel*='apple-touch-icon']");
            links.forEach((link) => {
                const rel = link.getAttribute('rel') || '';
                if (rel.includes('apple-touch-icon')) {
                    if (!link.href.endsWith('/apple-touch-icon-c.png')) {
                        link.href = '/apple-touch-icon-c.png';
                    }
                } else if (link.type === 'image/svg+xml') {
                    if (!link.href.endsWith('/app-icon-c.svg')) {
                        link.href = '/app-icon-c.svg';
                    }
                } else {
                    if (!link.href.endsWith('/favicon-c.ico')) {
                        link.href = '/favicon-c.ico';
                    }
                }
            });

            const manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
            if (manifestLink && !manifestLink.href.endsWith('/manifest-c.json')) {
                manifestLink.href = '/manifest-c.json';
            }
        };

        // Aplica imediatamente
        applyCanaryFavicons();

        // MutationObserver: monitora alterações no <head> feitas pelo Next.js (Router/Metadata) e reafirma os ícones canary
        const observer = new MutationObserver(() => {
            applyCanaryFavicons();
        });

        observer.observe(document.head, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href', 'rel']
        });

        return () => observer.disconnect();
    }, []);

    const appIconSrc = isCanary ? '/app-icon-c.svg' : '/app-icon.svg';
    const appleTouchIconSrc = isCanary ? '/apple-touch-icon-c.png' : '/apple-touch-icon.png';
    const faviconSrc = isCanary ? '/favicon-c.ico' : '/favicon.ico';

    return (
        <AppIconContext.Provider value={{ isCanary, appIconSrc, appleTouchIconSrc, faviconSrc }}>
            {children}
        </AppIconContext.Provider>
    );
};

export const useAppIcon = () => useContext(AppIconContext);
