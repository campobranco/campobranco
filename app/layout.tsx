import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
// import FCMManager from './components/FCMManager'; // Removed
import FloatingReportButton from './components/FloatingReportButton';
import CookieBanner from './components/CookieBanner';
import PreviewIndicator from './components/PreviewIndicator';
import { appVersion } from '@/lib/version';
import { Toaster } from 'sonner';


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco',
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Gestão de Territórios para Testemunhas de Jeová',
  manifest: '/manifest.json',
  icons: {
    icon: '/app-icon.svg',
    shortcut: '/app-icon.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco',
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
  applicationName: process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco',
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
        <meta charSet="utf-8" />
        <script dangerouslySetInnerHTML={{
          __html: `
          // Injetando versão do app para o script
          const CURRENT_VERSION = "${appVersion}";
          
          // Cache Buster Agressivo (v2) - Força atualização se a versão mudar
          try {
            const lastVersion = localStorage.getItem('appVersion');
            
            if (lastVersion !== CURRENT_VERSION) {
              console.log('Versão alterada detectada (' + lastVersion + ' -> ' + CURRENT_VERSION + '). Limpando caches...');
              
              // 1. Limpa todos os caches nomeados
              if ('caches' in window) {
                caches.keys().then(names => {
                  Promise.all(names.map(name => caches.delete(name))).then(() => {
                    console.log('Todos os caches de armazenamento foram removidos.');
                  });
                });
              }

              // 2. Desregistra todos os Service Workers e registra o Kill Switch
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                  for (let registration of registrations) {
                    registration.unregister();
                  }
                  console.log('Service Workers desregistrados. Registrando Kill Switch...');
                  return navigator.serviceWorker.register('/sw-kill.js');
                }).catch(err => console.log('Erro ao limpar SWs:', err));
              }

              // 3. Salva a nova versão e força um reload total ignorando o cache (v3)
              localStorage.setItem('appVersion', CURRENT_VERSION);
              
              // Pequeno delay para garantir que as limpezas acima comecem
              setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set('cv', Date.now().toString());
                window.location.href = url.toString();
              }, 800);
            }
          } catch (e) {
            console.error('Erro no Cache Buster:', e);
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
            <PreviewIndicator />
            {/* <FCMManager /> Removed */}
            <FloatingReportButton />
            <CookieBanner />
            <Toaster richColors position="top-center" />
            <main className="app-shell flex-1 relative">
              {children}
            </main>
            <footer className="py-4 text-center print:hidden">
              <p className="text-[10px] text-gray-400 font-mono opacity-60">
                v{appVersion}
              </p>
            </footer>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
