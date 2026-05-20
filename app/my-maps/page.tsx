"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
    Loader2,
    Search,
    Building2,
    ArrowRight,
    Pencil,
    Trash2,
    X,
    LogOut,
    Check,
    Map,
    MoreVertical
} from 'lucide-react';
import BottomNav from '@/app/components/BottomNav';
import Link from 'next/link';
import { toast } from 'sonner';
import ConfirmationModal from '@/app/components/ConfirmationModal';

interface Congregation {
    id: string;
    name: string;
    category?: string;
    createdAt?: string;
}

export default function CongregationListPage() {
    const { user, isAdminRoleGlobal, isElder, isServant, loading: authLoading, congregationId, canManageMaps } = useAuth();
    const router = useRouter();

    // Redirect Unassigned Users
    useEffect(() => {
        if (!authLoading && user && !congregationId && !isAdminRoleGlobal) {
            router.push('/sem-congregacao');
        }
    }, [user, authLoading, congregationId, isAdminRoleGlobal, router]);

    // Redirect Non-authorized Users
    useEffect(() => {
        if (!authLoading && user && !canManageMaps) {
            router.replace('/dashboard');
        }
    }, [user, authLoading, canManageMaps, router]);

    // Automatic Redirection for Admins or Authorized Users
    useEffect(() => {
        if (!authLoading && user && canManageMaps) {
            if (isAdminRoleGlobal && !congregationId) {
                // Admin sem congregação vai para o painel de gestão
                router.replace('/admin/congregations');
            } else {
                // Admin com congregação ou usuários autorizados vão para a lista de cidades
                router.replace(`/my-maps/city?congregationId=${congregationId || ''}`);
            }
        }
    }, [user, authLoading, congregationId, isAdminRoleGlobal, canManageMaps, router]);

    return (
        <div className="bg-background min-h-screen pb-32 font-sans flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 opacity-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-bold text-muted uppercase tracking-widest">Redirecionando...</p>
            </div>
            <BottomNav />
        </div>
    );
}

