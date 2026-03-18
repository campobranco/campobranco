"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import {
    Map as MapIcon,
    Loader2,
    MapPin,
    Building2,
    ChevronRight,
    Share2,
    ThumbsUp,
    ThumbsDown,
    Home,
    Hand,
    ArrowLeft,
    User,
    Users,
    Ear,
    Baby,
    GraduationCap,
    FileText,
    History as HistoryIcon,
    Navigation,
    Lock,
    Brain,
    ChevronUp,
    ChevronDown,
    MoreVertical,
    Calendar
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import VisitReportModal from '@/app/components/VisitReportModal';
import VisitHistoryModal from '@/app/components/VisitHistoryModal';
import LoginRequestModal from '@/app/components/LoginRequestModal';
import AccessDeniedModal from '@/app/components/AccessDeniedModal';
import MapView from '@/app/components/MapView';
import BottomNav from '@/app/components/BottomNav';
import MapAppSelectModal from '@/app/components/MapAppSelectModal';
import { toast } from 'sonner';

import { getSharedListWithData } from '@/lib/services/shared_lists';
import { reportVisit, deleteVisitByAddressAndShare } from '@/lib/services/visits';

interface PreviewItem {
    id: string;
    name?: string;
    street?: string;
    number?: string;
    status?: string;
    residentName?: string;
    googleMapsLink?: string;
    wazeLink?: string;
    lat?: number;
    lng?: number;
    completed?: boolean;
    complement?: string;
    peopleCount?: number;
    gender?: 'HOMEM' | 'MULHER' | 'CASAL';
    isDeaf?: boolean;
    isMinor?: boolean;
    isStudent?: boolean;
    isNeurodivergent?: boolean;
    visitStatus?: string;
    territoryId?: string;
    cityId?: string;
    isActive?: boolean;
    observations?: string;
    lastVisitedAt?: any; // Firestore Timestamp or serialized object
    inactivatedAt?: string;
}

function SharedPreviewContent() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const shareId = searchParams.get('shareId');
    const { user, profileName } = useAuth();

    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [items, setItems] = useState<PreviewItem[]>([]);
    const [pageCongregationId, setPageCongregationId] = useState<string | null>(null);
    const [error, setError] = useState('');

    // Modals State
    const [selectedAddressForReport, setSelectedAddressForReport] = useState<PreviewItem | null>(null);
    const [selectedAddressForHistory, setSelectedAddressForHistory] = useState<string | null>(null);
    const [showLoginRequest, setShowLoginRequest] = useState(false);
    const [showAccessDenied, setShowAccessDenied] = useState(false);
    const [deniedResource, setDeniedResource] = useState('');
    const [isInactiveExpanded, setIsInactiveExpanded] = useState(false);
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
    const [mapAppSelect, setMapAppSelect] = useState<{ isOpen: boolean; address: PreviewItem } | null>(null);
    const [congregationType, setCongregationType] = useState<'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE' | null>(null);
    const isTraditional = congregationType === 'TRADITIONAL';

    const fetchData = useCallback(async () => {
        setLoading(true);
        if (!shareId || !id) {
            setError("Link incompleto.");
            setLoading(false);
            return;
        }

        try {
            console.log(`Buscando detalhes do preview (${id}) via serviço...`);
            // 1. Fetch Consolidated Data from Client Service
            const resData = await getSharedListWithData(shareId);

            const res = resData as any;
            if (!res.success) {
                if (res.status === 404 || res.error?.includes('not found')) setError("Lista compartilhada não encontrada.");
                else if (res.status === 403) setError("Link expirado ou sem acesso.");
                else setError(res.error || "Erro ao carregar link.");
                setLoading(false);
                return;
            }

            const { list: listData, items: fetchedItems, visits: visitsData, congregationCategory } = res;

            setPageCongregationId(listData.congregation_id || null);
            setCongregationType(congregationCategory as any);

            // 2. Identify "Main Data" (The Territory or City being previewed)
            // The items from the API contain all snapshots. One of them is our main territory/city.
            const mainDataRaw = fetchedItems.find((item: any) => (item.itemId || item.id) === id);

            if (!mainDataRaw) {
                setError("Item não encontrado.");
                setLoading(false);
                return;
            }
            const mainData = { ...(mainDataRaw.data || mainDataRaw), id: mainDataRaw.itemId || mainDataRaw.id };

            // 3. Process Addresses
            // Filter snapshots to get only relevant addresses for this territory/city
            // Addresses in snapshots usually have territory_id or city_id
            const addressesData = fetchedItems.filter((item: any) => {
                const sourceData = item.data || item;
                return type === 'city'
                    ? (sourceData.city_id || sourceData.cityId) === id
                    : (sourceData.territory_id || sourceData.territoryId) === id;
            });

            const addresses: PreviewItem[] = addressesData.map((a: any) => {
                const sourceData = a.data || a;
                return {
                    id: a.itemId || a.id,
                    street: sourceData.street,
                    number: sourceData.number,
                    complement: sourceData.complement,
                    residentName: sourceData.resident_name || sourceData.residentName,
                    googleMapsLink: sourceData.google_maps_link || sourceData.googleMapsLink,
                    lat: sourceData.lat,
                    lng: sourceData.lng,
                    isActive: sourceData.is_active !== false && sourceData.isActive !== false,
                    gender: sourceData.gender,
                    isDeaf: sourceData.is_deaf || sourceData.isDeaf,
                    isMinor: sourceData.is_minor || sourceData.isMinor,
                    isStudent: sourceData.is_student || sourceData.isStudent,
                    isNeurodivergent: sourceData.is_neurodivergent || sourceData.isNeurodivergent,
                    observations: sourceData.observations,
                    visitStatus: sourceData.visit_status || sourceData.visitStatus,
                    territoryId: sourceData.territory_id || sourceData.territoryId,
                    cityId: sourceData.city_id || sourceData.cityId,
                    inactivatedAt: sourceData.inactivated_at || sourceData.inactivatedAt
                };
            });

            // 4. Merge Results (Visits)
            const linkResults: Record<string, any> = {};
            if (visitsData) {
                visitsData.forEach((v: any) => {
                    linkResults[v.address_id] = v;
                });
            }

            // Merge
            const mergedItems = addresses.map(addr => {
                const visitRecord = linkResults[addr.id];
                const finalStatus = visitRecord?.status || 'none';
                return {
                    ...addr,
                    visitStatus: finalStatus,
                    visitNotes: visitRecord?.notes || '',
                    completed: finalStatus === 'contacted'
                };
            });

            // Sort merged items
            mergedItems.sort((a, b) => {
                const streetA = a.street || '';
                const streetB = b.street || '';
                if (streetA !== streetB) return streetA.localeCompare(streetB);
                const numA = parseInt(a.number || '0');
                const numB = parseInt(b.number || '0');
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return (a.number || '').localeCompare(b.number || '');
            });

            setTitle(mainData.name);
            setSubtitle(type === 'territory'
                ? `Território` + (mainData.notes ? ` - ${mainData.notes}` : '')
                : (mainData.description || mainData.notes || "Cidade")
            );
            setItems(mergedItems);
            setLoading(false);

        } catch (err) {
            console.error("Shared Preview API Error:", err);
            setError("Erro ao carregar dados.");
            setLoading(false);
        }
    }, [shareId, id, type]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Close dropdown when complying with effect
    useEffect(() => {
        const handleClickOutside = () => setActiveDropdownId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleSaveVisit = async (data: any) => {
        if (!selectedAddressForReport || !shareId) return;

        try {
            const visit_date = new Date().toISOString();

            // Prepare visit data
            const visitData = {
                address_id: selectedAddressForReport.id,
                territory_id: selectedAddressForReport.territoryId,
                user_id: user?.uid || null,
                status: data.status,
                notes: data.observations || '',
                visit_date: visit_date,
                tags_snapshot: {
                    is_deaf: data.isDeaf,
                    is_minor: data.isMinor,
                    is_student: data.isStudent,
                    is_neurodivergent: data.isNeurodivergent,
                    gender: data.gender
                }
            };

            // Send to Client-Side Service
            const resData = await reportVisit(shareId, visitData);

            if (!resData.success) {
                throw new Error(resData.error || 'Erro ao salvar visita');
            }

            // Refresh Local State (Optimistic + Server Fetch)
            setItems(prev => prev.map(item =>
                item.id === selectedAddressForReport.id
                    ? { ...item, visitStatus: data.status, visitNotes: data.observations || '', completed: data.status === 'contacted' }
                    : item
            ));

            fetchData();
            setSelectedAddressForReport(null);
            toast.success("Visita registrada com sucesso!");

        } catch (error: any) {
            console.error("Error saving visit:", error);
            toast.error(error.message || "Erro ao salvar visita. Tente novamente.");
        }
    };

    const handleDeleteVisit = async () => {
        if (!selectedAddressForReport || !shareId) return;

        try {
            const resData = await deleteVisitByAddressAndShare(selectedAddressForReport.id, shareId);

            if (!resData.success) {
                throw new Error(resData.error || 'Erro ao remover visita');
            }

            // Optimistic UI Update: Reset status to 'none' and clear visitNotes
            setItems(prev => prev.map(item =>
                item.id === selectedAddressForReport.id
                    ? { ...item, visitStatus: 'none', visitNotes: '', completed: false }
                    : item
            ));

            fetchData();
            setSelectedAddressForReport(null);
            toast.success("Resposta removida com sucesso!");

        } catch (error: any) {
            console.error("Error deleting visit:", error);
            toast.error(error.message || "Erro ao remover visita");
        }
    };
    // The code uses `shareId || null`.

    // If we have a shareId, we use it.


    const handleOpenMap = (item: PreviewItem) => {
        // Se ambos os links existirem, abre o modal de seleção
        if (item.googleMapsLink && item.wazeLink) {
            setMapAppSelect({ isOpen: true, address: item });
            return;
        }

        const exactLink = item.googleMapsLink || item.wazeLink;

        if (exactLink) {
            window.open(exactLink, '_blank');
            return;
        }

        // Se não houver links salvos, tenta abrir via coordenadas ou endereço (query)
        let url = '';
        if (item.lat && item.lng) {
            url = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
        } else {
            const query = `${item.street}${item.number ? `, ${item.number}` : ''}`;
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            const isAndroid = /Android/i.test(navigator.userAgent);

            if (isIOS) url = `maps://?q=${encodeURIComponent(query)}`;
            else if (isAndroid) url = `geo:0,0?q=${encodeURIComponent(query)}`;
            else url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
        }

        if (url) window.open(url, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-muted text-sm font-bold animate-pulse">Carregando...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-6">
                <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-400">
                        <MapIcon className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-bold text-main">Ops!</h1>
                    <p className="text-muted">{error}</p>
                </div>
            </div>
        );
    }



    // Group items
    const activeItems = items.filter(i => i.isActive !== false);
    const inactiveItems = items.filter(i => i.isActive === false);

    const renderItem = (item: PreviewItem, index: number) => {
        let href = '#';
        let isExternal = false;

        if (type === 'city') {
            href = `/share/preview?type=territory&id=${item.id}&shareId=${shareId || ''}`;
        } else if (type === 'territory') {
            if (item.googleMapsLink) {
                href = item.googleMapsLink;
                isExternal = true;
            } else if (item.lat && item.lng) {
                href = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
                isExternal = true;
            } else {
                href = '#';
            }
        }

        // Handler for clicking the whole card (Report Action)
        const handleCardClick = (e: React.MouseEvent) => {
            // If it's a city, let the link handle it.
            if (type === 'city') return;

            // For territory (addresses):
            e.preventDefault(); // Stop default navigation (if any)

            if (user) {
                setSelectedAddressForReport(item);
            } else {
                setShowLoginRequest(true);
            }
        };

        const handleHistoryClick = (e: React.MouseEvent, itemId: string) => {
            e.stopPropagation();
            setSelectedAddressForHistory(itemId);
            setActiveDropdownId(null);
        };

        const toggleDropdown = (e: React.MouseEvent, itemId: string) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            setActiveDropdownId(activeDropdownId === itemId ? null : itemId);
        };

        // Conditionally render wrapper: Link for City, Div for Territory (Address)
        const Wrapper = type === 'city' ? Link : 'div';
        // Add 'block' to ensure it takes width, but for Territory acts as div
        const wrapperProps = type === 'city' ? { href, className: 'block group' } : { className: 'block group cursor-pointer', onClick: handleCardClick };

        return (
            <Wrapper key={item.id} {...(wrapperProps as any)}>
                {/* Main Card Container - Matching Address List padding and styles */}
                <div className={`bg-surface rounded-md p-4 border-2 shadow-sm hover:shadow-md transition-all relative 
                    ${item.isActive === false ? 'opacity-60 grayscale' : ''} 
                    ${activeDropdownId === item.id ? 'relative z-20 ring-1 ring-primary-100 dark:ring-primary-900' : ''}
                    ${item.visitStatus && item.visitStatus !== 'none'
                        ? item.visitStatus === 'contacted' || item.visitStatus === 'contested' ? 'border-green-500 bg-green-50/30 dark:bg-green-900/10'
                            : item.visitStatus === 'not_contacted' ? 'border-orange-500 bg-orange-50/30 dark:bg-orange-900/10'
                                : item.visitStatus === 'moved' ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/10'
                                    : item.visitStatus === 'do_not_visit' ? 'border-red-500 bg-red-50/30 dark:bg-red-900/10'
                                        : 'border-surface-border'
                        : 'border-surface-border'
                    }
                `}>

                    <div className="flex items-center gap-3">

                        {/* 1. Icon / Badge Section */}
                        {type === 'city' ? (
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border transition-colors bg-gray-50 dark:bg-gray-800 text-muted group-hover:bg-primary-light/50 dark:group-hover:bg-primary-dark/30 group-hover:text-primary dark:group-hover:text-primary-light">
                                <MapIcon className="w-6 h-6" />
                            </div>
                        ) : (
                            // Address List Logic for Badge
                            (() => {
                                // 1. Priority: Visit Status Badge (if already visited)
                                if (item.visitStatus && item.visitStatus !== 'none') {
                                    let badgeStyles = "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
                                    let StatusIcon = User;

                                    if (item.visitStatus === 'contacted' || item.visitStatus === 'contested') {
                                        badgeStyles = "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800";
                                        StatusIcon = ThumbsUp;
                                    } else if (item.visitStatus === 'not_contacted') {
                                        badgeStyles = "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800";
                                        StatusIcon = ThumbsDown;
                                    } else if (item.visitStatus === 'moved') {
                                        badgeStyles = "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800";
                                        StatusIcon = Home;
                                    } else if (item.visitStatus === 'do_not_visit') {
                                        badgeStyles = "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800";
                                        StatusIcon = Hand;
                                    }

                                    return (
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border transition-colors ${badgeStyles}`}>
                                            <StatusIcon className={`w-5 h-5 ${item.visitStatus === 'contacted' || item.visitStatus === 'contested' ? 'fill-current' : ''}`} />
                                        </div>
                                    );
                                }

                                // 2. Fallback: Gender Mode (Sign Language / Foreign)
                                if (!isTraditional && item.gender) {
                                    let badgeStyles = "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
                                    if (item.gender === 'HOMEM') {
                                        badgeStyles = "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
                                    } else if (item.gender === 'MULHER') {
                                        badgeStyles = "bg-pink-100 text-pink-600 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800";
                                    } else if (item.gender === 'CASAL') {
                                        badgeStyles = "bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
                                    }

                                    return (
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border transition-colors ${badgeStyles}`}>
                                            {item.gender === 'CASAL' ? (
                                                <div className="flex -space-x-1.5">
                                                    <User className="w-4 h-4 fill-current" />
                                                    <User className="w-4 h-4 fill-current" />
                                                </div>
                                            ) : (
                                                <User className="w-5 h-5 fill-current" />
                                            )}
                                        </div>
                                    );
                                }

                                // Traditional Numeric Badge
                                return (
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border bg-primary-50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-400 border-primary-100 dark:border-primary-900/20 transition-colors">
                                        <span className="text-sm font-bold">{index + 1}</span>
                                    </div>
                                );
                            })()
                        )}

                        {/* 2. Content Section */}
                        <div className="flex-1 min-w-0">
                            {type === 'city' ? (
                                <>
                                    <h3 className="font-bold text-main truncate group-hover:text-primary-dark dark:group-hover:text-primary-light transition-colors">{item.name}</h3>
                                    <p className="text-xs text-muted mt-0.5 group-hover:text-blue-400/80">Ver Endereços</p>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-main text-base truncate">
                                            {item.street}
                                            {!isTraditional && !item.street?.includes(item.number || '') && item.number !== 'S/N' ? `, ${item.number}` : ''}
                                            {item.complement ? ` - ${item.complement}` : ''}
                                        </h3>
                                        {!user && <Lock className="w-3 h-3 text-muted" />}
                                    </div>

                                    <div className={`flex flex-wrap items-center gap-2 mt-1 text-xs text-muted ${item.visitStatus && item.visitStatus !== 'none' ? 'grayscale opacity-70' : ''}`}>
                                        {item.peopleCount ? (
                                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md" title="Número de Pessoas">
                                                <Users className="w-3 h-3" />
                                                <span className="font-bold">{item.peopleCount}</span>
                                            </div>
                                        ) : null}

                                        {!isTraditional && item.residentName && <span className="font-semibold text-gray-700 dark:text-gray-300">{item.residentName}</span>}

                                        {!isTraditional && (
                                            <>
                                                {item.isDeaf && (
                                                    <span className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                                        <Ear className="w-3 h-3" /> Surdo
                                                    </span>
                                                )}
                                                {item.isMinor && (
                                                    <span className="flex items-center gap-1 bg-primary-light/50 dark:bg-primary-dark/30 text-primary-dark dark:text-primary-light px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                                        <Baby className="w-3 h-3" /> Menor
                                                    </span>
                                                )}
                                                {item.isStudent && (
                                                    <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                                        <GraduationCap className="w-3 h-3" /> Estudante
                                                    </span>
                                                )}
                                                {item.isNeurodivergent && (
                                                    <span className="flex items-center gap-1 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                                        <Brain className="w-3 h-3" /> Neurodivergente
                                                    </span>
                                                )}

                                                {/* Deactivation Date */}
                                                {item.isActive === false && item.inactivatedAt && (
                                                    <span className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase border border-red-100 dark:border-red-900/30">
                                                        <Calendar className="w-3 h-3" /> Desativado em: {new Date(item.inactivatedAt).toLocaleDateString('pt-BR')}
                                                    </span>
                                                )}
                                            </>
                                        )}

                                        {item.observations && (
                                            <div className="flex items-center gap-1 mt-1 text-xs text-muted w-full">
                                                <FileText className="w-3 h-3 shrink-0" />
                                                <p className="truncate">{item.observations}</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* 3. Actions Section */}
                        {type === 'territory' && (
                            <div className="relative">
                                <button
                                    onClick={(e) => toggleDropdown(e, item.id)}
                                    className={`p-2 rounded-full transition-colors ${activeDropdownId === item.id ? 'bg-primary-light/50 dark:bg-primary-dark/30 text-primary-dark dark:text-primary-light' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </button>

                                {activeDropdownId === item.id && (
                                    <div className="absolute right-0 top-10 bg-surface rounded-xl shadow-xl border border-surface-border p-1 z-20 min-w-[160px] animate-in fade-in zoom-in-95 duration-200">

                                        {/* Dropdown Options */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenMap(item);
                                                setActiveDropdownId(null);
                                            }}
                                            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors w-full text-left"
                                        >
                                            <Navigation className="w-4 h-4" />
                                            Abrir no Mapa
                                        </button>

                                        <button
                                            onClick={(e) => handleHistoryClick(e, item.id)}
                                            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors w-full text-left"
                                        >
                                            <HistoryIcon className="w-4 h-4" />
                                            Abrir Histórico
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Arrow for City */}
                        {type === 'city' && (
                            <div className="p-1">
                                <ChevronRight className="w-5 h-5 text-muted group-hover:text-primary dark:group-hover:text-primary-light transition-colors" />
                            </div>
                        )}

                    </div>
                </div>
            </Wrapper>
        );
    };

    return (
        <div className="bg-background min-h-screen font-sans pb-10 text-main">
            {/* Header */}
            <header className="px-6 py-6 bg-surface border-b border-surface-border flex items-center gap-4 sticky top-0 z-20">
                <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-muted hover:text-main" />
                </button>
                <div className="flex flex-col">
                    <h1 className="font-bold text-lg text-main leading-tight">{title}</h1>
                    <span className="text-xs text-primary dark:text-primary-light font-bold uppercase tracking-wider">{subtitle}</span>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-5 py-8 space-y-4">
                {items.length === 0 ? (
                    <div className="text-center py-12 opacity-50">
                        <MapIcon className="w-12 h-12 mx-auto mb-3 text-muted" />
                        <p className="text-muted font-medium">Nenhum item encontrado.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeItems.map((item, idx) => renderItem(item, idx))}

                        {inactiveItems.length > 0 && (
                            <>
                                <button
                                    onClick={() => setIsInactiveExpanded(!isInactiveExpanded)}
                                    className="w-full pt-8 pb-4 flex items-center gap-4 group cursor-pointer focus:outline-none"
                                >
                                    <div className="h-px bg-surface-border flex-1 group-hover:bg-gray-300 transition-colors"></div>
                                    <div className="flex items-center gap-2 text-muted group-hover:text-main transition-colors">
                                        <span className="text-xs font-bold uppercase tracking-widest">Desativados ({inactiveItems.length})</span>
                                        {isInactiveExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </div>
                                    <div className="h-px bg-surface-border flex-1 group-hover:bg-gray-300 transition-colors"></div>
                                </button>

                                {isInactiveExpanded && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                                        {inactiveItems.map((item, idx) => renderItem(item, activeItems.length + idx))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </main>

            {/* Map View for Territory */}
            {type === 'territory' && items.length > 0 && (
                <div className="h-[40vh] w-full relative border-t border-surface-border mt-4">
                    <MapView
                        items={items.filter(i => i.isActive !== false).map(a => {
                            let streetClean = a.street?.split('-')[0].trim() || '';
                            if (a.number && a.number !== 'S/N') {
                                const numberRegex = new RegExp(`[\\s,]+${a.number}$`);
                                streetClean = streetClean.replace(numberRegex, '').trim();
                            }

                            // Map shared-list specific status to MapView status
                            let mapStatus: any = 'AGUARDANDO'; // Default Gray for shared links
                            if (a.visitStatus === 'contacted') mapStatus = 'OCUPADO';
                            else if (a.visitStatus === 'not_contacted') mapStatus = 'NAO_CONTATADO';
                            else if (a.visitStatus === 'moved') mapStatus = 'MUDOU';
                            else if (a.visitStatus === 'do_not_visit') mapStatus = 'NAO_VISITAR';

                            return {
                                id: a.id,
                                lat: a.lat,
                                lng: a.lng,
                                title: `${streetClean}, ${a.number}`,
                                subtitle: a.complement || '',
                                status: mapStatus,
                                number: a.number,
                                residentName: a.residentName, // Pass resident name for display
                                fullAddress: `${streetClean}, ${a.number}, Brasil`,
                                googleMapsLink: a.googleMapsLink,
                                gender: a.gender,
                                lastVisit: a.lastVisitedAt ? (() => {
                                    try {
                                        // Handle FireStore Timestamp (seconds) or String
                                        if (typeof a.lastVisitedAt === 'string') return new Date(a.lastVisitedAt).toLocaleDateString();
                                        // @ts-ignore
                                        if (a.lastVisitedAt.seconds) return new Date(a.lastVisitedAt.seconds * 1000).toLocaleDateString();
                                        return '';
                                    } catch (e) { return ''; }
                                })() : undefined,
                                isDeaf: a.isDeaf,
                                isMinor: a.isMinor,
                                isStudent: a.isStudent,
                                isNeurodivergent: a.isNeurodivergent
                            };
                        })}
                    />
                </div>
            )}


            {/* Modals */}
            {selectedAddressForReport && (
                <VisitReportModal
                    address={selectedAddressForReport}
                    onClose={() => setSelectedAddressForReport(null)}
                    onSave={handleSaveVisit}
                    onDelete={handleDeleteVisit}
                    forcedCongregationType={congregationType || undefined}
                    onViewHistory={() => {
                        setSelectedAddressForReport(null);
                        setSelectedAddressForHistory(selectedAddressForReport.id);
                    }}
                />
            )}

            {selectedAddressForHistory && (
                <VisitHistoryModal
                    addressId={selectedAddressForHistory}
                    onClose={() => setSelectedAddressForHistory(null)}
                    isSharedView={true}
                />
            )}

            {showLoginRequest && (
                <LoginRequestModal
                    onClose={() => setShowLoginRequest(false)}
                />
            )}

            {showAccessDenied && (
                <AccessDeniedModal
                    resourceName={deniedResource}
                    onClose={() => setShowAccessDenied(false)}
                />
            )}

            {/* Map App Selection Modal */}
            <MapAppSelectModal
                isOpen={!!mapAppSelect?.isOpen}
                onClose={() => setMapAppSelect(null)}
                address={mapAppSelect?.address || {}}
            />

            {/* Bottom Nav for Authenticated Users */}
            {user && <BottomNav />}
        </div>
    );
}

export default function SharedPreviewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-muted text-sm font-bold animate-pulse">Carregando...</p>
                </div>
            </div>
        }>
            <SharedPreviewContent />
        </Suspense>
    );
}
