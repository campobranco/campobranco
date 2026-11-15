"use client";

import { useState, useEffect } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    Award,
    Map as MapIcon,
    ArrowRight,
    PenLine,
    AlertTriangle,
    Hand
} from 'lucide-react';
import Link from 'next/link';

export interface IdleTerritory {
    id: string;
    name: string;
    description?: string;
    city: string;
    lastVisit?: any;
    cityId?: string;
    congregationId?: string;
    variant?: 'danger' | 'warning';
}

export interface DoNotVisitAddress {
    id: string;
    street: string;
    number?: string;
    neighborhood?: string;
    territoryId?: string;
    territoryName?: string;
    cityId?: string;
    city?: string;
    congregationId?: string;
    observations?: string;
    markedAt?: any;
}

interface ActionCenterProps {
    userName: string;
    pendingMapsCount: number;
    hasPendingAnnotation?: boolean; // Mock for now
    idleTerritories?: IdleTerritory[];
    doNotVisitAddresses?: DoNotVisitAddress[];
    cityCompletion?: { cityName: string; percentage: number }; // Mock
    expiringMaps?: { id: string, title: string, daysLeft: number }[];
    onAssignTerritory?: (territory: IdleTerritory) => void;
    onReviewDoNotVisit?: (address: DoNotVisitAddress) => void;
    limit?: number;
}

export default function ActionCenter({
    userName,
    pendingMapsCount,
    hasPendingAnnotation = false,
    idleTerritories = [],
    doNotVisitAddresses = [],
    cityCompletion,
    expiringMaps = [],
    onAssignTerritory,
    onReviewDoNotVisit,
    limit
}: ActionCenterProps) {
    // Collect all notification items
    const items: React.ReactNode[] = [];

    // 0. Do Not Visit Addresses (Notificação prioritária para Anciãos/Servos/Admin)
    if (doNotVisitAddresses && doNotVisitAddresses.length > 0) {
        doNotVisitAddresses.forEach((address: DoNotVisitAddress) => {
            items.push(
                <div
                    key={`dnv-${address.id}`}
                    className="bg-red-50 dark:bg-red-950/20 rounded-lg p-2.5 md:p-5 border border-red-200 dark:border-red-900/30 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 hover:shadow-sm transition-shadow"
                >
                    <div className="flex items-start md:items-center gap-2.5 w-full md:w-auto">
                        <div className="bg-white dark:bg-red-900/40 p-1.5 md:p-3 rounded-full shrink-0 shadow-sm border border-red-200 dark:border-red-800">
                            <Hand className="w-5 h-5 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 md:hidden pt-0.5">
                            <h3 className="font-bold text-red-900 dark:text-red-100 flex items-center gap-2 text-sm">
                                <Hand className="w-3.5 h-3.5 text-red-600" />
                                Não Visitar: {address.street}{address.number && address.number !== 'S/N' ? `, ${address.number}` : ''}
                            </h3>
                        </div>
                    </div>

                    <div className="flex-1 -mt-1 md:mt-0 pl-9 md:pl-0">
                        <h3 className="hidden md:flex font-bold text-red-900 dark:text-red-100 items-center gap-2 mb-1">
                            <Hand className="w-4 h-4 text-red-600" />
                            Não Visitar: {address.street}{address.number && address.number !== 'S/N' ? `, ${address.number}` : ''}
                        </h3>
                        <p className="md:hidden text-[9px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-0.5">
                            SOLICITAÇÃO PENDENTE DE REVISÃO
                        </p>
                        <p className="text-red-800/90 dark:text-red-200/90 text-xs md:text-sm leading-tight md:leading-relaxed">
                            Morador solicitou não ser visitado{address.territoryName ? ` no Território ${address.territoryName}` : ''}{address.city ? ` (${address.city})` : ''}. Revise para inativar o endereço ou remover a marcação.
                        </p>
                        {address.observations && (
                            <p className="text-red-700/80 dark:text-red-300/80 text-[11px] md:text-xs italic mt-1 bg-red-100/50 dark:bg-red-900/30 p-1.5 rounded">
                                Nota: &quot;{address.observations}&quot;
                            </p>
                        )}
                    </div>

                    <div className="pl-9 md:pl-0 w-full md:w-auto mt-1 md:mt-0">
                        <button
                            onClick={() => onReviewDoNotVisit && onReviewDoNotVisit(address)}
                            className="w-full md:w-auto bg-white dark:bg-surface text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-[10px] md:text-xs py-1.5 md:py-3 px-4 md:px-6 rounded-md flex items-center justify-center gap-2 hover:bg-red-100/50 dark:hover:bg-red-900/40 transition-colors shadow-sm whitespace-nowrap"
                        >
                            REVISAR <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        </button>
                    </div>
                </div>
            );
        });
    }

    // 1. Pending Annotation (Mock)
    if (hasPendingAnnotation) {
        items.push(
            <div key="pending-annotation" className="bg-primary-light dark:bg-primary-light/10 rounded-lg p-2.5 md:p-5 border border-amber-100 dark:border-amber-900/20 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start md:items-center gap-2.5 w-full md:w-auto">
                    <div className="bg-white dark:bg-primary-dark/30 p-1.5 md:p-3 rounded-full shrink-0 shadow-sm border border-amber-100 dark:border-amber-900/20">
                        <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-primary dark:text-primary-light" />
                    </div>
                    <div className="flex-1 md:hidden pt-0.5">
                        <h3 className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2 text-sm">
                            <PenLine className="w-3.5 h-3.5" />
                            Anotação Pendente
                        </h3>
                    </div>
                </div>

                <div className="flex-1 -mt-1 md:mt-0 pl-9 md:pl-0">
                    <h3 className="hidden md:flex font-bold text-amber-900 dark:text-amber-100 items-center gap-2 mb-1">
                        <PenLine className="w-4 h-4" />
                        Anotação Pendente
                    </h3>
                    <p className="text-primary dark:text-primary-light/30 text-xs md:text-sm leading-tight md:leading-relaxed">
                        Você tem uma visita recente pendente de anotação.
                    </p>
                </div>

                <div className="pl-9 md:pl-0 w-full md:w-auto mt-1 md:mt-0">
                    <button className="w-full md:w-auto bg-white dark:bg-surface text-main border border-amber-200 dark:border-amber-800 font-bold text-[10px] md:text-xs py-1.5 md:py-3 px-4 md:px-6 rounded-md flex items-center justify-center gap-2 hover:bg-primary-light dark:hover:bg-primary-dark/40 transition-colors shadow-sm whitespace-nowrap">
                        ANOTAR <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    // 2. Pending Maps
    if (pendingMapsCount > 0) {
        items.push(
            <div key="pending-maps" className="bg-green-50 dark:bg-green-900/10 rounded-lg p-2.5 md:p-5 border border-green-100 dark:border-green-900/20 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start md:items-center gap-2.5 w-full md:w-auto">
                    <div className="bg-white dark:bg-green-900/30 p-1.5 md:p-3 rounded-full shrink-0 shadow-sm border border-green-100 dark:border-green-900/20">
                        <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-500 dark:text-green-400" />
                    </div>
                    <div className="flex-1 md:hidden pt-0.5">
                        <h3 className="font-bold text-green-900 dark:text-green-100 flex items-center gap-2 text-sm">
                            <MapIcon className="w-3.5 h-3.5" />
                            Mapas Pendentes
                        </h3>
                    </div>
                </div>
                <div className="flex-1 -mt-1 md:mt-0 pl-9 md:pl-0">
                    <h3 className="hidden md:flex font-bold text-green-900 dark:text-green-100 items-center gap-2 mb-1">
                        <MapIcon className="w-4 h-4" />
                        {pendingMapsCount === 1 ? 'Mapa Pendente!' : 'Mapas Pendentes!'}
                    </h3>
                    <p className="text-green-800/80 dark:text-green-200/80 text-xs md:text-sm leading-tight md:leading-relaxed">
                        {pendingMapsCount === 1
                            ? `Você tem 1 mapa designado.`
                            : `Você tem ${pendingMapsCount} mapas designados.`}
                    </p>
                </div>
            </div>
        );
    }

    // 3. Expiring Maps Notification
    expiringMaps.forEach(map => {
        items.push(
            <div key={`expire-${map.id}`} className="bg-orange-50 dark:bg-orange-900/10 rounded-lg p-2.5 md:p-5 border border-orange-100 dark:border-orange-900/20 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start md:items-center gap-2.5 w-full md:w-auto">
                    <div className="bg-white dark:bg-orange-900/30 p-1.5 md:p-3 rounded-full shrink-0 shadow-sm border border-orange-100 dark:border-orange-900/20">
                        <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-orange-500 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 md:hidden pt-0.5">
                        <h3 className="font-bold text-orange-900 dark:text-orange-100 flex items-center gap-2 text-sm">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Link vencendo!
                        </h3>
                    </div>
                </div>
                <div className="flex-1 -mt-1 md:mt-0 pl-9 md:pl-0">
                    <h3 className="hidden md:flex font-bold text-orange-900 dark:text-orange-100 items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4" />
                        Link quase vencendo!
                    </h3>
                    <p className="text-orange-800/80 dark:text-orange-200/80 text-xs md:text-sm leading-tight md:leading-relaxed">
                        <strong>{map.title}</strong> vence em {map.daysLeft} {map.daysLeft === 1 ? 'dia' : 'dias'}.
                    </p>
                </div>
            </div>
        );
    });

    // 4. City Completion (Celebration)
    if (cityCompletion && cityCompletion.percentage === 100) {
        items.push(
            <div key="city-completion" className="bg-primary-light dark:bg-primary-light/20 rounded-lg p-2.5 md:p-5 border border-primary-light/50 dark:border-primary-dark/20 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start md:items-center gap-2.5 w-full md:w-auto">
                    <div className="bg-white dark:bg-primary-dark/30 p-1.5 md:p-3 rounded-full shrink-0 shadow-sm border border-primary-light/50 dark:border-primary-dark/20">
                        <Award className="w-5 h-5 md:w-6 md:h-6 text-primary-light0 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 md:hidden pt-0.5">
                        <h3 className="font-bold text-blue-900 dark:text-primary-light/50 flex items-center gap-2 text-sm">
                            <Award className="w-3.5 h-3.5" />
                            Território 100%
                        </h3>
                    </div>
                </div>
                <div className="flex-1 -mt-1 md:mt-0 pl-9 md:pl-0">
                    <h3 className="hidden md:flex font-bold text-blue-900 dark:text-primary-light/50 items-center gap-2 mb-1">
                        <Award className="w-4 h-4" />
                        Cidade 100% Percorrida
                    </h3>
                    <p className="text-primary-dark/80 dark:text-primary-light/30 text-xs md:text-sm leading-tight md:leading-relaxed">
                        {cityCompletion.cityName} foi finalizada!
                    </p>
                </div>
                <div className="pl-9 md:pl-0 w-full md:w-auto mt-1 md:mt-0">
                    <button className="w-full md:w-auto bg-white dark:bg-surface text-main border border-primary-light dark:border-primary-dark/50 font-bold text-[10px] md:text-xs py-1.5 md:py-3 px-4 md:px-6 rounded-md flex items-center justify-center gap-2 hover:bg-primary-light/50 dark:hover:bg-primary-dark/40 transition-colors shadow-sm whitespace-nowrap">
                        VER RELATÓRIO <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    // 5. Idle Territory (Admin)
    if (idleTerritories && idleTerritories.length > 0) {
        idleTerritories.forEach((territory: IdleTerritory) => {
            const isWarning = territory.variant === 'warning';

            // Styles
            const bgColor = isWarning ? "bg-orange-50 dark:bg-orange-900/10" : "bg-red-50 dark:bg-red-900/10";
            const borderColor = isWarning ? "border-orange-100 dark:border-orange-900/20" : "border-red-100 dark:border-red-900/20";
            const iconBg = isWarning ? "bg-white dark:bg-orange-900/30" : "bg-white dark:bg-red-900/30";
            const iconBorder = isWarning ? "border-orange-100 dark:border-orange-900/20" : "border-red-100 dark:border-red-900/20";
            const iconColor = isWarning ? "text-orange-500 dark:text-orange-400" : "text-red-500 dark:text-red-400";
            const titleColor = isWarning ? "text-orange-900 dark:text-orange-100" : "text-red-900 dark:text-red-100";
            const textColor = isWarning ? "text-orange-800/80 dark:text-orange-200/80" : "text-red-800/80 dark:text-red-200/80";
            const buttonBorder = isWarning ? "border-orange-200 dark:border-orange-800" : "border-red-200 dark:border-red-800";
            const buttonHover = isWarning ? "hover:bg-orange-100 dark:hover:bg-orange-900/40" : "hover:bg-red-100 dark:hover:bg-red-900/40";

            items.push(
                <div key={`idle-${territory.id}`} className={`${bgColor} rounded-lg p-2.5 md:p-5 border ${borderColor} flex flex-col md:flex-row md:items-center gap-2 md:gap-4 hover:shadow-sm transition-shadow`}>
                    <div className="flex items-start md:items-center gap-2.5 w-full md:w-auto">
                        <div className={`${iconBg} p-1.5 md:p-3 rounded-full shrink-0 shadow-sm border ${iconBorder}`}>
                            <AlertTriangle className={`w-5 h-5 md:w-6 md:h-6 ${iconColor}`} />
                        </div>
                        <div className="flex-1 md:hidden pt-0.5">
                            <h3 className={`font-bold ${titleColor} flex items-center gap-2 text-sm`}>
                                <MapIcon className="w-3.5 h-3.5" />
                                {territory.name}{territory.description ? ` • ${territory.description}` : ''}
                            </h3>
                        </div>
                    </div>

                    <div className="flex-1 -mt-1 md:mt-0 pl-9 md:pl-0">
                        <h3 className={`hidden md:flex font-bold ${titleColor} items-center gap-2 mb-1`}>
                            <MapIcon className="w-4 h-4" />
                            {territory.name}{territory.description ? ` • ${territory.description}` : ''}
                        </h3>
                        {/* Mobile Title Replacement for Desktop Context */}
                        <p className={`md:hidden text-[9px] font-bold uppercase tracking-wider opacity-60 mb-0.5 ${titleColor}`}>
                            {isWarning ? 'MUITO TEMPO SEM COBRAR' : 'NUNCA VISITADO'}
                        </p>

                        <p className={`${textColor} text-xs md:text-sm leading-tight md:leading-relaxed`}>
                            {territory.lastVisit ? (
                                <>Esta região de <span className="font-bold">{territory.city}</span> não é visitada desde {new Date(territory.lastVisit).toLocaleDateString()}.</>
                            ) : (
                                <>Este território de <span className="font-bold">{territory.city}</span> nunca recebeu uma visita registrada.</>
                            )}
                        </p>
                    </div>

                    <div className="pl-9 md:pl-0 w-full md:w-auto mt-1 md:mt-0">
                        <button
                            onClick={() => onAssignTerritory && onAssignTerritory(territory)}
                            className={`w-full md:w-auto bg-white dark:bg-surface text-main border ${buttonBorder} font-bold text-[10px] md:text-xs py-1.5 md:py-3 px-4 md:px-6 rounded-md flex items-center justify-center gap-2 ${buttonHover} transition-colors shadow-sm whitespace-nowrap`}
                        >
                            DESIGNAR <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        </button>
                    </div>
                </div>
            );
        });
    }

    const displayItems = limit ? items.slice(0, limit) : items;
    const hasMore = limit ? items.length > limit : false;

    if (items.length === 0) return null;

    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Centro de Ação
                </h2>
                {hasMore && (
                    <Link href="/notifications" className="text-[10px] font-bold text-primary hover:text-primary-dark hover:underline">
                        VER TODAS ({items.length})
                    </Link>
                )}
            </div>

            <div className="space-y-4">
                {displayItems}
            </div>

            {hasMore && (
                <div className="mt-4 text-center md:hidden">
                    <Link href="/notifications" className="inline-flex items-center gap-2 text-xs font-bold text-primary bg-primary-light dark:bg-primary-dark/20 px-4 py-2 rounded-full">
                        Ver mais {items.length - limit!} notificações <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            )}
        </div>
    );
}
