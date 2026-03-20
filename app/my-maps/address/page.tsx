"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { toast } from 'sonner';
import {
    Search, MapPin, Navigation, Pencil, Trash2,
    Loader2, ArrowLeft, Home, GripVertical, MoreVertical,
    X, CheckCircle, MousePointer2, History as HistoryIcon,
    FileText, User, Ear, Baby, GraduationCap, Brain,
    Truck, Calendar, Hand, Info, ChevronDown, ChevronUp, Map as MapIcon, Plus, Users
} from 'lucide-react';
import dynamic from 'next/dynamic';

const VisitHistoryModal = dynamic(() => import('@/app/components/VisitHistoryModal'), {
    loading: () => <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" /></div>
});
const BottomNav = dynamic(() => import('@/app/components/BottomNav'), { ssr: false });
import ConfirmationModal from '@/app/components/ConfirmationModal';
import { MapSkeleton } from '@/app/components/Skeleton';

const MapView = dynamic(() => import('@/app/components/MapView'), {
    loading: () => <MapSkeleton />,
    ssr: false
});
const MapAppSelectModal = dynamic(() => import('@/app/components/MapAppSelectModal'));
import type { MapItem } from '@/app/components/MapView';
import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    onSnapshot,
    orderBy,
    limit,
    writeBatch,
    or,
    and
} from "firebase/firestore";
import { db } from '@/lib/firebase';
import { geocodeAddress } from '@/lib/services/geocoding';
import { getAddresses, saveAddress, deleteAddress } from '@/lib/services/addresses';
import { deleteVisit } from '@/lib/services/visits';
import { getMapsContext } from '@/lib/services/territories';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { getServiceYear, getServiceYearRange } from '@/lib/serviceYearUtils';
import { useRouter, useSearchParams } from 'next/navigation';
import CSVActionButtons from '@/app/components/CSVActionButtons';
import AddressActionsMenu from '@/app/components/AddressActionsMenu';
import DropDownItem from '@/app/components/DropDownItem';

interface Address {
    id: string;
    street: string;
    territoryId?: string;
    congregationId?: string;
    cityId?: string;
    completed?: boolean;
    visitedAt?: string;
    lat?: number;
    lng?: number;
    isActive?: boolean;
    googleMapsLink?: string;
    wazeLink?: string;
    residentName?: string;
    isDeaf?: boolean;
    isMinor?: boolean;
    isStudent?: boolean;
    observations?: string;
    gender?: 'HOMEM' | 'MULHER' | 'CASAL';
    isNeurodivergent?: boolean;
    visitStatus?: 'contacted' | 'notContacted' | 'moved' | 'doNotVisit' | 'none';
    lastVisitedAt?: string;
    sortOrder?: number;
    inactivatedAt?: string;
    residentsCount?: number;
}

function AddressListContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const congregationId = searchParams.get('congregationId') || '';
    const cityId = searchParams.get('cityId') || '';
    const territoryId = searchParams.get('territoryId') || '';
    const editAddressId = searchParams.get('edit');

    const { user, isAdmin, isAdminRoleGlobal, isElder, isServant, loading: authLoading, congregationType: authCongregationType, termType } = useAuth();
    const [localCongregationType, setLocalCongregationType] = useState<'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE' | null>(null);
    const isTraditional = (localCongregationType || authCongregationType) === 'TRADITIONAL';
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [historyAddressId, setHistoryAddressId] = useState<string | null>(null);
    const [localTermType, setLocalTermType] = useState<'city' | 'neighborhood'>('city');
    const [parentCity, setParentCity] = useState<string | null>(null);
    const [mapAppSelect, setMapAppSelect] = useState<{ isOpen: boolean, address: any } | null>(null);

    const serviceYearRange = useState(() => getServiceYearRange(getServiceYear()))[0];

    // Redirect Publishers from general Maps entry or unassigned territories
    useEffect(() => {
        if (!authLoading && user && !isServant && territoryId) {
            const checkAssignment = async () => {
                try {
                    const listsRef = collection(db, 'shared_lists');
                    const q = query(
                        listsRef,
                        and(
                            where('territoryId', '==', territoryId),
                            where('assignedTo', '==', user.uid)
                        ),
                        limit(1)
                    );
                    const qSnap = await getDocs(q);
                    const activeList = qSnap.docs.find(d => d.data().status !== 'completed' && d.data().status !== 'archived');

                    if (!activeList) {
                        toast.error("VocÃª nÃ£o tem permissÃ£o para acessar este mapa ou ele jÃ¡ foi devolvido.");
                        router.replace('/dashboard');
                    }
                } catch (e) {
                    console.error("Check assignment error:", e);
                }
            };
            checkAssignment();
        }
        else if (!authLoading && user && !isServant && !territoryId) {
            router.replace('/dashboard');
        }
    }, [user, authLoading, isServant, territoryId, router, congregationId, loading]);

    // Form State
    const [combinedAddress, setCombinedAddress] = useState(''); // Single input for "Street, Number"
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    // New Fields
    const [isActive, setIsActive] = useState(true);
    const [googleMapsLink, setGoogleMapsLink] = useState('');
    const [wazeLink, setWazeLink] = useState('');
    const [residentsCount, setResidentsCount] = useState('1'); // Quantidade de residentes no endereÃ§o
    // Gender Stats State: territoryId -> { men: number, women: number, couples: number }
    const [genderStats, setGenderStats] = useState<Record<string, { men: number, women: number, couples: number }>>({});
    const [residentName, setResidentName] = useState('');
    const [gender, setGender] = useState<'HOMEM' | 'MULHER' | 'CASAL' | ''>('');
    const [isDeaf, setIsDeaf] = useState(false);
    const [isMinor, setIsMinor] = useState(false);
    const [isStudent, setIsStudent] = useState(false);
    const [isNeurodivergent, setIsNeurodivergent] = useState(false);
    const [observations, setObservations] = useState('');

    // Context Selection State
    const [selectedCongregationId, setSelectedCongregationId] = useState(congregationId);
    const [selectedCityId, setSelectedCityId] = useState(cityId);
    const [selectedTerritoryId, setSelectedTerritoryId] = useState(territoryId);

    // UI State
    const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isInactiveExpanded, setIsInactiveExpanded] = useState(false);
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [isMapSelectionMode, setIsMapSelectionMode] = useState(true);
    const [pickerTempCoords, setPickerTempCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [isGeocodingMap, setIsGeocodingMap] = useState(false);

    const handleMapSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!mapSearchQuery.trim()) return;

        setIsGeocodingMap(true);
        try {
            const results = await geocodeAddress(mapSearchQuery);
            if (results && results.length > 0) {
                const { lat, lon } = results[0];
                const newCoords = { lat: parseFloat(lat), lng: parseFloat(lon) };
                setPickerTempCoords(newCoords);
                setIsMapSelectionMode(true);
                toast.success("LocalizaÃ§Ã£o encontrada!");
            } else {
                toast.error("EndereÃ§o nÃ£o encontrado");
            }
        } catch (error) {
            console.error("Error geocoding in picker:", error);
            toast.error("Erro ao pesquisar endereÃ§o");
        } finally {
            setIsGeocodingMap(false);
        }
    };

    // View Mode
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    // Multi-select state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        variant: 'info' as 'info' | 'danger',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        onConfirm: () => { },
        onCancel: undefined as (() => void) | undefined
    });
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareExpiration, setShareExpiration] = useState('24h');

    // Map Picker State
    const [isPickingLocation, setIsPickingLocation] = useState(false);

    const [availableCongregations, setAvailableCongregations] = useState<{ id: string, name: string }[]>([]);
    const [availableCities, setAvailableCities] = useState<{ id: string, name: string }[]>([]);
    const [availableTerritories, setAvailableTerritories] = useState<{ id: string, name: string }[]>([]);

    // Context Names State
    const [contextNames, setContextNames] = useState({
        congregation: '',
        city: '',
        territory: ''
    });

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        if (openMenuId) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [openMenuId]);

    // Fetch Context Names & Options
    useEffect(() => {
        if (!congregationId || !cityId || !territoryId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const resData = await getMapsContext(congregationId, cityId, territoryId);

                if (!resData.success) {
                    throw new Error(resData.error || 'Erro ao buscar contexto superior');
                }

                const congResData = resData.congregation;
                const cityResData = resData.city;
                const terrResData = resData.territory;

                // Concatenando o numero com descricao para exibir no cabeÃ§alho
                let territoryDisplayName = 'NÃ£o encontrada';
                if (terrResData) {
                    territoryDisplayName = (terrResData as any).name;
                    if ((terrResData as any).notes) {
                        territoryDisplayName += ` - ${(terrResData as any).notes}`;
                    }
                }

                setContextNames({
                    congregation: (congResData as any)?.name || 'NÃ£o encontrada',
                    city: (cityResData as any)?.name || 'NÃ£o encontrada',
                    territory: territoryDisplayName
                });

                if (congResData) {
                    setLocalTermType((congResData as any).termType as any || 'city');
                    const cat = ((congResData as any).category || '').toLowerCase();
                    if (cat.includes('sinais') || cat.includes('sign')) setLocalCongregationType('SIGN_LANGUAGE');
                    else if (cat.includes('estrangeir') || cat.includes('foreign')) setLocalCongregationType('FOREIGN_LANGUAGE');
                    else setLocalCongregationType('TRADITIONAL');
                }
                if (cityResData) {
                    setParentCity((cityResData as any).parentCity || null);
                }

            } catch (error) {
                console.error("Error fetching context:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [congregationId, cityId, territoryId]);


    // Fetch Addresses
    const fetchAddresses = useCallback(async () => {
        if (!congregationId || !territoryId) return;

        try {
            const resData = await getAddresses(congregationId, cityId, territoryId);
            console.log("[Debug] EndereÃ§os recebidos:", resData);

            if (!resData.success) {
                throw new Error(resData.error || 'Erro ao buscar endereÃ§os');
            }

            const data = (resData.addresses || []).map((addr: any) => ({
                ...addr,
                residentsCount: addr.residentsCount || 1
            }));

            const sorted = data.sort((a: any, b: any) => {
                const orderA = a.sortOrder ?? 999999;
                const orderB = b.sortOrder ?? 999999;
                if (orderA !== orderB) return orderA - orderB;
                return a.street.localeCompare(b.street);
            });

            setAddresses(sorted as Address[]);
        } catch (error: any) {
            console.error("Error fetching addresses:", error);
            toast.error(error.message || "Erro ao carregar endereÃ§os.");
        } finally {
            setLoading(false);
        }
    }, [congregationId, cityId, territoryId]);

    useEffect(() => {
        fetchAddresses();

        if (territoryId && congregationId && db) {
            const addressesRef = collection(db, 'addresses');
            const q = query(
                addressesRef,
                where('congregationId', '==', congregationId),
                where('territoryId', '==', territoryId)
            );

            const unsubscribe = onSnapshot(q, {
                next: () => {
                    fetchAddresses();
                },
                error: (error) => {
                    // Usamos warn para nÃ£o disparar o bug report, jÃ¡ que temos fallback via API
                    console.warn("[SnapShot] Listener de endereÃ§os limitado:", error.message);
                    if (error.code === 'permission-denied') {
                        // Silencioso: fallback jÃ¡ estÃ¡ em aÃ§Ã£o
                    }
                }
            });

            return () => unsubscribe();
        }
    }, [congregationId, territoryId, fetchAddresses]);

    // Fetch Available Options for Edit Modal
    useEffect(() => {
        if (!isCreateModalOpen) return;

        const fetchOptions = async () => {
            try {
                // Fetch Cities
                if (selectedCongregationId) {
                    const citiesRef = collection(db, 'cities');
                    const qCities = query(citiesRef, where('congregationId', '==', selectedCongregationId));
                    const citiesSnap = await getDocs(qCities);
                    setAvailableCities(citiesSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
                }

                // Fetch Territories
                if (selectedCongregationId && selectedCityId) {
                    const territoriesRef = collection(db, 'territories');
                    const qTerrs = query(
                        territoriesRef,
                        where('congregationId', '==', selectedCongregationId),
                        where('cityId', '==', selectedCityId)
                    );
                    const terrsSnap = await getDocs(qTerrs);
                    const terrs = terrsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
                    const sortedT = terrs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
                    setAvailableTerritories(sortedT);
                }

                if (congregationId) {
                    const congRef = doc(db, 'congregations', congregationId);
                    const congSnap = await getDoc(congRef);
                    if (congSnap.exists()) {
                        setAvailableCongregations([{ id: congSnap.id, name: congSnap.data().name }]);
                    }
                }
            } catch (e) {
                console.error("Error fetching options:", e);
            }
        };

        fetchOptions();
    }, [isCreateModalOpen, selectedCongregationId, selectedCityId, congregationId]);


    // Init form
    useEffect(() => {
        if (!editingId && congregationId && cityId && territoryId) {
            setSelectedCongregationId(congregationId);
            setSelectedCityId(cityId);
            setSelectedTerritoryId(territoryId);
        }
    }, [isCreateModalOpen, editingId, congregationId, cityId, territoryId]);

    // Handle edit parameter from URL
    useEffect(() => {
        if (editAddressId && addresses.length > 0) {
            const addressToEdit = addresses.find(addr => addr.id === editAddressId);
            if (addressToEdit) {
                handleEditAddress(addressToEdit);
                // Remove o parÃ¢metro edit da URL para nÃ£o abrir novamente em refresh
                const url = new URL(window.location.href);
                url.searchParams.delete('edit');
                router.replace(url.pathname + url.search, { scroll: false });
            }
        }
    }, [editAddressId, addresses, fetchAddresses, router, searchParams]);



    // Actions
    const handleCreateAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!combinedAddress.trim()) {
            toast.error("Preencha o EndereÃ§o Completo para salvar.");
            return;
        }

        try {
            const addressData = {
                street: combinedAddress.trim(),
                territoryId: selectedTerritoryId,
                congregationId: selectedCongregationId,
                cityId: selectedCityId,
                lat: lat ? parseFloat(lat) : null,
                lng: lng ? parseFloat(lng) : null,
                isActive: isActive,
                googleMapsLink: googleMapsLink,
                wazeLink: wazeLink,
                residentName: residentName,
                residentsCount: residentsCount ? parseInt(residentsCount) : 1,
                gender: (gender as any) || null,
                isDeaf: isDeaf,
                isMinor: isMinor,
                isStudent: isStudent,
                isNeurodivergent: isNeurodivergent,
                observations
            };

            const resData = await saveAddress(editingId || null, addressData);

            if (!resData.success) {
                throw new Error(resData.error || 'Erro ao salvar endereÃ§o');
            }

            toast.success(editingId ? "EndereÃ§o atualizado com sucesso!" : "EndereÃ§o cadastrado com sucesso!");
            fetchAddresses();
            resetForm();
        } catch (error: any) {
            console.error("Error saving address:", error);
            toast.error(error.message || "Erro ao salvar endereÃ§o.");
        }
    };

    const resetForm = () => {
        setCombinedAddress('');
        setLat('');
        setLng('');
        setIsActive(true);
        setGoogleMapsLink('');
        setWazeLink('');
        setResidentsCount('1');
        setResidentName('');
        setGender('');
        setIsDeaf(false);
        setIsMinor(false);
        setIsStudent(false);
        setIsNeurodivergent(false);
        setObservations('');
        setEditingId(null);
        setIsCreateModalOpen(false);
    };

    const handleEditAddress = (addr: Address) => {
        setEditingId(addr.id);
        setCombinedAddress(addr.street);
        setLat(addr.lat ? addr.lat.toString() : '');
        setLng(addr.lng ? addr.lng.toString() : '');
        setIsActive(addr.isActive !== false);
        setGoogleMapsLink(addr.googleMapsLink || '');
        setWazeLink(addr.wazeLink || '');
        setResidentsCount(addr.residentsCount ? addr.residentsCount.toString() : '1');
        setResidentName(addr.residentName || '');
        setGender(addr.gender || '');
        setIsDeaf(!!addr.isDeaf);
        setIsMinor(!!addr.isMinor);
        setIsStudent(!!addr.isStudent);
        setIsNeurodivergent(!!addr.isNeurodivergent);
        setObservations(addr.observations || '');
        
        if (addr.congregationId) setSelectedCongregationId(addr.congregationId);
        if (addr.cityId) setSelectedCityId(addr.cityId);
        if (addr.territoryId) setSelectedTerritoryId(addr.territoryId);
        
        setIsCreateModalOpen(true);
    };

    const handleDeleteAddress = (id: string) => {
        setAddressToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteAddress = async () => {
        if (!addressToDelete) return;
        setIsDeleting(true);
        try {
            const resData = await deleteAddress(addressToDelete);
            if (!resData.success) throw new Error(resData.error);

            toast.success("EndereÃ§o excluÃ­do com sucesso!");
            fetchAddresses();
            setIsDeleteDialogOpen(false);
            setAddressToDelete(null);
            setOpenMenuId(null);
        } catch (error: any) {
            console.error("Error deleting address:", error);
            toast.error(error.message || "Erro ao excluir endereÃ§o.");
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
        setIsSelectionMode(newSelected.size > 0);
    };

    const handleConfirmShare = async () => {
        if (selectedIds.size === 0) return;
        toast.info("Compartilhamento em desenvolvimento.");
        setIsShareModalOpen(false);
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        if (id === draggedId) return;
        const overIndex = addresses.findIndex(a => a.id === id);
        const dragIndex = addresses.findIndex(a => a.id === draggedId);
        if (dragIndex === -1 || overIndex === -1) return;

        const newAddresses = [...addresses];
        const [removed] = newAddresses.splice(dragIndex, 1);
        newAddresses.splice(overIndex, 0, removed);
        setAddresses(newAddresses);
    };

    const handleDragEnd = async () => {
        if (!draggedId) return;
        setDraggedId(null);

        try {
            const batch = writeBatch(db);
            addresses.forEach((addr, index) => {
                const addrRef = doc(db, 'addresses', addr.id);
                batch.update(addrRef, { sortOrder: index });
            });
            await batch.commit();
            toast.success("Ordem dos endereÃ§os atualizada!");
        } catch (error) {
            console.error("Error updating sort order:", error);
            toast.error("Erro ao salvar nova ordem dos endereÃ§os.");
        }
    };

    const filteredAddresses = addresses.filter(a =>
        // Pesquisa apenas pelo campo unificado de endereÃ§o
        a.street.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeAddresses = filteredAddresses.filter(a => a.isActive !== false);
    const inactiveAddresses = filteredAddresses.filter(a => a.isActive === false);

    const handleGeocodeSuccess = async (id: string, lat: number, lng: number) => {
        try {
            const addrRef = doc(db, 'addresses', id);
            await updateDoc(addrRef, { lat, lng });
        } catch (error) {
            console.error("Error syncing geocoded coords:", error);
        }
    };

    const handleOpenMap = (item: any) => {
        const googleLink = item.googleMapsLink;
        const wazeLink = item.wazeLink;

        if (googleLink && wazeLink) {
            setMapAppSelect({ isOpen: true, address: item });
            return;
        }

        const exactLink = googleLink || wazeLink;

        if (exactLink) {
            window.open(exactLink, '_blank');
            return;
        }

        // Usa o endereÃ§o completo para abrir no mapa (busca padrÃ£o)
        const query = item.street;
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isAndroid = /Android/i.test(navigator.userAgent);
        let url = '';
        if (isIOS) url = `maps://?q=${encodeURIComponent(query)}`;
        else if (isAndroid) url = `geo:0,0?q=${encodeURIComponent(query)}`;
        else url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

        window.open(url, '_blank');
    };

    const handleApproveDNV = async (addr: Address) => {
        try {
            const addressData = {
                id: addr.id,
                isActive: false,
                inactivatedAt: new Date().toISOString()
            };

            const resData = await saveAddress(addr.id, addressData as any);
            if (!resData.success) throw new Error(resData.error);

            toast.success("EndereÃ§o desativado com sucesso!");
            fetchAddresses();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro ao aprovar solicitaÃ§Ã£o.");
        }
    };

    const handleRemoveDNVMark = async (addr: Address) => {
        try {
            // Fetch the latest visit for this address to delete it
            const visitsRef = collection(db, 'visits');
            const q = query(
                visitsRef,
                where('addressId', '==', addr.id),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const qSnap = await getDocs(q);
            const latestVisit = qSnap.docs[0];

            if (!latestVisit) throw new Error("NÃ£o foi possÃ­vel encontrar a visita relacionada.");

            const resData = await deleteVisit(latestVisit.id);
            if (!resData.success) throw new Error(resData.error);

            // Also reset the address document in Firestore
            try {
                await updateDoc(doc(db, 'addresses', addr.id), {
                    visitStatus: null,
                    lastVisitedAt: null,
                    lastVisitedBy: null
                });
            } catch (e) { console.warn(e); }

            toast.success("MarcaÃ§Ã£o removida com sucesso!");
            fetchAddresses();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro ao remover marcaÃ§Ã£o.");
        }
    };

    const handleToggleActive = async (addr: Address) => {
        try {
            const currentActive = addr.isActive ?? true;

            const addressData = {
                isActive: !currentActive,
                inactivatedAt: !currentActive ? new Date().toISOString() : null
            };

            const resData = await saveAddress(addr.id, addressData as any);
            if (!resData.success) throw new Error(resData.error);

            toast.success(`EndereÃ§o ${!currentActive ? 'inativado' : 'reativado'} com sucesso!`);
            fetchAddresses();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro ao atualizar status.");
        }
    };

    const handleMapClick = (clickLat: number, clickLng: number) => {
        if (isMapPickerOpen && isMapSelectionMode) {
            setPickerTempCoords({ lat: clickLat, lng: clickLng });
        }
    };

    // --- RENDER HELPERS ---
    const renderAddressCard = (addr: Address, index: number) => {
        const active = addr.isActive ?? true;

        return (
            <div
                key={addr.id}
                draggable={!isSelectionMode}
                onDragStart={(e) => handleDragStart(e, addr.id)}
                onDragOver={(e) => handleDragOver(e, addr.id)}
                onDragEnd={handleDragEnd}
                className={`group bg-surface rounded-md p-4 border shadow-md hover:shadow-md transition-all 
                    ${(addr.visitStatus === 'moved') ? 'border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' :
                        (addr.visitStatus === 'doNotVisit') ? 'border-2 border-red-500 bg-red-50/50 dark:bg-red-900/20' : 'border-surface-border'}
                    ${draggedId === addr.id ? 'opacity-20 transition-none scale-95' : ''} 
                    ${openMenuId === addr.id ? 'relative z-20 ring-1 ring-primary-100 dark:ring-primary-900' : ''}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-3 flex-1 min-w-0 ${active === false ? 'opacity-60 grayscale' : ''}`}>
                        {/* Drag Handle */}
                        {!isSelectionMode && (
                            <div className="cursor-grab active:cursor-grabbing text-muted hover:text-primary-500 transition-colors">
                                <GripVertical className="w-5 h-5" />
                            </div>
                        )}

                        {/* Checkbox for selection */}
                        {isSelectionMode && (
                            <div onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(addr.id)}
                                    onChange={() => toggleSelection(addr.id)}
                                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 bg-gray-50 dark:bg-gray-800"
                                />
                            </div>
                        )}

                        {/* Gender/Number Badge */}
                        {(() => {
                            let lastVisitFormatted = "Sem visitas este ano";
                            if (addr.lastVisitedAt) {
                                const lvDate = new Date(addr.lastVisitedAt);
                                lastVisitFormatted = `Ãšltima visita: ${lvDate.toLocaleDateString()}`;
                            }

                            // Mudou-se Highlight - Blue Home Icon
                            if (addr.visitStatus === 'moved') {
                                return (
                                    <div
                                        title="Morador Mudou-se"
                                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm border bg-blue-500 text-white border-blue-600 transition-colors"
                                    >
                                        <Home className="w-6 h-6" />
                                    </div>
                                );
                            }

                            // Gender Mode (Sign Language / Foreign)
                            if (!isTraditional && addr.gender) {
                                let badgeStyles = "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
                                if (addr.gender === 'HOMEM') {
                                    badgeStyles = "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
                                } else if (addr.gender === 'MULHER') {
                                    badgeStyles = "bg-pink-100 text-pink-600 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800";
                                } else if (addr.gender === 'CASAL') {
                                    badgeStyles = "bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
                                }

                                return (
                                    <div
                                        title={lastVisitFormatted}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm border transition-colors ${badgeStyles}`}
                                    >
                                        {addr.gender === 'CASAL' ? (
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

                            return (
                                <div
                                    title={lastVisitFormatted}
                                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border bg-primary-50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-400 border-primary-100 dark:border-primary-900/20 transition-colors"
                                >
                                    <span className="text-sm font-bold">{index + 1}</span>
                                </div>
                            );
                        })()}

                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-main text-base truncate">
                                {addr.street}
                            </h3>

                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted">
                                {!isTraditional && addr.residentName && <span className="font-semibold text-gray-700 dark:text-gray-300">{addr.residentName}</span>}

                                {!isTraditional && (
                                    <>
                                        {/* Resident Count Badge */}
                                        {addr.residentsCount && (
                                            <span className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase border border-indigo-100 dark:border-indigo-900/30">
                                                <Users className="w-3 h-3 text-indigo-500" /> {addr.residentsCount}
                                            </span>
                                        )}

                                        {addr.gender && (
                                            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase ${addr.gender === 'HOMEM' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                addr.gender === 'MULHER' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                                                    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                }`}>
                                                {addr.gender === 'HOMEM' && <User className="w-3 h-3 fill-current" />}
                                                {addr.gender === 'MULHER' && <User className="w-3 h-3 fill-current" />}
                                                {addr.gender === 'CASAL' && (
                                                    <div className="flex -space-x-1">
                                                        <User className="w-2.5 h-2.5 fill-current" />
                                                        <User className="w-2.5 h-2.5 fill-current" />
                                                    </div>
                                                )}
                                                {addr.gender === 'HOMEM' ? 'Homem' : addr.gender === 'MULHER' ? 'Mulher' : 'Casal'}
                                            </span>
                                        )}
                                        {addr.isDeaf && (
                                            <span className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                                <Ear className="w-3 h-3" /> Surdo
                                            </span>
                                        )}
                                        {addr.isMinor ? (
                                            <span className="flex items-center gap-1 bg-primary-light/50 dark:bg-primary-dark/30 text-primary-dark dark:text-primary-light px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                                <Baby className="w-3 h-3" /> Menor
                                            </span>
                                        ) : null}
                                        {addr.isStudent && (
                                            <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                                <GraduationCap className="w-3 h-3" /> Estudante
                                            </span>
                                        )}
                                        {addr.isNeurodivergent && (
                                            <span className="flex items-center gap-1 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                                <Brain className="w-3 h-3" /> Neurodivergente
                                            </span>
                                        )}
                                    </>
                                )}
                                {addr.visitStatus === 'moved' && (
                                    <span className="flex items-center gap-1 bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase">
                                        <Truck className="w-3 h-3" /> Mudou-se
                                    </span>
                                )}
                                {/* Deactivation Date for all inactive items */}
                                {addr.isActive === false && addr.inactivatedAt && (
                                    <span className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase border border-red-100 dark:border-red-900/30">
                                        <Calendar className="w-3 h-3" /> Desativado em: {new Date(addr.inactivatedAt).toLocaleDateString('pt-BR')}
                                    </span>
                                )}
                                {active !== false && addr.visitStatus === 'doNotVisit' && (
                                    <span className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase animate-pulse border border-red-200 dark:border-red-800">
                                        <Hand className="w-3 h-3" /> Pediu para nÃ£o ser visitado
                                    </span>
                                )}
                            </div>

                            {addr.observations && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-muted">
                                    <FileText className="w-3 h-3 shrink-0" />
                                    <p className="truncate">{addr.observations}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative flex items-center gap-2">
                        {addr.isActive !== false && addr.visitStatus === 'doNotVisit' && (isElder || isServant) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmModal({
                                        isOpen: true,
                                        title: "Pedido de NÃ£o Visitar",
                                        message: "Este morador solicitou nÃ£o ser visitado. O que deseja fazer?",
                                        variant: 'danger',
                                        confirmText: "Inativar EndereÃ§o",
                                        cancelText: "Remover MarcaÃ§Ã£o",
                                        onConfirm: () => {
                                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                            handleApproveDNV(addr);
                                        },
                                        onCancel: () => {
                                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                            handleRemoveDNVMark(addr);
                                        }
                                    });
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm transition-colors flex items-center gap-1 animate-pulse"
                            >
                                <Hand className="w-3 h-3" /> Gerenciar SolicitaÃ§Ã£o
                            </button>
                        )}
                        {(isElder || isServant) ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(openMenuId === addr.id ? null : addr.id);
                                }}
                                className={`p-2 rounded-full transition-colors ${openMenuId === addr.id ? 'bg-primary-light/50 dark:bg-primary-dark/30 text-primary-dark dark:text-primary-light' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setHistoryAddressId(addr.id);
                                }}
                                className="p-2 rounded-full text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                            >
                                <HistoryIcon className="w-5 h-5" />
                            </button>
                        )}

                        {openMenuId === addr.id && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                <div className="absolute right-0 top-10 bg-surface rounded-2xl shadow-2xl border border-surface-border p-1.5 z-50 min-w-[200px] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 overflow-hidden">
                                    <DropDownItem 
                                        icon={Navigation} 
                                        label="Abrir no Mapa" 
                                        variant="primary" 
                                        onClick={(e) => { e.stopPropagation(); handleOpenMap(addr); setOpenMenuId(null); }} 
                                    />

                                    <DropDownItem 
                                        icon={HistoryIcon} 
                                        label="Abrir HistÃ³rico" 
                                        variant="indigo" 
                                        onClick={() => { setHistoryAddressId(addr.id); setOpenMenuId(null); }} 
                                    />

                                    {isServant && (
                                        <DropDownItem 
                                            icon={Pencil} 
                                            label="Editar Dados" 
                                            variant="neutral" 
                                            onClick={() => { handleEditAddress(addr); setOpenMenuId(null); }} 
                                        />
                                    )}

                                    {(isElder || isServant) && (
                                        <DropDownItem 
                                            icon={addr.isActive === false ? CheckCircle : X} 
                                            label={addr.isActive === false ? 'Ativar CartÃ£o' : 'Desativar CartÃ£o'} 
                                            variant={addr.isActive === false ? 'success' : 'orange'} 
                                            onClick={() => {
                                                setConfirmModal({
                                                    isOpen: true,
                                                    title: addr.isActive === false ? "Reativar EndereÃ§o" : "Desativar EndereÃ§o",
                                                    message: addr.isActive === false
                                                        ? "Deseja reativar este endereÃ§o para que ele volte a aparecer nos links?"
                                                        : "Deseja desativar este endereÃ§o temporariamente?",
                                                    variant: addr.isActive === false ? 'info' : 'danger',
                                                    confirmText: addr.isActive === false ? "Reativar" : "Desativar",
                                                    cancelText: "Cancelar",
                                                    onConfirm: () => {
                                                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                        handleToggleActive(addr);
                                                    },
                                                    onCancel: undefined
                                                });
                                                setOpenMenuId(null);
                                            }} 
                                        />
                                    )}

                                    {(isElder || isServant) && (
                                        <DropDownItem 
                                            icon={Trash2} 
                                            label="Excluir Definitivo" 
                                            variant="danger" 
                                            onClick={() => {
                                                handleDeleteAddress(addr.id);
                                                setOpenMenuId(null);
                                            }} 
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <div className="bg-background min-h-screen pb-24 font-sans text-main">
            {/* Header */}
            <header className="bg-surface sticky top-0 z-30 px-6 py-4 border-b border-surface-border flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <Link
                        href={`/my-maps/territory?congregationId=${congregationId}&cityId=${cityId}&territoryId=${territoryId}`}
                        className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Voltar"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex flex-col">
                        <span className="font-bold text-lg text-main tracking-tight leading-none">{contextNames.territory}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted font-bold uppercase tracking-wider">{localTermType === 'neighborhood' ? 'Bairro' : 'Cidade'}: {contextNames.city}</span>
                            {parentCity && (
                                <>
                                    <span className="text-[8px] text-gray-300 dark:text-gray-600">â€¢</span>
                                    <span className="text-[10px] text-blue-500 font-black tracking-tight uppercase">{parentCity}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {(isElder || isServant || isAdmin || isAdminRoleGlobal) && (
                        <AddressActionsMenu
                            congregationId={congregationId}
                            cityId={cityId}
                            territoryId={territoryId}
                            onImportSuccess={fetchAddresses}
                            onCreateClick={() => setIsCreateModalOpen(true)}
                            isElder={isElder}
                            isServant={isServant}
                            isAdmin={isAdmin}
                            isAdminRoleGlobal={isAdminRoleGlobal}
                        />
                    )}
                </div>
            </header>


            {/* Main Content */}
            <div className="flex flex-col">
                {/* Top: Address List */}
                <div className="flex-1 bg-background">
                    {/* Search */}
                    <div className="px-6 pt-6 pb-2 sticky top-0 bg-background z-10 transition-colors">
                        <div className="relative group max-w-6xl mx-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar rua ou nÃºmero..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-surface border-0 text-main text-sm font-medium rounded-lg py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-muted"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                    ) : filteredAddresses.length === 0 ? (
                        <div className="text-center py-12 opacity-50">
                            <Home className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-400 font-medium">Nenhum endereÃ§o cadastrado</p>
                        </div>
                    ) : (
                        <div className="px-6 pb-6 space-y-3 max-w-6xl mx-auto">
                            {activeAddresses.map((addr, idx) => renderAddressCard(addr, idx))}

                            {inactiveAddresses.length > 0 && (
                                <>
                                    <button
                                        onClick={() => setIsInactiveExpanded(!isInactiveExpanded)}
                                        className="w-full pt-8 pb-4 flex items-center gap-4 group cursor-pointer focus:outline-none"
                                    >
                                        <div className="h-px bg-gray-200 flex-1 group-hover:bg-gray-300 transition-colors"></div>
                                        <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-600 transition-colors">
                                            <span className="text-xs font-bold uppercase tracking-widest">Desativados ({inactiveAddresses.length})</span>
                                            {isInactiveExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        </div>
                                        <div className="h-px bg-gray-200 flex-1 group-hover:bg-gray-300 transition-colors"></div>
                                    </button>

                                    {isInactiveExpanded && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                                            {inactiveAddresses.map((addr, idx) => renderAddressCard(addr, activeAddresses.length + idx))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom: Map View */}
                <div className="w-full h-96 border-t border-gray-200 relative z-0">
                    <MapView
                        onGeocodeSuccess={handleGeocodeSuccess}
                        onMapClick={handleMapClick}
                        disableGeocoding={true}
                        items={[
                            ...activeAddresses.map((a, idx) => ({
                                id: a.id,
                                lat: a.lat,
                                lng: a.lng,
                                // EndereÃ§o unificado no campo street
                                title: a.street,
                                subtitle: a.observations || '',
                                variant: 'numbered' as const,
                                index: idx + 1,
                                residentName: a.residentName,
                                gender: a.gender,
                                status: (a.visitStatus === 'contacted' ? 'OCUPADO' :
                                    a.visitStatus === 'doNotVisit' ? 'NAO_VISITAR' :
                                        a.visitStatus === 'moved' ? 'MUDOU' :
                                            a.visitStatus === 'notContacted' ? 'NAO_CONTATADO' : 'LIVRE') as MapItem['status'],
                                lastVisit: a.lastVisitedAt && new Date(a.lastVisitedAt).toLocaleDateString(),
                                isDeaf: a.isDeaf,
                                isMinor: a.isMinor,
                                isStudent: a.isStudent,
                                isNeurodivergent: a.isNeurodivergent
                            })),
                            ...(isInactiveExpanded ? inactiveAddresses.map((a, idx) => ({
                                id: a.id,
                                lat: a.lat,
                                lng: a.lng,
                                // EndereÃ§o unificado no campo street
                                title: a.street,
                                subtitle: a.observations || '',
                                variant: 'numbered' as const,
                                index: activeAddresses.length + idx + 1,
                                residentName: a.residentName,
                                gender: a.gender,
                                status: (a.visitStatus === 'contacted' ? 'OCUPADO' :
                                    a.visitStatus === 'doNotVisit' ? 'NAO_VISITAR' :
                                        a.visitStatus === 'moved' ? 'MUDOU' :
                                            a.visitStatus === 'notContacted' ? 'NAO_CONTATADO' : 'LIVRE') as MapItem['status'],
                                lastVisit: a.lastVisitedAt && new Date(a.lastVisitedAt).toLocaleDateString(),
                                isDeaf: a.isDeaf,
                                isMinor: a.isMinor,
                                isStudent: a.isStudent,
                                isNeurodivergent: a.isNeurodivergent
                            })) : [])
                        ]}
                        showLegend={false}
                    />
                </div>
            </div>

            {/* History Modal - Fixed: Only renders if historyAddressId is set */}
            {historyAddressId && (
                <VisitHistoryModal
                    onClose={() => setHistoryAddressId(null)}
                    addressId={historyAddressId}
                    address={(() => {
                        const addr = addresses.find(a => a.id === historyAddressId);
                        if (!addr) return '';
                        // O endereço completo já está no campo street
                        return addr.street;
                    })()}
                />
            )}


            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[1000] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-300 border border-transparent dark:border-slate-800 my-8">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                {editingId ? <Pencil className="w-6 h-6 text-blue-600" /> : <Plus className="w-6 h-6 text-blue-600" />}
                                {editingId ? 'Editar Endereço' : 'Novo Endereço'}
                            </h2>
                            <form onSubmit={handleCreateAddress} className="space-y-4">
                                {/* Status Header */}
                                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <span className="font-bold text-sm text-gray-700 dark:text-gray-300">Status do Endereço</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsActive(!isActive)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                {/* Context Info (Read Only) */}
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                                        <span className="text-xs font-bold text-muted uppercase tracking-wider">Congregação</span>
                                        <span className="text-sm font-bold text-main text-right max-w-[60%] truncate" title={contextNames.congregation}>{contextNames.congregation}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                                        <span className="text-xs font-bold text-muted uppercase tracking-wider">{localTermType === 'neighborhood' ? 'Bairro' : 'Cidade'}</span>
                                        <span className="text-sm font-bold text-main text-right max-w-[60%] truncate" title={contextNames.city}>{contextNames.city}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-muted uppercase tracking-wider">Território</span>
                                        <span className="text-sm font-bold text-main text-right max-w-[60%] truncate" title={contextNames.territory}>{contextNames.territory}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Endereço Completo</label>
                                        <textarea
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 font-bold text-sm text-main mb-2 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
                                            rows={2}
                                            value={combinedAddress}
                                            onChange={e => setCombinedAddress(e.target.value)}
                                            placeholder="Ex: Rua das Flores, 123"
                                            required
                                        />
                                    </div>

                                    {/* Google Maps Link */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                                                Link Google Maps
                                            </label>
                                            <div className="relative">
                                                <input
                                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 pr-10 font-bold text-sm text-main focus:ring-2 focus:ring-blue-500/20 outline-none"
                                                    value={googleMapsLink}
                                                    onChange={e => setGoogleMapsLink(e.target.value)}
                                                    placeholder="https://maps.google.com..."
                                                />
                                                <img
                                                    src="/icons/google-maps.svg"
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full object-cover pointer-events-none"
                                                    alt=""
                                                />
                                            </div>
                                        </div>

                                        {/* Waze Link */}
                                        <div>
                                            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                                                Link Waze
                                            </label>
                                            <div className="relative">
                                                <input
                                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 pr-10 font-bold text-sm text-main focus:ring-2 focus:ring-blue-500/20 outline-none"
                                                    value={wazeLink}
                                                    onChange={e => setWazeLink(e.target.value)}
                                                    placeholder="https://waze.com/ul..."
                                                />
                                                <img
                                                    src="/icons/waze.svg"
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full object-cover pointer-events-none"
                                                    alt=""
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 mt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPickerTempCoords(lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null);
                                                setIsMapPickerOpen(true);
                                            }}
                                            className="w-full py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <MapPin className="w-4 h-4" /> Selecionar Pino no Mapa
                                        </button>
                                    </div>
                                    {/* Debug/Verify Coords */}
                                    {lat && lng && (
                                        <div className="mt-1 text-center text-[10px] text-muted">
                                            Lat: {lat.slice(0, 8)} | Lng: {lng.slice(0, 8)}
                                        </div>
                                    )}
                                </div>

                                {!isTraditional && (
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Residentes</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 font-bold text-sm text-main"
                                                value={residentsCount}
                                                onChange={e => setResidentsCount(e.target.value)}
                                                onBlur={() => {
                                                    if (!residentsCount || parseInt(residentsCount) < 1) setResidentsCount('1');
                                                }}
                                                placeholder="Qtd."
                                            />
                                        </div>
                                        <div className="flex-[2]">
                                            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Nome</label>
                                            <input
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3 font-bold text-sm text-main"
                                                value={residentName}
                                                onChange={e => setResidentName(e.target.value)}
                                                placeholder="Nome do morador"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Gender Selection */}
                                {!isTraditional && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Gênero</label>
                                            <div className="flex gap-2">
                                                {[
                                                    { id: 'HOMEM', label: 'Homem' },
                                                    { id: 'MULHER', label: 'Mulher' },
                                                    { id: 'CASAL', label: 'Casal' }
                                                ].map(opt => {
                                                    const isSelected = gender === opt.id;
                                                    let activeClass = '';

                                                    if (opt.id === 'HOMEM') activeClass = 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
                                                    else if (opt.id === 'MULHER') activeClass = 'border-pink-500 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400';
                                                    else activeClass = 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';

                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => setGender(opt.id as any)}
                                                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all border-2 ${isSelected ? activeClass : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:border-gray-200 dark:hover:border-gray-600'}`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Checkboxes */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${isDeaf ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-200'}`}>
                                                <input type="checkbox" className="hidden" checked={isDeaf} onChange={() => setIsDeaf(!isDeaf)} />
                                                <Ear className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase">Surdo</span>
                                            </label>
                                            <label className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${isMinor ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-200'}`}>
                                                <input type="checkbox" className="hidden" checked={isMinor} onChange={() => setIsMinor(!isMinor)} />
                                                <Baby className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase">Menor</span>
                                            </label>
                                            <label className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${isStudent ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-200'}`}>
                                                <input type="checkbox" className="hidden" checked={isStudent} onChange={() => setIsStudent(!isStudent)} />
                                                <GraduationCap className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase">Estudante</span>
                                            </label>
                                            <label className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${isNeurodivergent ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-200'}`}>
                                                <input type="checkbox" className="hidden" checked={isNeurodivergent} onChange={() => setIsNeurodivergent(!isNeurodivergent)} />
                                                <Brain className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase">Neurodivergente</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Observações</label>
                                    <textarea
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-lg p-3 font-medium text-sm min-h-[80px] text-main"
                                        value={observations}
                                        onChange={e => setObservations(e.target.value)}
                                        placeholder="Detalhes adicionais..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button type="button" onClick={resetForm} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Cancelar</button>
                                    <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors">
                                        {editingId ? 'Salvar Endereço' : 'Salvar Endereço'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Picker Modal */}
            {isMapPickerOpen && (
                <div className="fixed inset-0 z-[2000] bg-background flex flex-col animate-in fade-in duration-300">
                    <header className="bg-surface border-b border-surface-border px-6 py-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-main tracking-tight">Selecionar LocalizaÃ§Ã£o</h2>
                            <p className="text-xs text-muted font-bold uppercase tracking-widest">
                                {isMapSelectionMode ? 'Clique para marcar o ponto' : 'Arraste para navegar'}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsMapPickerOpen(false)}
                            className="p-2 hover:bg-background rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-muted" />
                        </button>
                    </header>

                    {/* Search Bar in Modal */}
                    <div className="bg-surface px-6 py-3 border-b border-surface-border">
                        <form onSubmit={handleMapSearch} className="relative max-w-2xl mx-auto flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Pesquisar endereÃ§o para o pino..."
                                    className="w-full bg-background border border-surface-border rounded-lg py-2 pl-9 pr-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    value={mapSearchQuery}
                                    onChange={(e) => setMapSearchQuery(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isGeocodingMap}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                            >
                                {isGeocodingMap ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                                {isGeocodingMap ? 'Buscando...' : 'Buscar'}
                            </button>
                        </form>
                    </div>

                    <div className="flex-1 relative">
                        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
                            <button
                                onClick={() => setIsMapSelectionMode(true)}
                                className={`p-3 rounded-2xl shadow-xl transition-all ${isMapSelectionMode ? 'bg-blue-600 text-white scale-110' : 'bg-surface text-muted hover:text-main border border-surface-border'}`}
                                title="Modo SeleÃ§Ã£o"
                            >
                                <MousePointer2 className="w-6 h-6" />
                            </button>
                            <button
                                onClick={() => setIsMapSelectionMode(false)}
                                className={`p-3 rounded-2xl shadow-xl transition-all ${!isMapSelectionMode ? 'bg-blue-600 text-white scale-110' : 'bg-surface text-muted hover:text-main border border-surface-border'}`}
                                title="Modo NavegaÃ§Ã£o"
                            >
                                <Navigation className="w-6 h-6" />
                            </button>
                        </div>

                        <MapView
                            onMapClick={handleMapClick}
                            center={pickerTempCoords || undefined}
                            items={pickerTempCoords ? [{
                                id: 'temp',
                                lat: pickerTempCoords.lat,
                                lng: pickerTempCoords.lng,
                                title: combinedAddress || 'Novo Ponto',
                                status: 'LIVRE'
                            }] : []}
                            disableGeocoding={true}
                            showLegend={false}
                        />

                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-6">
                            <button
                                onClick={() => {
                                    if (pickerTempCoords) {
                                        setLat(pickerTempCoords.lat.toString());
                                        setLng(pickerTempCoords.lng.toString());
                                        setIsMapPickerOpen(false);
                                    }
                                }}
                                disabled={!pickerTempCoords || !isMapSelectionMode}
                                className={`w-full py-4 rounded-3xl font-bold flex items-center justify-center gap-2 shadow-2xl transition-all active:scale-95 ${(!pickerTempCoords || !isMapSelectionMode) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                                <CheckCircle className="w-5 h-5" />
                                CONFIRMAR LOCAL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                onCancel={confirmModal.onCancel}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
                variant={confirmModal.variant}
            />

            {/* Confirmation Modal for Deletion */}
            <ConfirmationModal
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setAddressToDelete(null);
                }}
                onConfirm={confirmDeleteAddress}
                title="Excluir EndereÃ§o"
                message="Tem certeza que deseja excluir permanentemente este endereÃ§o? Esta aÃ§Ã£o nÃ£o pode ser desfeita."
                confirmText="Excluir"
                variant="danger"
                isLoading={isDeleting}
            />

            {/* Map App Selection Modal */}
            <MapAppSelectModal
                isOpen={!!mapAppSelect?.isOpen}
                onClose={() => setMapAppSelect(null)}
                address={mapAppSelect?.address || {}}
            />

            <BottomNav />
        </div>
    );
}

export default function AddressListPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <AddressListContent />
        </Suspense>
    );
}
