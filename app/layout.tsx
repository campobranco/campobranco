import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
// import FCMManager from './components/FCMManager'; // Removed
import SimulationBanner from './components/SimulationBanner';
import FloatingReportButton from './components/FloatingReportButton';
import CookieBanner from './components/CookieBanner';
import PreviewIndicator from './components/PreviewIndicator';
import { APP_VERSION } from '@/lib/version';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Campo Branco',
  description: 'Gestão de Territórios para Testemunhas de Jeová',
  manifest: '/manifest.json',
  icons: {
    icon: '/app-icon.svg',
    shortcut: '/app-icon.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Campo Branco',
    startupImage: [
      {
        url: '/icon-512x512.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  applicationName: 'Campo Branco',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Campo Branco',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning={true}>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
          if (typeof window !== 'undefined' && window.location.hostname === 'campobranco.github.io') {
            window.location.replace('https://campo-branco.web.app' + window.location.pathname + window.location.search + window.location.hash);
          }
        ` }} />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossOrigin=""
          async
        ></script>
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col`} suppressHydrationWarning={true}>
        <AuthProvider>
          <ThemeProvider>
            <Analytics />
            <SpeedInsights />
            <PreviewIndicator />
            {/* <FCMManager /> Removed */}
            <SimulationBanner />
            <FloatingReportButton />
            <CookieBanner />
            <Toaster richColors position="top-center" />
            <Analytics />
            <main className="app-shell flex-1">
              {children}
            </main>
            <footer className="py-4 text-center print:hidden">
              <p className="text-[10px] text-gray-400 font-mono opacity-60">
                v{APP_VERSION}
              </p>
            </footer>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
