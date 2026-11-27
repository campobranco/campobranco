"use client";

import { Suspense } from 'react';
import SharedListView from '@/app/components/SharedListView';
import { SharePageSkeleton } from '@/app/components/Skeleton';

export default function SharedListPage() {
    return (
        <Suspense fallback={<SharePageSkeleton />}>
            <SharedListView />
        </Suspense>
    );
}
