"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { resolveNavigationLinks } from '@/lib/map-links';
import MapAppSelectModal from './MapAppSelectModal';
import {
    X,
    ThumbsUp,
    ThumbsDown,
    Home,
    Hand,
    Navigation,
    Loader2,
    History,
    AlertTriangle,
    Mic,
    MicOff,
    CheckCircle,
    CheckCircle2,
    Square,
    User
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useTranslation } from '@/app/context/I18nContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';


interface VisitReportModalProps {
    address: any;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    onDelete?: () => Promise<void>;
    onViewHistory: () => void;
    congregationType?: 'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE';
    forcedCongregationType?: 'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE'; // Backward compat
}

const normalizeCongregationType = (
    raw?: string | null
): 'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE' | null => {
    if (!raw) return null;
    if (raw === 'Tradicional' || raw === 'tradicional' || raw === 'TRADITIONAL') return 'TRADITIONAL';
    if (raw === 'Língua de Sinais' || raw === 'sinais' || raw === 'LS' || raw === 'SIGN_LANGUAGE') return 'SIGN_LANGUAGE';
    if (raw === 'Língua Estrangeira' || raw === 'FOREIGN_LANGUAGE') return 'FOREIGN_LANGUAGE';
    return null;
};

export default function VisitReportModal({
    address,
    onClose,
    onSave,
    onDelete,
    onViewHistory,
    congregationType: propType,
    forcedCongregationType
}: VisitReportModalProps) {
    const { congregationType: authType, profileName, user } = useAuth();
    const { t } = useTranslation();
    const [fetchedCategory, setFetchedCategory] = useState<'TRADITIONAL' | 'SIGN_LANGUAGE' | 'FOREIGN_LANGUAGE' | null>(null);

    // 1. Busca direta da congregação do endereço no Firestore usando address.congregationId
    useEffect(() => {
        const congId = address.congregationId || address.data?.congregationId;
        if (congId) {
            getDoc(doc(db, 'congregations', congId)).then(snap => {
                if (snap.exists()) {
                    const data = snap.data();
                    const rawCat = data.category || data.type || null;
                    setFetchedCategory(normalizeCongregationType(rawCat));
                }
            }).catch(err => {
                console.error("[VISIT_MODAL] Erro ao buscar congregação do endereço:", err);
            });
        }
    }, [address.congregationId, address.data?.congregationId]);

    // 2. Categoria direta do documento da congregação (sem fallbacks ou inferências)
    const congregationType =
        fetchedCategory ||
        normalizeCongregationType(propType) ||
        normalizeCongregationType(forcedCongregationType) ||
        normalizeCongregationType(authType) ||
        null;

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'contacted' | 'partial' | 'notContacted' | 'moved' | 'doNotVisit' | 'contested' | ''>(
        (address.visitStatus && address.visitStatus !== 'none') ? address.visitStatus : ''
    );
    const [observations, setObservations] = useState(address.visitNotes || '');
    const [publisherName, setPublisherName] = useState(address.publisherName || profileName || user?.displayName || '');
    const [isListening, setIsListening] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isMapSelectOpen, setIsMapSelectOpen] = useState(false);

    const resolvedLinks = resolveNavigationLinks({
        googleMapsLink: (address?.googleMapsLink || '').trim() === 'undefined' ? '' : address?.googleMapsLink,
        wazeLink: (address?.wazeLink || '').trim() === 'undefined' ? '' : address?.wazeLink,
        lat: address?.lat,
        lng: address?.lng,
        address: [address?.street, address?.number].filter(Boolean).join(', '),
    });
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!publisherName && (profileName || user?.displayName)) {
            setPublisherName(profileName || user?.displayName || '');
        }
    }, [profileName, user?.displayName, publisherName]);

    const toggleListening = () => {
        if (isListening) {
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error(t('visitReport.speechNotSupported'));
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') {
                toast.error(t('visitReport.noSpeechDetected'));
            } else if (event.error === 'not-allowed') {
                toast.error(t('visitReport.micPermissionDenied'));
            } else {
                console.warn("Erro no reconhecimento de voz:", event.error);
                toast.error(t('visitReport.micError'));
            }
            setIsListening(false);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setObservations((prev: string) => (prev ? `${prev} ${transcript}` : transcript));
        };

        recognition.start();
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        setLoading(true);
        try {
            await onDelete();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(t('visitReport.deleteError'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // If status is not selected, but we are editing other fields (tags/notes), we preserve the original status
        const finalStatus = status || address.visitStatus;

        if (!finalStatus) {
            toast.error(t('visitReport.selectResultError'));
            return;
        }

        if (status === 'contested' && !observations.trim()) {
            toast.warning(t('visitReport.contestReasonWarning'));
            return;
        }

        setLoading(true);
        try {
            await onSave({
                status: finalStatus,
                observations,
                publisherName: publisherName.trim()
            });
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(t('visitReport.saveError'));
        } finally {
            setLoading(false);
        }
    };

    if (!isMounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="bg-surface rounded-lg w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('visitReport.title')}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Address Info */}
                        <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                            <div className="mb-2">
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                                    {address.street}
                                    {!address.street?.includes(address.number || '') && address.number !== 'S/N' ? `, ${address.number}` : ''}
                                </h3>
                            </div>

                            {address.observations && (
                                <div className="mt-2">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                                        {address.observations}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Status Controls */}
                        {congregationType === 'TRADITIONAL' && address.visitStatus !== 'doNotVisit' ? (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setStatus(status === 'contacted' ? '' : 'contacted')}
                                    className={`p-5 rounded-2xl flex flex-col items-center gap-2 transition-all border-2
                                        ${status === 'contacted'
                                            ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-500/30 active:scale-95'
                                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 hover:border-green-300 dark:hover:border-green-700'}`}
                                >
                                    <CheckCircle2 className={`w-10 h-10 ${status === 'contacted' ? 'animate-in zoom-in duration-300' : 'text-gray-200 dark:text-slate-700'}`} />
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-black uppercase tracking-wider">{t('visitReport.completedLabel')}</span>
                                        <span className={`text-[10px] font-medium ${status === 'contacted' ? 'text-green-50' : 'opacity-60'}`}>{t('visitReport.completedSub')}</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => setStatus(status === 'partial' ? '' : 'partial')}
                                    className={`p-5 rounded-2xl flex flex-col items-center gap-2 transition-all border-2
                                        ${status === 'partial'
                                            ? 'bg-yellow-500 border-yellow-500 text-white shadow-lg shadow-yellow-500/30 active:scale-95'
                                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 hover:border-yellow-300 dark:hover:border-yellow-700'}`}
                                >
                                    <AlertTriangle className={`w-10 h-10 ${status === 'partial' ? 'animate-in zoom-in duration-300' : 'text-gray-200 dark:text-slate-700'}`} />
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-black uppercase tracking-wider">{t('visitReport.partialLabel')}</span>
                                        <span className={`text-[10px] font-medium ${status === 'partial' ? 'text-yellow-50' : 'opacity-60'}`}>{t('visitReport.partialSub')}</span>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            /* Sign/Foreign: Full Status Buttons */
                            <div className="grid grid-cols-2 gap-3">
                                {address.isActive === false ? (
                                    <button
                                        onClick={() => setStatus('contacted')}
                                        className={`col-span-2 p-4 rounded-xl flex flex-col items-center gap-2 transition-all border-2
                                        ${status === 'contacted' ? 'bg-green-50 dark:bg-green-900/30 border-green-500 dark:border-green-600 text-green-700 dark:text-green-400' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-800 text-gray-500 dark:text-gray-400'}`}
                                    >
                                        <ThumbsUp className={`w-8 h-8 ${status === 'contacted' ? 'fill-green-500' : ''}`} />
                                        <span className="text-xs font-bold uppercase">{t('visitReport.contestInactivity')}</span>
                                        <span className="text-[10px] normal-case text-gray-500 dark:text-gray-400">{t('visitReport.contestInactivitySub')}</span>
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setStatus('contacted')}
                                            className={`p-4 rounded-lg flex flex-col items-center gap-2 transition-all border-2
                                            ${status === 'contacted' ? 'bg-green-50 dark:bg-green-900/30 border-green-500 dark:border-green-600 text-green-700 dark:text-green-400' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 text-gray-500 dark:text-gray-400'}`}
                                        >
                                            <ThumbsUp className={`w-8 h-8 ${status === 'contacted' ? 'fill-green-500' : ''}`} />
                                            <span className="text-xs font-bold uppercase">{t('visitReport.contacted')}</span>
                                        </button>

                                        <button
                                            onClick={() => setStatus('notContacted')}
                                            className={`p-4 rounded-lg flex flex-col items-center gap-2 transition-all border-2
                                            ${status === 'notContacted' ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-500 dark:border-orange-600 text-orange-700 dark:text-orange-400' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 text-gray-500 dark:text-gray-400'}`}
                                        >
                                            <ThumbsDown className={`w-8 h-8 ${status === 'notContacted' ? 'fill-orange-500' : ''}`} />
                                            <span className="text-xs font-bold uppercase">{t('visitReport.notContacted')}</span>
                                        </button>

                                        <button
                                            onClick={() => setStatus('moved')}
                                            className={`p-4 rounded-lg flex flex-col items-center gap-2 transition-all border-2
                                            ${status === 'moved' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-400' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 text-gray-500 dark:text-gray-400'}`}
                                        >
                                            <Home className={`w-8 h-8 ${status === 'moved' ? 'fill-blue-500' : ''}`} />
                                            <span className="text-xs font-bold uppercase">{t('visitReport.moved')}</span>
                                        </button>

                                        <button
                                            onClick={() => setStatus('doNotVisit')}
                                            className={`p-4 rounded-lg flex flex-col items-center gap-2 transition-all border-2
                                            ${status === 'doNotVisit' ? 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-600 text-red-700 dark:text-red-400' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 text-gray-500 dark:text-gray-400'}`}
                                        >
                                            <Hand className={`w-8 h-8 ${status === 'doNotVisit' ? 'fill-red-500' : ''}`} />
                                            <span className="text-xs font-bold uppercase">{t('visitReport.doNotVisit')}</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        )}





                        {/* Notes */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">{t('visitReport.observationsLabel')} {status === 'contested' && <span className="text-red-500">*</span>}</label>
                                <button
                                    onClick={toggleListening}
                                    className={`p-1.5 rounded-full transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400'}`}
                                    title={isListening ? t('visitReport.stopDictation') : t('visitReport.startDictation')}
                                >
                                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                </button>
                            </div>
                            <textarea
                                value={observations}
                                onChange={(e) => setObservations(e.target.value)}
                                className={`w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none min-h-[80px] ${(status === 'contested' || status === 'partial') && !observations.trim() ? 'ring-2 ring-orange-200 bg-orange-50 dark:bg-orange-900/20' : ''}`}
                                placeholder={status === 'contested' ? t('visitReport.placeholderContested') : status === 'partial' ? t('visitReport.placeholderPartial') : isListening ? t('visitReport.placeholderListening') : t('visitReport.placeholderDefault')}
                            />
                        </div>

                        {/* Publisher Name Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                <User className="w-3 h-3" />
                                {t('visitReport.publisherLabel')}
                            </label>
                            <input
                                type="text"
                                value={publisherName}
                                onChange={(e) => setPublisherName(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                placeholder={t('visitReport.publisherPlaceholder')}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={onViewHistory}
                                className="bg-white hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-3.5 px-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-gray-200 dark:border-slate-700"
                                title={t('visitReport.viewHistoryTitle')}
                            >
                                <History className="w-5 h-5" />
                            </button>

                            {(resolvedLinks.googleMapsLink || resolvedLinks.wazeLink) && (
                                <button
                                    type="button"
                                    onClick={() => setIsMapSelectOpen(true)}
                                    className="flex-1 bg-white hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-900 dark:text-white py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-gray-200 dark:border-slate-700"
                                >
                                    <Navigation className="w-4 h-4" />
                                    {t('visitReport.navigateTo')}
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-[2] bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('visitReport.finish')}
                            </button>
                        </div>

                        {status && onDelete && (
                            <div className="pt-2">
                                {showDeleteConfirm ? (
                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-start gap-3 mb-4">
                                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-bold text-red-800 dark:text-red-400">{t('visitReport.confirmDeleteTitle')}</p>
                                                <p className="text-[10px] text-red-600 dark:text-red-500 font-medium leading-relaxed">
                                                    {t('visitReport.confirmDeleteDesc')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="flex-1 py-2 text-[10px] font-bold uppercase bg-white dark:bg-slate-800 text-gray-500 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors"
                                            >
                                                {t('visitReport.cancel')}
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                disabled={loading}
                                                className="flex-1 py-2 text-[10px] font-bold uppercase bg-red-600 text-white rounded-lg shadow-lg shadow-red-500/10 transition-colors flex items-center justify-center gap-2"
                                            >
                                                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : t('visitReport.confirmRemove')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full py-3 text-red-500 text-[10px] font-bold uppercase tracking-wider hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                    >
                                        {t('visitReport.removeResponse')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <MapAppSelectModal
                isOpen={isMapSelectOpen}
                onClose={() => setIsMapSelectOpen(false)}
                address={address || {}}
            />
        </div >,
        document.body
    );
}
