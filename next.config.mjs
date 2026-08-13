import { withSentryConfig } from '@sentry/nextjs';
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

export default withSentryConfig(withPWA(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "growth-boost",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
