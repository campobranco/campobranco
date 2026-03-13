import { adminDb, getAdminInitError } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function GET() {
    // @ts-ignore - Acessando propriedade interna para debug
    const adminApp = (adminDb as any).app;
    const isMock = !adminApp || adminApp.name === '[mock]';

    const envs = {
        HAS_FB_ADMIN_KEY: !!process.env.FB_ADMIN_PRIVATE_KEY,
        HAS_FIREBASE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
        HAS_CLIENT_EMAIL: !!(process.env.FB_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL),
        
        PROJECT_ID_ENV: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ausente',
        
        // Efetivo no Admin SDK
        ADMIN_STATUS: isMock ? 'MOCK (CREDENCIAIS AUSENTES)' : 'REAL (INICIALIZADO)',
        ADMIN_PROJECT_ID: !isMock ? adminApp.options.projectId : 'N/A',
        INIT_ERROR: getAdminInitError() || 'Nenhum',
        
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: !!process.env.VERCEL,
        
        // Comprimentos para checagem
        KEY_LEN_1: process.env.FB_ADMIN_PRIVATE_KEY?.length || 0,
        KEY_LEN_2: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
        EMAIL_LEN: (process.env.FB_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL || '').length
    };

    return NextResponse.json(envs);
}
