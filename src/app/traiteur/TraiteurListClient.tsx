"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChefHat,
  Star,
  MapPin,
  Search,
  X,
  Plus,
  Calendar,
  Users,
  Utensils,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Euro,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  WifiOff,
  Lock,
} from "lucide-react";
import { type Traiteur, type TraiteurRequest } from "@/lib/types/traiteur";
import { authFetch, getCurrentUser, isNetworkError } from "@/lib/auth";
import SentProposalsList from "@/components/traiteur/SentProposalsList";
import CountryFlag from "@/components/ui/CountryFlag";
import CountryFilterModal from "@/components/ui/CountryFilterModal";
import ConfirmDialog from "@/components/commandes/ConfirmDialog";

type Tab = "traiteurs" | "demandes" | "mes_propositions";

type LoadResult<T> = { ok: true; data: T } | { ok: false; error: string; offline: boolean };

type RequestsState = "idle" | "loading" | "ready" | "error" | "unauthorized" | "forbidden";

const errorMessage = (body: { error?: unknown; message?: unknown } | null, fallback: string): string => {
  const value = body?.error || body?.message;
  return typeof value === "string" && value.trim() ? value : fallback;
};

/** Texte comparable sans casse ni accents (« mafe » trouve « Mafé »). */
const normalize = (value: string | null | undefined): string =>
  (value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Traiteurs actifs, chargés depuis le navigateur quand le rendu serveur n'a pas pu les obtenir. */
async function fetchActiveTraiteurs(): Promise<LoadResult<Traiteur[]>> {
  try {
    const res = await authFetch("/api/traiteur");
    const body = await res.json();
    if (!res.ok) {
      return { ok: false, offline: false, error: errorMessage(body, "Impossible de charger les traiteurs.") };
    }
    const list = body?.data?.activeTraiteur;
    return { ok: true, data: Array.isArray(list) ? list : [] };
  } catch (err) {
    return isNetworkError(err)
      ? { ok: false, offline: true, error: err.message }
      : { ok: false, offline: false, error: "Impossible de charger les traiteurs. Réessayez dans un instant." };
  }
}

const POPULAR_CUISINES = [
  { label: "Sénégalais", value: "senegalais" },
  { label: "Ivoirien", value: "ivoirien" },
  { label: "Camerounais", value: "camerounais" },
  { label: "Congolais", value: "congolais" },
  { label: "Malien", value: "mali" },
  { label: "Guinéen", value: "guineen" },
  { label: "Béninois", value: "benin" },
  { label: "Togolais", value: "togo" },
];

type Props = {
  /** Traiteurs obtenus au rendu serveur ; null si l'API était injoignable (chargement côté client). */
  initialTraiteurs: Traiteur[] | null;
};

export default function TraiteurListClient({ initialTraiteurs }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("traiteurs");
  const [traiteurs, setTraiteurs] = useState<Traiteur[]>(initialTraiteurs ?? []);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    initialTraiteurs ? "ready" : "loading",
  );
  const [loadError, setLoadError] = useState<{ message: string; offline: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisineFilter, setSelectedCuisineFilter] = useState<string>("all");

  // Espace traiteur : demandes d'événements (réservées aux traiteurs connectés) et propositions
  const [isTraiteurUser, setIsTraiteurUser] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);
  const [requests, setRequests] = useState<TraiteurRequest[]>([]);
  const [requestsState, setRequestsState] = useState<RequestsState>("idle");
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // Modale d'envoi de proposition pour traiteur
  const [selectedRequest, setSelectedRequest] = useState<TraiteurRequest | null>(null);
  const [proposedPrice, setProposedPrice] = useState("");
  const [proposalMessage, setProposalMessage] = useState("");
  const [showConfirmProposal, setShowConfirmProposal] = useState(false);
  const [sendingProposal, setSendingProposal] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSuccess, setProposalSuccess] = useState(false);
  // Verrou synchrone : un double clic ne doit pas envoyer deux propositions
  const sendingLockRef = useRef(false);

  const applyTraiteurs = useCallback((result: LoadResult<Traiteur[]>) => {
    if (result.ok) {
      setTraiteurs(result.data);
      setLoadError(null);
      setLoadState("ready");
    } else {
      setLoadError({ message: result.error, offline: result.offline });
      setLoadState("error");
    }
  }, []);

  // Chargement côté navigateur uniquement si le rendu serveur n'a pas fourni la liste
  useEffect(() => {
    if (initialTraiteurs) return;
    let ignore = false;
    fetchActiveTraiteurs().then((result) => {
      if (!ignore) applyTraiteurs(result);
    });
    return () => {
      ignore = true;
    };
  }, [initialTraiteurs, applyTraiteurs]);

  const retryTraiteurs = () => {
    setLoadState("loading");
    setLoadError(null);
    void fetchActiveTraiteurs().then(applyTraiteurs);
  };

  // Recherche transmise par l'accueil (?q=) : lue dans le navigateur pour que la page reste
  // générée statiquement (useSearchParams forcerait le rendu de la liste côté client)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation unique avec l'URL au montage
    if (q) setSearchQuery(q);
  }, []);

  const loadRequests = useCallback(async () => {
    setRequestsState("loading");
    setRequestsError(null);
    try {
      const res = await authFetch("/api/traiteur/requests");
      const body = await res.json();
      if (res.status === 401) {
        setRequestsState("unauthorized");
        return;
      }
      if (res.status === 403) {
        setRequestsState("forbidden");
        return;
      }
      if (!res.ok) {
        setRequestsError(errorMessage(body, "Impossible de charger les demandes d'événements."));
        setRequestsState("error");
        return;
      }
      const list = body?.data?.requests;
      setRequests(Array.isArray(list) ? list : []);
      setRequestsState("ready");
    } catch (err) {
      setRequestsError(
        isNetworkError(err) ? err.message : "Impossible de charger les demandes d'événements.",
      );
      setRequestsState("error");
    }
  }, []);

  const loadSentProposals = useCallback(async () => {
    try {
      const res = await authFetch("/api/traiteur/proposals/me");
      const body = await res.json();
      if (!res.ok) return;
      const proposals: { request_id?: string }[] = Array.isArray(body?.data?.proposals) ? body.data.proposals : [];
      setSentRequestIds(proposals.map((p) => p.request_id).filter((id): id is string => typeof id === "string"));
    } catch {
      // Liste indicative : l'API refuse de toute façon une seconde proposition
    }
  }, []);

  // L'onglet « Demandes » n'existe que pour les traiteurs connectés : l'API le refuse aux autres
  useEffect(() => {
    let ignore = false;
    getCurrentUser().then((user) => {
      if (ignore || user?.role !== "traiteur") return;
      setIsTraiteurUser(true);
      void loadRequests();
      void loadSentProposals();
    });
    return () => {
      ignore = true;
    };
  }, [loadRequests, loadSentProposals]);

  const openTab = (tab: Tab) => {
    setActiveTab(tab);
    // Rechargement à chaque ouverture de l'onglet des demandes
    if (tab === "demandes" && requestsState !== "loading") void loadRequests();
  };

  // Origines culinaires avec compteurs réels
  const availableCuisines = useMemo(() => {
    const list: { label: string; value: string; count: number }[] = [
      { label: "Toutes les cuisines", value: "all", count: traiteurs.length },
    ];
    POPULAR_CUISINES.forEach((p) => {
      const count = traiteurs.filter((t) =>
        t.cuisine_type?.some((c) => normalize(c).includes(p.value) || p.value.includes(normalize(c))),
      ).length;
      if (count > 0 || ["senegalais", "ivoirien", "camerounais", "congolais"].includes(p.value)) {
        list.push({ ...p, count });
      }
    });
    return list;
  }, [traiteurs]);

  // Filtrage par recherche et cuisine pour les traiteurs
  const filteredTraiteurs = useMemo(() => {
    let result = traiteurs;

    if (selectedCuisineFilter !== "all") {
      const filter = normalize(selectedCuisineFilter);
      result = result.filter((t) =>
        t.cuisine_type?.some((c) => normalize(c).includes(filter) || filter.includes(normalize(c))),
      );
    }

    const query = normalize(searchQuery.trim());
    if (!query) return result;

    // Les noms de plats comptent aussi : la recherche de l'accueil propose « Tiep, Mafé, Alloco... »
    return result.filter(
      (traiteur) =>
        normalize(traiteur.name).includes(query) ||
        normalize(traiteur.bio).includes(query) ||
        traiteur.delivery_zones?.some((z) => normalize(z).includes(query)) ||
        traiteur.cuisine_type?.some((c) => normalize(c).includes(query)) ||
        traiteur.dishes?.some((d) => normalize(d.name).includes(query)),
    );
  }, [traiteurs, searchQuery, selectedCuisineFilter]);

  // Filtrage par recherche pour les demandes clients
  const filteredRequests = useMemo(() => {
    const query = normalize(searchQuery.trim());
    if (!query) return requests;

    return requests.filter(
      (req) =>
        normalize(req.event_type).includes(query) ||
        normalize(req.location).includes(query) ||
        normalize(req.client?.city).includes(query) ||
        normalize(req.food_preferences).includes(query) ||
        normalize(req.description).includes(query),
    );
  }, [requests, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCuisineFilter("all");
  };

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedCuisineFilter !== "all";

  const closeProposalModal = () => {
    if (sendingProposal) return;
    setSelectedRequest(null);
    setShowConfirmProposal(false);
    setProposalError(null);
  };

  const handleOpenProposalConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !proposedPrice || !proposalMessage.trim() || sendingProposal) {
      return;
    }
    const priceNum = parseFloat(proposedPrice.replace(",", "."));
    if (isNaN(priceNum) || priceNum <= 0) {
      setProposalError("Le tarif proposé doit être supérieur à 0 €.");
      return;
    }
    setProposalError(null);
    setShowConfirmProposal(true);
  };

  const handleSendProposal = async () => {
    if (!selectedRequest || !proposedPrice || !proposalMessage.trim() || sendingLockRef.current) {
      return;
    }
    sendingLockRef.current = true;
    setSendingProposal(true);
    setProposalError(null);

    const requestId = selectedRequest.id;
    try {
      const response = await authFetch(`/api/traiteur/requests/${requestId}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposed_price: parseFloat(proposedPrice.replace(",", ".")),
          message: proposalMessage.trim(),
        }),
      });
      const body = await response.json();
      if (response.status === 401) {
        setProposalError("Votre session a expiré : reconnectez-vous pour envoyer votre proposition.");
        return;
      }
      if (!response.ok) {
        setProposalError(errorMessage(body, "Erreur lors de l'envoi de la proposition."));
        return;
      }

      setShowConfirmProposal(false);
      setSentRequestIds((prev) => (prev.includes(requestId) ? prev : [...prev, requestId]));
      setProposalSuccess(true);
      setTimeout(() => {
        setProposalSuccess(false);
        setSelectedRequest(null);
        setProposedPrice("");
        setProposalMessage("");
        void loadRequests();
      }, 1800);
    } catch (err) {
      setProposalError(
        isNetworkError(err) ? err.message : "Erreur lors de l'envoi de la proposition. Réessayez.",
      );
    } finally {
      sendingLockRef.current = false;
      setSendingProposal(false);
    }
  };

  const tabClass = (tab: Tab) =>
    `py-2 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all ${
      activeTab === tab ? "bg-white text-[#1D6B45] shadow-md" : "text-white/80 hover:text-white"
    }`;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      {/* ── 1. HERO BANNER TRAITEUR DESKTOP & MOBILE ── */}
      <section className="relative overflow-hidden rounded-3xl md:rounded-[36px] bg-gradient-to-br from-[#0F4A30] via-[#1D6B45] to-[#155234] text-white shadow-xl shadow-[#1D6B45]/10 p-6 sm:p-10 md:p-12">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-[#D4870A]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md text-white text-xs font-bold px-3.5 py-1.5 rounded-full border border-white/20 shadow-xs">
              <Sparkles size={14} className="text-[#D4870A]" />
              <span>Gastronomie & Événements Africains</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Traiteurs & Chefs Passionnés
            </h1>

            <p className="text-white/85 text-xs sm:text-sm md:text-base leading-relaxed">
              Dégustez des plats faits maison authentiques ou trouvez le traiteur idéal pour vos événements familiaux (mariages, baptêmes, anniversaires, fêtes associatives).
            </p>

            {/* Badges de réassurance et qualité culinaire */}
            <div className="pt-1 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-xs px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white/90">
                <ShieldCheck size={14} className="text-emerald-300" />
                <span>Chefs partenaires vérifiés</span>
              </div>
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-xs px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white/90">
                <Utensils size={14} className="text-amber-300" />
                <span>Plats 100% faits maison</span>
              </div>
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-xs px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white/90">
                <CheckCircle2 size={14} className="text-emerald-300" />
                <span>Devis sur-mesure gratuits</span>
              </div>
            </div>

            {/* Barre d'onglets : les demandes d'événements ne sont visibles que des traiteurs */}
            {isTraiteurUser && (
              <div className="pt-2 flex flex-wrap items-center gap-2 bg-black/25 backdrop-blur-md p-1.5 rounded-2xl w-fit">
                <button type="button" onClick={() => openTab("traiteurs")} className={tabClass("traiteurs")}>
                  Chefs & Traiteurs ({traiteurs.length})
                </button>
                <button type="button" onClick={() => openTab("demandes")} className={tabClass("demandes")}>
                  Demandes d&apos;événements{requestsState === "ready" ? ` (${requests.length})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => openTab("mes_propositions")}
                  className={tabClass("mes_propositions")}
                >
                  Mes propositions ({sentRequestIds.length})
                </button>
              </div>
            )}
          </div>

          {/* Bandeau d'action pour déposer une annonce */}
          <div className="w-full lg:w-96 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-white space-y-4 shrink-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-[#D4870A] flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-amber-300" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-white">Vous prévoyez une fête ?</h2>
                <p className="text-[11px] text-white/70">Recevez plusieurs devis sans engagement</p>
              </div>
            </div>
            <p className="text-xs text-white/85 leading-relaxed">
              Publiez votre besoin culinaire (date, nombre d&apos;invités, budget) et nos chefs certifiés vous enverront leurs meilleures propositions.
            </p>
            <Link
              href="/traiteur/demande"
              className="w-full flex items-center justify-center gap-2 bg-white text-[#1D6B45] hover:bg-emerald-50 text-xs sm:text-sm font-extrabold py-3 px-4 rounded-xl shadow-md transition-all hover:scale-102"
            >
              <Plus size={16} /> Déposer une annonce d&apos;événement
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. BARRE DE RECHERCHE ET FILTRES ── */}
      {activeTab !== "mes_propositions" && (
        <section className="bg-white rounded-2xl md:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                aria-label={activeTab === "traiteurs" ? "Rechercher un traiteur" : "Rechercher une demande"}
                placeholder={
                  activeTab === "traiteurs"
                    ? "Rechercher par nom de chef, ville, spécialité, plats..."
                    : "Rechercher par type d'événement, ville, préférences..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 focus:border-[#1D6B45] focus:bg-white text-slate-900 placeholder-slate-400 text-xs sm:text-sm rounded-xl focus:outline-hidden transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Effacer la recherche"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Bouton Filtre par pays / spécialité */}
            {activeTab === "traiteurs" && (
              <CountryFilterModal
                options={availableCuisines}
                selectedValue={selectedCuisineFilter}
                onSelect={(val) => setSelectedCuisineFilter(val)}
                title="Filtrer par pays & spécialité"
                subtitle="Sélectionnez l'origine culinaire africaine de votre choix"
                buttonLabel="Filtrer par pays"
              />
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3.5 py-2.5 rounded-xl border border-rose-200 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <X size={14} /> Réinitialiser
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── 3. CONTENU : ONGLET 1 - TRAITEURS ── */}
      {activeTab === "traiteurs" && (
        <section aria-labelledby="traiteurs-heading">
          <h2 id="traiteurs-heading" className="sr-only">
            Chefs et traiteurs disponibles
          </h2>
          {loadState === "loading" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs animate-pulse space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-200 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-md w-full" />
                  <div className="h-3 bg-slate-100 rounded-md w-2/3" />
                </div>
              ))}
            </div>
          ) : loadState === "error" ? (
            <div
              role="alert"
              className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-amber-200 shadow-xs space-y-4 max-w-xl mx-auto"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#D4870A] flex items-center justify-center mx-auto">
                {loadError?.offline ? <WifiOff size={30} /> : <AlertCircle size={30} />}
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">
                Impossible d&apos;afficher les traiteurs
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">{loadError?.message}</p>
              <button
                type="button"
                onClick={retryTraiteurs}
                className="inline-flex items-center gap-2 bg-[#1D6B45] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs hover:bg-[#154d31] cursor-pointer"
              >
                <RotateCcw size={14} /> Réessayer
              </button>
            </div>
          ) : filteredTraiteurs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ChefHat size={32} />
              </div>
              {traiteurs.length === 0 ? (
                <>
                  <h3 className="font-extrabold text-slate-800 text-lg">
                    Aucun traiteur disponible pour le moment
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    De nouveaux chefs rejoignent Dabari régulièrement. Déposez votre demande d&apos;événement pour être recontacté.
                  </p>
                  <Link
                    href="/traiteur/demande"
                    className="inline-flex items-center gap-2 bg-[#1D6B45] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs hover:bg-[#154d31]"
                  >
                    <Plus size={15} /> Déposer une annonce
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="font-extrabold text-slate-800 text-lg">
                    Aucun traiteur ne correspond à votre recherche
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Essayez d&apos;élargir votre recherche géographique ou découvrez d&apos;autres spécialités.
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="bg-[#1D6B45] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs hover:bg-[#154d31]"
                    >
                      Effacer les filtres
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTraiteurs.map((traiteur) => {
                const availableDishesCount = traiteur.dishes?.filter((d) => d.is_available).length || 0;

                return (
                  <Link key={traiteur.id} href={`/traiteur/${traiteur.id}`} className="group block h-full">
                    <div className="bg-white rounded-3xl border-2 border-slate-100 hover:border-[#1D6B45] shadow-xs hover:shadow-2xl transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden group-hover:-translate-y-1.5">
                      {/* ── BANNIÈRE PHOTO DE COUVERTURE DU CHEF ── */}
                      <div className="relative h-40 sm:h-44 w-full bg-[#E8F5E9] shrink-0 overflow-hidden">
                        {traiteur.image_url ? (
                          <Image
                            src={traiteur.image_url}
                            alt={traiteur.name}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-100 via-teal-50 to-emerald-200 flex items-center justify-center text-[#1D6B45]">
                            <ChefHat size={44} className="opacity-70 group-hover:scale-110 transition-transform" />
                          </div>
                        )}

                        {/* Badge Note flottant en haut à droite */}
                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5 border border-slate-100 z-10">
                          <Star size={13} className="text-amber-500 fill-amber-500" />
                          {traiteur.review_count && traiteur.review_count > 0 ? (
                            <>
                              <span className="font-extrabold text-xs text-slate-900">{traiteur.rating}</span>
                              <span className="text-[10px] text-slate-400">({traiteur.review_count})</span>
                            </>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-700">Nouveau</span>
                          )}
                        </div>

                        {/* Pastille Chef Vérifié en haut à gauche */}
                        <div className="absolute top-3 left-3 bg-[#1D6B45]/90 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <CheckCircle2 size={11} /> Chef Vérifié
                        </div>

                        {/* Avatar flottant du Chef */}
                        <div className="absolute -bottom-3 left-4 w-12 h-12 rounded-2xl bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center text-[#1D6B45] font-black text-base z-10">
                          {traiteur.image_url ? (
                            <Image
                              src={traiteur.image_url}
                              alt=""
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ChefHat size={22} />
                          )}
                        </div>
                      </div>

                      {/* ── DÉTAILS DU TRAITEUR ── */}
                      <div className="p-5 pt-6 flex-1 flex flex-col justify-between space-y-3.5">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <h3 className="font-black text-slate-900 text-base sm:text-lg group-hover:text-[#1D6B45] transition-colors line-clamp-1">
                              {traiteur.name}
                            </h3>
                          </div>

                          {/* Bio */}
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed min-h-[2rem]">
                            {traiteur.bio || "Chef passionné par la gastronomie africaine authentique et les réceptions conviviales."}
                          </p>

                          {/* Spécialités du chef en aperçu */}
                          {traiteur.dishes && traiteur.dishes.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                                Spécialités au menu :
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {traiteur.dishes.slice(0, 2).map((dish) => (
                                  <div
                                    key={dish.id}
                                    className="text-[11px] bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium flex items-center justify-between gap-1 transition-colors"
                                  >
                                    <span className="truncate">{dish.name}</span>
                                    <span className="font-extrabold text-[#1D6B45] shrink-0">
                                      {Number(dish.price).toFixed(2)} €
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Zones de livraison */}
                          {traiteur.delivery_zones && traiteur.delivery_zones.length > 0 && (
                            <div className="mt-3 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center gap-1.5">
                              <MapPin size={13} className="text-[#1D6B45] shrink-0" />
                              <div className="flex flex-wrap gap-1 min-w-0">
                                {traiteur.delivery_zones.slice(0, 3).map((zone) => (
                                  <span
                                    key={zone}
                                    className="text-[10px] font-semibold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                                  >
                                    {zone}
                                  </span>
                                ))}
                                {traiteur.delivery_zones.length > 3 && (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    +{traiteur.delivery_zones.length - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer : Cuisines & Lien de commande */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex gap-1 flex-wrap">
                            {traiteur.cuisine_type?.slice(0, 2).map((c) => (
                              <span
                                key={c}
                                className="inline-flex items-center gap-1 bg-emerald-50 text-[#1D6B45] text-[11px] font-bold px-2 py-0.5 rounded-full capitalize"
                              >
                                <CountryFlag country={c} size={13} />
                                <span>{c}</span>
                              </span>
                            ))}
                          </div>

                          <span className="text-xs font-black text-[#1D6B45] group-hover:translate-x-1 flex items-center gap-1.5 shrink-0 bg-emerald-50 hover:bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-100 transition-colors">
                            <span>Voir le menu ({availableDishesCount})</span>
                            <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── 4. CONTENU : ONGLET 2 - DEMANDES D'ÉVÉNEMENTS (RÉSERVÉ AUX TRAITEURS) ── */}
      {activeTab === "demandes" && isTraiteurUser && (
        <section aria-labelledby="demandes-heading">
          <h2 id="demandes-heading" className="sr-only">
            Demandes d&apos;événements des clients
          </h2>
          {requestsState === "loading" || requestsState === "idle" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-busy="true">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs animate-pulse space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : requestsState === "unauthorized" || requestsState === "forbidden" ? (
            <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-slate-200/80 shadow-xs space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Lock size={30} />
              </div>
              {requestsState === "unauthorized" ? (
                <>
                  <h3 className="font-extrabold text-slate-800 text-lg">Votre session a expiré</h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                    Reconnectez-vous pour consulter les demandes d&apos;événements des clients.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 bg-[#1D6B45] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs hover:bg-[#154d31]"
                  >
                    Se connecter
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="font-extrabold text-slate-800 text-lg">Espace réservé aux traiteurs</h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                    Les demandes d&apos;événements sont visibles des traiteurs disposant d&apos;un profil actif sur Dabari.
                  </p>
                  <Link
                    href="/profil/traiteur"
                    className="inline-flex items-center gap-2 bg-[#1D6B45] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs hover:bg-[#154d31]"
                  >
                    Gérer mon profil traiteur
                  </Link>
                </>
              )}
            </div>
          ) : requestsState === "error" ? (
            <div
              role="alert"
              className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-amber-200 shadow-xs space-y-4 max-w-xl mx-auto"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#D4870A] flex items-center justify-center mx-auto">
                <AlertCircle size={30} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">
                Impossible d&apos;afficher les demandes
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">{requestsError}</p>
              <button
                type="button"
                onClick={() => void loadRequests()}
                className="inline-flex items-center gap-2 bg-[#1D6B45] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs hover:bg-[#154d31] cursor-pointer"
              >
                <RotateCcw size={14} /> Réessayer
              </button>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#D4870A] flex items-center justify-center mx-auto">
                <Sparkles size={32} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">
                {requests.length === 0
                  ? "Aucune demande d'événement en cours"
                  : "Aucune demande ne correspond à votre recherche"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Les nouvelles demandes des clients apparaîtront ici dès leur publication.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredRequests.map((req) => {
                const clientName = req.client?.full_name || "Organisateur";
                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Header : Client + Type d'événement */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#1D6B45] font-black text-sm flex items-center justify-center shrink-0 border border-emerald-100 overflow-hidden">
                            {req.client?.avatar_url ? (
                              <Image
                                src={req.client.avatar_url}
                                alt=""
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              clientName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-base">{clientName}</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={13} className="text-[#1D6B45]" />
                              {req.location || req.client?.city || "Lieu à préciser"}
                            </p>
                          </div>
                        </div>

                        <span className="bg-emerald-50 text-[#1D6B45] font-bold text-xs px-3 py-1 rounded-xl">
                          {req.event_type}
                        </span>
                      </div>

                      {/* Informations clés : Date, Nombre de personnes, Budget */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl text-xs text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-[#1D6B45] shrink-0" />
                          <span className="truncate">
                            {new Date(req.event_date).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={14} className="text-[#1D6B45] shrink-0" />
                          <span>{req.guest_count ?? "?"} invités</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Euro size={14} className="text-[#D4870A] shrink-0" />
                          <span>{req.budget ? `${req.budget} €` : "À définir"}</span>
                        </div>
                      </div>

                      {/* Description et préférences */}
                      <div className="space-y-1">
                        <p className="text-xs text-slate-700 font-medium line-clamp-2">
                          {req.description || "Aucune note particulière."}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Utensils size={12} className="text-slate-400" />
                          <span>Préférences : {req.food_preferences}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Traiteur : Envoyer proposition */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Publié le {new Date(req.created_at).toLocaleDateString("fr-FR")}
                      </span>

                      {sentRequestIds.includes(req.id) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200">
                          <CheckCircle2 size={14} /> Proposition envoyée
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setProposalError(null);
                            setSelectedRequest(req);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1D6B45] text-white hover:bg-[#154d31] px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                        >
                          <Send size={13} /> Faire une proposition de devis
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── 5. CONTENU : ONGLET 3 - MES PROPOSITIONS ENVOYÉES ── */}
      {activeTab === "mes_propositions" && isTraiteurUser && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <h2 className="sr-only">Mes propositions envoyées</h2>
          <SentProposalsList />
        </section>
      )}

      {/* ── MODALE D'ENVOI DE PROPOSITION (RESPONSIVE PC & MOBILE) ── */}
      {selectedRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="proposal-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 id="proposal-dialog-title" className="font-extrabold text-slate-900 text-lg">
                  Proposer un devis
                </h2>
                <p className="text-xs text-slate-500">
                  Événement : {selectedRequest.event_type} ({selectedRequest.guest_count ?? "?"} pers.)
                </p>
              </div>
              <button
                type="button"
                onClick={closeProposalModal}
                disabled={sendingProposal}
                aria-label="Fermer"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>

            {proposalSuccess ? (
              <div className="text-center py-6 space-y-2" role="status">
                <div className="w-12 h-12 bg-emerald-100 text-[#1D6B45] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={26} />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Proposition envoyée !</h3>
                <p className="text-xs text-slate-500">L&apos;organisateur a été notifié de votre offre.</p>
              </div>
            ) : (
              <form onSubmit={handleOpenProposalConfirm} className="space-y-4">
                {proposalError && !showConfirmProposal && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2"
                  >
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{proposalError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="proposal-price" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tarif proposé (€) *
                  </label>
                  <input
                    id="proposal-price"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="Ex: 450"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="proposal-message" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Message & détail de la prestation *
                  </label>
                  <textarea
                    id="proposal-message"
                    rows={4}
                    required
                    placeholder="Détaillez vos menus, options de livraison ou service..."
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeProposalModal}
                    disabled={sendingProposal}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={sendingProposal}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1D6B45] text-white hover:bg-[#154d31] transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Envoyer ma proposition
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Confirmation avant envoi : l'erreur éventuelle reste affichée dans la confirmation */}
      <ConfirmDialog
        isOpen={showConfirmProposal}
        title="Confirmer l'envoi de la proposition"
        description={`Confirmez-vous l'envoi d'une proposition de ${proposedPrice} € pour cet événement ?`}
        confirmLabel={proposalError ? "Réessayer l'envoi" : "Confirmer et envoyer"}
        loadingLabel="Envoi en cours..."
        cancelLabel="Modifier"
        icon="send"
        loading={sendingProposal}
        error={proposalError}
        onConfirm={handleSendProposal}
        onClose={() => {
          if (sendingProposal) return;
          setShowConfirmProposal(false);
        }}
      />
    </div>
  );
}
