import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas que exigem autenticação
const protectedPaths = ['/admin', '/witnessing', '/reports'];

// Sistema de Rate Limiting simplificado para o Middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS = 100; // Requisições por minuto
const WINDOW_MS = 60000; // 1 minuto

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const ip = (req as any).ip || req.headers.get('x-forwarded-for') || 'unknown';

    // 1. Rate Limiting Logic
    const now = Date.now();
    const clientData = rateLimitMap.get(ip);

    if (clientData && clientData.resetTime > now) {
        if (clientData.count >= MAX_REQUESTS) {
            // Se excedeu o limite, retorna 429
            return new NextResponse(
                JSON.stringify({ error: 'Too many requests. Please try again later.' }),
                { 
                    status: 429, 
                    headers: { 'Content-Type': 'application/json' } 
                }
            );
        }
        clientData.count++;
    } else {
        // Reseta ou cria novo registro
        rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    }

    // Limpeza periódica do Map para evitar vazamento de memória
    if (rateLimitMap.size > 1000) {
        const currentNow = Date.now();
        rateLimitMap.forEach((value, key) => {
            if (value.resetTime < currentNow) {
                rateLimitMap.delete(key);
            }
        });
    }

    // 2. Proteção de Rotas
    const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
    
    let response = NextResponse.next();

    if (isProtected) {
        // App Hosting reserva o cookie __session para SSR
        const session = req.cookies.get('__session')?.value;
        
        // Se não houver cookie, redireciona instantaneamente para login
        if (!session) {
            const loginUrl = new URL('/auth/login', req.url);
            loginUrl.searchParams.set('from', pathname);
            response = NextResponse.redirect(loginUrl);
        }
    }

    // 3. Cabeçalhos de Segurança (Garantindo no nível do Next.js para o App Hosting)
    const cspHeader = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://apis.google.com https://www.gstatic.com https://unpkg.com https://*.googleapis.com",
        "script-src-elem 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://unpkg.com https://*.googleapis.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
        "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
        "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://firebasestorage.googleapis.com https://unpkg.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://img.shields.io",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.google-analytics.com https://www.google-analytics.com https://unpkg.com https://fonts.gstatic.com",
        "frame-src 'self' https://campo-branco.firebaseapp.com https://campo-branco.web.app",
        "worker-src 'self' blob:",
    ].join('; ');

    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

    return response;
}

export const config = {
    matcher: [
        /*
         * Aplica o middleware em todas as rotas exceto assets e arquivos estáticos
         */
        '/((?!_next/static|_next/image|favicon.ico|public|api/auth).*)',
    ],
};

