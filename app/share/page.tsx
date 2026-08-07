"use client";

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SharedListView from '@/app/components/SharedListView';

export default function SharedListPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <SharedListView />
        </Suspense>
    );
}
