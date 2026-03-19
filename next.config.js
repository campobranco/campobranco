const pkg = require('./package.json');

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
        minimumCacheTTL: 86400,
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

const withPWA = require("@ducanh2912/next-pwa").default({
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

module.exports = withPWA(nextConfig);
