"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { DashboardSkeleton } from '@/app/components/Skeleton';

export default function Home() {
    const { user, congregationId, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/login');
            } else if (!congregationId && role !== 'ADMIN') {
                router.replace('/sem-congregacao');
            } else {
                router.replace('/dashboard');
            }
        }
    }, [user, congregationId, role, loading, router]);

    return <DashboardSkeleton />;
}
