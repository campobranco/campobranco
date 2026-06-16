"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from '@/app/context/AuthContext';
import { BarChart3, Map as MapIcon, FileText, User, Settings, Home, Store } from "lucide-react";

export default function BottomNav() {
    const pathname = usePathname();
    const { congregationId, isAdminRoleGlobal, isElder, isServant, canViewReports, canManageMaps, canManageWitnessing } = useAuth();

    // Determine path for Maps link
    // Admins go to the Congregation List (/my-maps)
    // Assigned users go directly to their congregation
    const mapsPath = isAdminRoleGlobal ? '/my-maps' : (congregationId ? `/my-maps/city?congregationId=${congregationId}` : '/my-maps');

    // Determine path for Witnessing link
    const witnessingPath = isAdminRoleGlobal ? '/witnessing' : (congregationId ? `/witnessing/city?congregationId=${congregationId}` : '/witnessing');

    const isActive = (path: string) => {
        if (path === '/dashboard' && pathname === '/dashboard') return true;
        if (path.startsWith('/my-maps') && pathname.startsWith('/my-maps')) return true;
        if (path.startsWith('/witnessing') && pathname.startsWith('/witnessing')) return true;
        if (path !== '/dashboard' && pathname.startsWith(path)) return true;
        return false;
    };

    let menuItems = [
        { id: 'inicio', label: 'INÍCIO', icon: Home, path: '/dashboard' },
        { id: 'maps', label: 'MAPAS', icon: MapIcon, path: mapsPath },
        { id: 'witnessing', label: 'T. PÚBLICO', icon: Store, path: witnessingPath },
        { id: 'reports', label: 'RELATÓRIO', icon: FileText, path: '/reports' },
        { id: 'config', label: 'CONFIG', icon: Settings, path: '/settings' },
    ];

    // Filter menu items based on fine-grained permissions
    menuItems = menuItems.filter(item => {
        if (item.id === 'reports' && !canViewReports) return false;
        if (item.id === 'maps' && !canManageMaps) return false;
        if (item.id === 'witnessing' && !canManageWitnessing) return false;
        return true;
    });

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-border pb-safe pt-2 z-50 flex justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex justify-between items-center w-full max-w-lg px-6 py-2">
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.id}
                            href={item.path}
                            prefetch={false}
                            className={`flex flex-col items-center gap-1 transition-all duration-300 relative ${active ? 'text-primary dark:text-primary-light -translate-y-1' : 'text-muted hover:text-main'}`}
                        >
                            <div className={`p-2 rounded-lg transition-all duration-300 ${active ? 'bg-primary-light/50 dark:bg-primary-dark/30 shadow-sm' : ''}`}>
                                <Icon className={`w-6 h-6 ${active ? 'fill-current' : ''}`} strokeWidth={active ? 2.5 : 2} />
                            </div>
                            <span className={`text-[10px] font-bold tracking-wide transition-all ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-50 hidden'}`}>
                                {item.label}
                            </span>
                            {active && (
                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary dark:bg-primary-light rounded-full" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
