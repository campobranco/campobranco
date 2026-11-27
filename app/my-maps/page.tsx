"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { ListPageSkeleton } from '@/app/components/Skeleton';

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

    return <ListPageSkeleton surfaceList={true} rightActions={2} />;
}

