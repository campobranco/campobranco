import { NextResponse } from 'next/server';
import { returnExpiredTerritoryAssignments } from '@/lib/services/shared_lists';

export async function GET() {
    return NextResponse.json(
        { error: 'Method Not Allowed' }, 
        { status: 405, headers: { 'Allow': 'POST' } }
    );
}

export async function POST(request: Request) {
    try {
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = request.headers.get('authorization');
        
        // Em ambiente de produção com CRON_SECRET configurado, valida a autorização
        if (process.env.NODE_ENV === 'production') {
            if (!cronSecret) {
                console.error('[Cron Auto-Return] CRON_SECRET is not configured on server environment.');
                return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
            }
            if (authHeader !== `Bearer ${cronSecret}`) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const url = new URL(request.url);
        const congregationId = url.searchParams.get('congregationId') || undefined;

        const stats = await returnExpiredTerritoryAssignments(congregationId);
        console.log(`[AutoReturn] Execução concluída: Found: ${stats.foundCount}, Processed: ${stats.processedCount}, Skipped: ${stats.skippedCount}, Errors: ${stats.errorCount}, Duration: ${stats.durationMs} ms, HasMore: ${stats.hasMore}`);
        return NextResponse.json({ success: true, stats }, { status: 200 });
    } catch (error: any) {
        console.error('[Cron Auto-Return] Unhandled error during execution:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
