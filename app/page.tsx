"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { Loader2 } from 'lucide-react';

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

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
    );
}

