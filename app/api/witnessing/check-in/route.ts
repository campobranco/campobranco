// app/api/witnessing/check-in/route.ts
// Registra check-in e check-out em pontos de testemunho público
// Qualquer usuário autenticado pode fazer check-in/out

import { NextResponse } from 'next/server';
import { adminDb, getUserFromToken, FieldValue } from '@/lib/firestore';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('__session')?.value;
        const user = await getUserFromToken(token);

        if (!user) {
            return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
        }

        const { id, updates } = await req.json();

        if (!id || !updates) {
            return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
        }

        // Nome correto da coleção no Firestore é 'witnessing_points' (snake_case)
        const pointRef = adminDb.collection('witnessing_points').doc(id);
        const pointSnap = await pointRef.get();

        if (!pointSnap.exists) {
            return NextResponse.json({ error: 'Ponto não encontrado' }, { status: 404 });
        }

        await pointRef.update({
            ...updates,
            updatedAt: FieldValue.serverTimestamp(),
        });

        const updatedSnap = await pointRef.get();

        return NextResponse.json({ success: true, data: { id: updatedSnap.id, ...updatedSnap.data() } });
    } catch (error: any) {
        console.error('Check-in API Critical Error:', error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
