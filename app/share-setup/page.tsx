"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    Loader2,
    ArrowLeft,
    Copy,
    ExternalLink,
    Share2,
    Calendar,
    Map as MapIcon,
    CheckCircle2,
    AlertCircle,
    Search,
    User,
    ChevronDown,
    X
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';

import { getTerritoriesDetails } from '@/lib/services/territories';
import { getCongregationUsers } from '@/lib/services/users';
import { createSharedList } from '@/lib/services/shared_lists';

function ShareSetupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, profileName, congregationId: authCongregationId, loading: authLoading, isServant } = useAuth();

    // Redirect if not Elder/Servant
    useEffect(() => {
        if (!authLoading && user && !isServant) {
            router.replace('/dashboard');
        }
    }, [user, authLoading, isServant, router]);

    const [loading, setLoading] = useState(true);
    const [territories, setTerritories] = useState<any[]>([]);
    const [cityName, setCityName] = useState<string>('');
    const [expiration, setExpiration] = useState('14d');
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    const [users, setUsers] = useState<any[]>([]);
    const [searchUserTerm, setSearchUserTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<{ id: string, name: string, avatar_url?: string } | null>(null);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [brokenAvatars, setBrokenAvatars] = useState<Record<string, boolean>>({});

    const territoryIdsParam = searchParams.get('ids');
    const returnUrl = searchParams.get('returnUrl') || '/dashboard';

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            console.log("Usuário não autenticado no ShareSetup, redirecionando...");
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchTerritories = async () => {
            // Wait for auth to be ready
            if (authLoading) return;
            if (!user) return; // Hook above handles redirect

            if (!territoryIdsParam) {
                setError("Nenhum território selecionado.");
                setLoading(false);
                return;
            }

            const ids = territoryIdsParam.split(',').filter(Boolean);
            if (ids.length === 0) {
                setError("IDs inválidos.");
                setLoading(false);
                return;
            }

            try {
                console.log(`Buscando detalhes para ${ids.length} territórios via serviço...`);
                const resData = await getTerritoriesDetails(ids);

                if (!resData.success) {
                    throw new Error(resData.error || 'Erro ao carregar territórios');
                }

                const fetched = resData.territories || [];

                if (fetched.length === 0) {
                    console.warn("Nenhum território retornado pela API para os IDs:", ids);
                    setError("Territórios não encontrados ou você não tem permissão para acessá-los.");
                } else {
                    console.log(`${fetched.length} territórios carregados com sucesso.`);
                    setTerritories(fetched);

                    // Fetch City Name if possible
                    const cityId = fetched[0].cityId || fetched[0].city_id;
                    if (cityId) {
                        const cityRef = doc(db, 'cities', cityId);
                        const citySnap = await getDoc(cityRef);
                        if (citySnap.exists()) {
                            setCityName(citySnap.data().name);
                        }
                    }
                }
            } catch (err: any) {
                console.error("Erro ao carregar detalhes dos territórios:", err);
                setError(err.message || "Erro ao carregar detalhes dos territórios.");
            } finally {
                setLoading(false);
            }
        };

        fetchTerritories();
    }, [territoryIdsParam, authLoading, user]);

    useEffect(() => {
        let ignore = false;
        const fetchUsersData = async () => {
            let fetchedUsers: any[] = [];

            // 1. Initial members list only with the current user
            if (user) {
                fetchedUsers.push({
                    id: user.uid,
                    name: profileName || user.displayName || user.email || 'Eu mesmo',
                    email: user.email,
                    avatar_url: user.photoURL || null
                });
            }

            // 2. Fetch congregation members if possible
            const congregationId = authCongregationId || (territories.length > 0 ? (territories[0].congregationId || territories[0].congregation_id) : null);

            if (congregationId) {
                try {
                    const resData = await getCongregationUsers(congregationId);

                    if (!ignore && resData.success && resData.users) {
                        // Merge without duplicates
                        resData.users.forEach((apiUser: any) => {
                            if (!fetchedUsers.find(u => u.id === apiUser.id)) {
                                fetchedUsers.push(apiUser);
                            }
                        });
                    }
                } catch (e) {
                    console.error('Failed to fetch congregation users', e);
                }
            }

            if (!ignore) {
                setUsers(fetchedUsers);
            }
        };

        fetchUsersData();
        return () => { ignore = true; };
    }, [territories, user, profileName, authCongregationId]);


    const getOrCreateLink = async () => {
        if (generatedLink) return generatedLink;
        if (territories.length === 0) {
            toast.error("Nenhum território carregado para gerar o link.");
            return null;
        }

        setGenerating(true);
        try {
            const now = new Date();
            let expiresAt: Date | null = new Date();

            switch (expiration) {
                case '7d': expiresAt.setDate(now.getDate() + 7); break;
                case '14d': expiresAt.setDate(now.getDate() + 14); break;
                case '30d': expiresAt.setDate(now.getDate() + 30); break;
                case 'never': expiresAt = null; break;
            }

            let title = "Territórios Compartilhados";
            if (territories.length === 1) {
                title = `${territories[0].name} - ${cityName || territories[0].city || 'Mapa'}`;
            } else {
                title = `${territories.length} Territórios - ${cityName || territories[0].city || 'Vários'}`;
            }

            const resData = await createSharedList({
                title: title,
                type: 'territory',
                items: territories.map(t => t.id),
                congregationId: territories[0].congregationId || territories[0].congregation_id,
                assignedTo: selectedUser ? selectedUser.id : '',
                assignedName: selectedUser ? selectedUser.name : '',
                expiresInHours: expiresAt ? (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60) : undefined,
                territories: territories
            });

            if (!resData.success) {
                throw new Error(resData.error || 'Erro ao criar a lista compartilhada');
            }

            const link = `${window.location.origin}/share?id=${resData.id}`;
            setGeneratedLink(link);
            return link;
        } catch (error) {
            console.error("Error generating link:", error);
            toast.error("Erro ao gerar link.");
            return null;
        } finally {
            setGenerating(false);
        }
    };

    const handleOpen = async () => {
        const link = await getOrCreateLink();
        if (link) window.open(link, '_blank');
    };

    const handleCopy = async () => {
        const link = await getOrCreateLink();
        if (link) {
            try {
                await navigator.clipboard.writeText(link);
                toast.success("Link copiado!");
            } catch (err) {
                console.warn("Clipboard API failed, using fallback:", err);
                // Fallback for non-secure contexts or old browsers
                const input = document.createElement('input');
                input.value = link;
                document.body.appendChild(input);
                input.select();
                try {
                    document.execCommand('copy');
                    toast.success("Link copiado!");
                } catch (copyErr) {
                    console.error("Fallback copy failed:", copyErr);
                    toast.error("Erro ao copiar link.");
                }
                document.body.removeChild(input);
            }
        }
    };

    const handleShare = async () => {
        const link = await getOrCreateLink();
        if (link) {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Território para Trabalhar',
                        text: 'Acesse o link para visualizar o território designado:',
                        url: link
                    });
                } catch (err) {
                    console.error(err);
                }
            } else {
                await handleCopy();
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h1 className="text-xl font-bold text-main">Erro</h1>
                <p className="text-muted">{error}</p>
                <button onClick={() => router.push(returnUrl)} className="text-primary hover:underline">
                    Voltar
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background font-sans text-main pb-20">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-surface border-b border-surface-border px-6 py-4 flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-muted" />
                </button>
                <h1 className="font-bold text-lg text-main">Configurar Link</h1>
            </header>

            <main className="max-w-xl mx-auto px-6 py-8 space-y-8">

                {/* Summary Section */}
                <section className="space-y-4">
                    <h2 className="text-sm font-bold text-muted uppercase tracking-wider">Resumo da Seleção</h2>
                    <div className="bg-surface rounded-2xl border border-surface-border overflow-hidden">
                        {territories.map((t, index) => (
                            <div key={t.id} className={`p-4 flex items-center gap-4 ${index !== territories.length - 1 ? 'border-b border-surface-border' : ''}`}>
                                <div className="w-10 h-10 bg-primary-light/50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center shrink-0">
                                    <MapIcon className="w-5 h-5 text-primary dark:text-blue-400" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-main truncate">{t.name}</h3>
                                    <p className="text-xs text-muted truncate">{t.description || (cityName || t.city ? (cityName || t.city) : 'Sem descrição')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Configuration & Actions */}
                <section className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Validado do Link
                        </label>
                        <p className="text-xs text-muted">Defina por quanto tempo este link ficará acessível.</p>
                        <select
                            value={expiration}
                            onChange={(e) => setExpiration(e.target.value)}
                            disabled={!!generatedLink} // Disable changes after link is created to avoid confusion
                            className="w-full bg-surface border border-surface-border rounded-xl p-4 text-main font-semibold focus:ring-2 focus:ring-primary-light/500/20 outline-none transition-all disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                        >
                            <option value="7d">7 Dias</option>
                            <option value="14d">14 Dias (Padrão)</option>
                            <option value="30d">30 Dias</option>
                            <option value="never">Nunca Expira</option>
                        </select>
                    </div>

                    <div className="space-y-2 relative">
                        <label className="text-sm font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                            <User className="w-4 h-4" /> Designar Para (Opcional)
                        </label>
                        <p className="text-xs text-muted">Selecione um membro da congregação para vincular a este link.</p>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => !generatedLink && setIsUserDropdownOpen(!isUserDropdownOpen)}
                                disabled={!!generatedLink}
                                className="w-full bg-surface border border-surface-border rounded-xl p-4 text-left text-main font-semibold flex items-center justify-between focus:ring-2 focus:ring-primary-light/500/20 outline-none transition-all disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                            >
                                {selectedUser ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            {selectedUser.avatar_url && !brokenAvatars[selectedUser.id] ? (
                                                <img
                                                    src={selectedUser.avatar_url}
                                                    alt=""
                                                    referrerPolicy="no-referrer"
                                                    className="w-6 h-6 rounded-full object-cover border border-surface-border shrink-0"
                                                    onError={() => setBrokenAvatars(prev => ({ ...prev, [selectedUser.id]: true }))}
                                                />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-primary-light/50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                    <User className="w-3.5 h-3.5 text-primary dark:text-blue-400" />
                                                </div>
                                            )}
                                            <span className="flex-1 text-sm font-bold text-main truncate">
                                                {selectedUser.name}
                                            </span>
                                        </div>
                                        {!generatedLink && (
                                            <X
                                                className="w-5 h-5 text-muted hover:text-red-500 transition-colors z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedUser(null);
                                                }}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className="text-muted">Nenhum membro selecionado</span>
                                        <ChevronDown className={`w-5 h-5 text-muted transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                                    </>
                                )}
                            </button>

                            {isUserDropdownOpen && !generatedLink && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-surface-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-3 border-b border-surface-border sticky top-0 bg-surface">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                            <input
                                                type="text"
                                                placeholder="Buscar membro..."
                                                value={searchUserTerm}
                                                onChange={(e) => setSearchUserTerm(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-lg py-2 pl-9 pr-4 text-sm font-medium text-main focus:ring-2 focus:ring-primary/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {(() => {
                                            const filtered = users.filter(u => {
                                                const nameStr = (u.name || '').toLowerCase();
                                                const emailStr = (u.email || '').toLowerCase();
                                                const term = searchUserTerm.toLowerCase();
                                                return nameStr.includes(term) || emailStr.includes(term);
                                            });

                                            if (filtered.length === 0) {
                                                return <div className="p-4 text-center text-sm text-muted">Nenhum membro encontrado.</div>;
                                            }

                                            return filtered.slice(0, 5).map(u => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => {
                                                        setSelectedUser({ id: u.id, name: u.name || 'Sem Nome', avatar_url: u.avatar_url });
                                                        setIsUserDropdownOpen(false);
                                                        setSearchUserTerm('');
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-sm font-bold text-main transition-colors border-b border-transparent hover:border-surface-border last:border-none flex items-center gap-3"
                                                >
                                                    {u.avatar_url && !brokenAvatars[u.id] ? (
                                                        <img
                                                            src={u.avatar_url}
                                                            alt=""
                                                            referrerPolicy="no-referrer"
                                                            className="w-6 h-6 rounded-full object-cover border border-surface-border shrink-0"
                                                            onError={() => setBrokenAvatars(prev => ({ ...prev, [u.id]: true }))}
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-primary-light/50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                            <User className="w-3.5 h-3.5 text-primary dark:text-blue-400" />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="truncate">{u.name}</span>
                                                        {u.email && <span className="text-[10px] text-muted font-medium truncate">{u.email}</span>}
                                                    </div>
                                                </button>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        {/* Open Button */}
                        <button
                            onClick={handleOpen}
                            disabled={generating}
                            className={`w-full bg-surface border-2 ${generatedLink ? 'border-green-500 bg-green-50 dark:bg-green-900/10 dark:border-green-800' : 'border-surface-border'} hover:bg-gray-50 dark:hover:bg-gray-800 text-main font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors`}
                        >
                            {generating ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <ExternalLink className={`w-5 h-5 ${generatedLink ? 'text-green-600' : 'text-primary'}`} />}
                            {generatedLink ? 'Link Aberto (Reabrir)' : 'Abrir Link'}
                        </button>

                        {/* Copy Button */}
                        <button
                            onClick={handleCopy}
                            disabled={generating}
                            className={`w-full bg-surface border-2 ${generatedLink ? 'border-green-500 bg-green-50 dark:bg-green-900/10 dark:border-green-800' : 'border-surface-border'} hover:bg-gray-50 dark:hover:bg-gray-800 text-main font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors`}
                        >
                            <Copy className={`w-5 h-5 ${generatedLink ? 'text-green-600' : 'text-orange-500'}`} />
                            {generatedLink ? 'Link Copiado (Copiar Novamente)' : 'Copiar Link'}
                        </button>

                        {/* Share Button */}
                        <button
                            onClick={handleShare}
                            disabled={generating}
                            className={`w-full bg-surface border-2 ${generatedLink ? 'border-green-500 bg-green-50 dark:bg-green-900/10 dark:border-green-800' : 'border-surface-border'} hover:bg-gray-50 dark:hover:bg-gray-800 text-main font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors`}
                        >
                            <Share2 className={`w-5 h-5 ${generatedLink ? 'text-green-600' : 'text-purple-600'}`} />
                            Compartilhar
                        </button>
                    </div>

                    {generatedLink && (
                        <div className="text-center animate-in fade-in duration-300">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-bold text-sm">
                                <CheckCircle2 className="w-4 h-4" /> Link Gerado
                            </div>
                        </div>
                    )}
                </section>

                <button
                    onClick={() => router.push(returnUrl)}
                    className="w-full text-muted hover:text-main text-sm font-medium py-2"
                >
                    Voltar sem gerar novo link
                </button>

            </main>
        </div>
    );
}

export default function ShareSetupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <ShareSetupContent />
        </Suspense>
    );
}
