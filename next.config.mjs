import { readFileSync } from 'fs';
import { join } from 'path';

// Como o package.json está no mesmo diretório, lemos a versão dele usando fs.readFileSync
// para evitar problemas com import assertions ou experimental json modules.
const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    trailingSlash: false,
    typescript: {
        ignoreBuildErrors: false,
    },
    images: {
        unoptimized: true,
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 8640,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
                pathname: '/**',
            },
        ],
    },
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },
    env: {
        NEXT_PUBLIC_APP_VERSION: pkg.version,
    },
    turbopack: {},
};

import withPWAPkg from "@ducanh2912/next-pwa";
const withPWA = withPWAPkg({
    dest: "public",
    cacheOnFrontEndNav: false,
    aggressiveFrontEndNavCaching: false,
    reloadOnOnline: true,
    disable: process.env.NODE_ENV === "development",
    skipWaiting: true,
    register: true,
    scope: "/",
    workboxOptions: {
        disableDevLogs: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
            {
                urlPattern: /^https:\/\/.*\.web\.app.*$/,
                handler: 'NetworkFirst',
                options: {
                    cacheName: 'documents-cache',
                    expiration: {
                        maxEntries: 5,
                        maxAgeSeconds: 60,
                    },
                },
            },
        ],
    },
});

export default withPWA(nextConfig);
