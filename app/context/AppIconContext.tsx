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

        // 1. Favicon no navegador (Favicon de aba) - remove existentes para evitar cache/duplicatas e força -c
        const existingIcons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
        existingIcons.forEach((el) => el.remove());

        const newFavicon = document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.type = 'image/x-icon';
        newFavicon.href = '/favicon-c.ico';
        document.head.appendChild(newFavicon);

        const newSvgIcon = document.createElement('link');
        newSvgIcon.rel = 'icon';
        newSvgIcon.type = 'image/svg+xml';
        newSvgIcon.href = '/app-icon-c.svg';
        document.head.appendChild(newSvgIcon);

        const newShortcutIcon = document.createElement('link');
        newShortcutIcon.rel = 'shortcut icon';
        newShortcutIcon.href = '/favicon-c.ico';
        document.head.appendChild(newShortcutIcon);

        // 2. Apple Touch Icon
        const appleIcons = document.querySelectorAll<HTMLLinkElement>("link[rel*='apple-touch-icon']");
        if (appleIcons.length > 0) {
            appleIcons.forEach((icon) => {
                icon.href = '/apple-touch-icon-c.png';
            });
        }

        // 3. Manifest PWA Canary
        const manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
        if (manifestLink) {
            manifestLink.href = '/manifest-c.json';
        }
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
