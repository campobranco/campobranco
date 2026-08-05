'use client';

import { useEffect } from 'react';

export default function DynamicCanaryFavicon() {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const hostname = window.location.hostname;
        const isCanary = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('campobrancodev.web.app');

        if (!isCanary) return;

        // 1. Atualizar Favicon dinamicamente
        const favicons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
        if (favicons.length > 0) {
            favicons.forEach((fav) => {
                fav.href = '/favicon-c.ico';
            });
        } else {
            const newFavicon = document.createElement('link');
            newFavicon.rel = 'shortcut icon';
            newFavicon.href = '/favicon-c.ico';
            document.head.appendChild(newFavicon);
        }

        // 2. Atualizar Apple Touch Icon
        const appleIcons = document.querySelectorAll<HTMLLinkElement>("link[rel*='apple-touch-icon']");
        if (appleIcons.length > 0) {
            appleIcons.forEach((icon) => {
                icon.href = '/apple-touch-icon-c.png';
            });
        }

        // 3. Atualizar Manifest se suportado
        const manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
        if (manifestLink) {
            manifestLink.href = '/manifest-c.json';
        }
    }, []);

    return null;
}
