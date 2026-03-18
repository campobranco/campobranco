const pkg = require('./package.json');

/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    trailingSlash: false, // Desativado para evitar problemas com APIs no Firebase
    // Se o seu domínio for campobranco.github.io/campobranco, descomente a linha abaixo:
    // basePath: isGithubActions ? '/campobranco' : '',
    typescript: {
        // Desativado para garantir que erros não passem despercebidos, conforme recomendado no relatório de performance
        ignoreBuildErrors: false,
    },
    images: {
        // Obrigatório usar unoptimized: true para Static Exports no Next.js
        unoptimized: true,
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 86400, // 24 horas de cache para imagens otimizadas
        remotePatterns: [
            {
                // Fotos de perfil do Google (login com Google)
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                pathname: '/**',
            },
            {
                // Firebase Storage (avatares personalizados)
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
                pathname: '/**',
            },
        ],
    },
    compiler: {
        // Remove console logs em produção para economizar memória e melhorar a performance
        removeConsole: process.env.NODE_ENV === 'production',
    },
    env: {
        NEXT_PUBLIC_APP_VERSION: pkg.version,
        // Define a URL base para as APIs. No GitHub, aponta para o Firebase.
        NEXT_PUBLIC_API_BASE_URL: isGithubActions ? 'https://campo-branco.web.app' : '',
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
        // Força o Service Worker a verificar o servidor para o arquivo principal (index.html)
        // para que novos cabeçalhos de CSP sejam aplicados imediatamente
        runtimeCaching: [
            {
                urlPattern: /^https:\/\/.*\.web\.app.*$/,
                handler: 'NetworkFirst',
                options: {
                    cacheName: 'documents-cache',
                    expiration: {
                        maxEntries: 5,
                        maxAgeSeconds: 60, // Apenas 1 minuto de cache
                    },
                },
            },
        ],
    },
});

// Adiciona suporte a cabeçalhos HTTP customizados.
// COOP: same-origin-allow-popups permite que o popup do Google Auth
// (signInWithPopup) se comunique com a janela pai sem ser bloqueado.
// Isso é necessário porque o Next.js 15 envia "same-origin" por padrão.
// Nota: headers() não tem efeito em static export (output: 'export'),
// mas funciona corretamente no servidor de desenvolvimento (npm run dev).
const withHeaders = (config) => {
    const originalHeaders = config.headers;
    config.headers = async () => {
        const existing = originalHeaders ? await originalHeaders() : [];
        return [
            ...existing,
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin-allow-popups',
                    },
                ],
            },
        ];
    };
    return config;
};

module.exports = withHeaders(withPWA(nextConfig));
