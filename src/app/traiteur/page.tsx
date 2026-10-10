"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { type Traiteur, type TraiteurRequest } from "@/lib/types/traiteur";
import Link from "next/link";
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
  Clock,
  Euro,
  FileText,
  ArrowRight,
  Filter,
  ShieldCheck,
} from "lucide-react";
import { getValidToken, authFetch } from "@/lib/auth";
import SentProposalsList from "@/components/traiteur/SentProposalsList";
import Image from "next/image";
import CountryFlag from "@/components/ui/CountryFlag";
import CountryFilterModal from "@/components/ui/CountryFilterModal";
import ConfirmDialog from "@/components/commandes/ConfirmDialog";

export default function TraiteurPage() {
  const [activeTab, setActiveTab] = useState<"traiteurs" | "demandes" | "mes_propositions">("traiteurs");
  const [isTraiteurUser, setIsTraiteurUser] = useState(false);
  const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);
  const [showConfirmProposal, setShowConfirmProposal] = useState(false);
  const [traiteurs, setTraiteurs] = useState<Traiteur[]>([]);
  const [requests, setRequests] = useState<TraiteurRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisineFilter, setSelectedCuisineFilter] = useState<string>("all");

  // Modale d'envoi de proposition pour traiteur
  const [selectedRequest, setSelectedRequest] = useState<TraiteurRequest | null>(null);
  const [proposedPrice, setProposedPrice] = useState("");
  const [proposalMessage, setProposalMessage] = useState("");
  const [sendingProposal, setSendingProposal] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSuccess, setProposalSuccess] = useState(false);

  // Chargement simultané initial pour garantir que les compteurs sont exacts dès l'ouverture
  const loadAllInitialData = useCallback(async () => {
    setLoading(true);
    setLoadingRequests(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const [traiteursRes, requestsRes] = await Promise.all([
        fetch(`${apiUrl}/traiteur`, {
          headers: { "Content-Type": "application/json" },
        }).catch(() => null),
        fetch(`${apiUrl}/traiteur/requests`, {
          headers: { "Content-Type": "application/json" },
        }).catch(() => null),
      ]);

      if (traiteursRes && traiteursRes.ok) {
        const tData = await traiteursRes.json();
        setTraiteurs(tData.data?.activeTraiteur || []);
      }

      if (requestsRes && requestsRes.ok) {
        const rData = await requestsRes.json();
        setRequests(rData.data?.requests || []);
      }
    } catch (err) {
      console.error("Erreur chargement initial traiteur/demandes:", err);
    } finally {
      setLoading(false);
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    loadAllInitialData();
  }, [loadAllInitialData]);

  // Rechargement rafraîchi lors du clic sur l'onglet demandes
  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const response = await fetch(`${apiUrl}/traiteur/requests`, {
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.data?.requests || []);
      }
    } catch (err) {
      console.error("Erreur fetch requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "demandes") {
      fetchRequests();
    }
  }, [activeTab, fetchRequests]);

  // Détecter si l'utilisateur connecté est traiteur + récupérer ses propositions déjà envoyées
  useEffect(() => {
    if (!getValidToken()) return;
    let ignore = false;
    (async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
        const meRes = await authFetch(`${apiUrl}/traiteur/me`);
        const me = await meRes.json().catch(() => ({}));
        if (ignore || !meRes.ok || !me?.isTraiteur) return;
        setIsTraiteurUser(true);
        const propRes = await authFetch(`${apiUrl}/traiteur/proposals/me`);
        const propJson = await propRes.json().catch(() => ({}));
        if (!ignore && propRes.ok) {
          setSentRequestIds(
            (propJson.data?.proposals || []).map((p: any) => p.request_id),
          );
        }
      } catch {
        /* silencieux */
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Origines culinaires dynamiques avec compteurs réels
  const availableCuisines = useMemo(() => {
    const list: { label: string; value: string; count: number }[] = [
      { label: "Toutes les cuisines", value: "all", count: traiteurs.length },
    ];
    const popular = [
      { label: "Sénégalais", value: "senegalais" },
      { label: "Ivoirien", value: "ivoirien" },
      { label: "Camerounais", value: "camerounais" },
      { label: "Congolais", value: "congolais" },
      { label: "Malien", value: "mali" },
      { label: "Guinéen", value: "guineen" },
      { label: "Béninois", value: "benin" },
      { label: "Togolais", value: "togo" },
    ];
    popular.forEach((p) => {
      const count = traiteurs.filter((t) =>
        t.cuisine_type?.some(
          (c) =>
            c.toLowerCase().includes(p.value) ||
            p.value.includes(c.toLowerCase()),
        ),
      ).length;
      if (
        count > 0 ||
        ["senegalais", "ivoirien", "camerounais", "congolais"].includes(p.value)
      ) {
        list.push({ ...p, count });
      }
    });
    return list;
  }, [traiteurs]);

  // Filtrage par recherche et cuisine pour les traiteurs
  const filteredTraiteurs = useMemo(() => {
    let result = traiteurs;

    if (selectedCuisineFilter !== "all") {
      result = result.filter((t) =>
        t.cuisine_type?.some(
          (c) =>
            c.toLowerCase().includes(selectedCuisineFilter.toLowerCase()) ||
            selectedCuisineFilter.toLowerCase().includes(c.toLowerCase()),
        ),
      );
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return result;

    return result.filter((traiteur) => {
      return (
        traiteur.name.toLowerCase().includes(query) ||
        traiteur.bio?.toLowerCase().includes(query) ||
        traiteur.delivery_zones?.some((z) => z.toLowerCase().includes(query)) ||
        traiteur.cuisine_type?.some((c) => c.toLowerCase().includes(query))
      );
    });
  }, [traiteurs, searchQuery, selectedCuisineFilter]);

  // Filtrage par recherche pour les demandes clients
  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return requests;

    return requests.filter((req) => {
      return (
        req.event_type.toLowerCase().includes(query) ||
        req.location.toLowerCase().includes(query) ||
        req.food_preferences.toLowerCase().includes(query) ||
        (req.description && req.description.toLowerCase().includes(query))
      );
    });
  }, [requests, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCuisineFilter("all");
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedCuisineFilter !== "all";

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
    if (!selectedRequest || !proposedPrice || !proposalMessage.trim() || sendingProposal) {
      return;
    }

    setSendingProposal(true);
    setProposalError(null);

    const token = getValidToken();
    if (!token) {
      setProposalError("Vous devez être connecté pour envoyer une proposition.");
      setSendingProposal(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const response = await authFetch(
        `${apiUrl}/traiteur/requests/${selectedRequest.id}/proposals`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            proposed_price: parseFloat(proposedPrice.replace(",", ".")),
            message: proposalMessage.trim(),
          }),
        },
      );

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.error || "Erreur lors de l'envoi de la proposition");
      }

      setShowConfirmProposal(false);
      setSentRequestIds((prev) =>
        prev.includes(selectedRequest.id) ? prev : [...prev, selectedRequest.id],
      );
      setIsTraiteurUser(true);
      setProposalSuccess(true);
      setTimeout(() => {
        setProposalSuccess(false);
        setSelectedRequest(null);
        setProposedPrice("");
        setProposalMessage("");
        fetchRequests();
      }, 1800);
    } catch (err: any) {
      setShowConfirmProposal(false);
      setProposalError(err.message || "Erreur lors de l'envoi de la proposition.");
    } finally {
      setSendingProposal(false);
    }
  };

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

            {/* Barre d'onglets principale */}
            <div className="pt-2 flex flex-wrap items-center gap-2 bg-black/25 backdrop-blur-md p-1.5 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => setActiveTab("traiteurs")}
                className={`py-2 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  activeTab === "traiteurs"
                    ? "bg-white text-[#1D6B45] shadow-md"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Chefs & Traiteurs ({traiteurs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("demandes")}
                className={`py-2 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  activeTab === "demandes"
                    ? "bg-white text-[#1D6B45] shadow-md"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Demandes d'événements ({requests.length})
              </button>
              {isTraiteurUser && (
                <button
                  type="button"
                  onClick={() => setActiveTab("mes_propositions")}
                  className={`py-2 px-4 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                    activeTab === "mes_propositions"
                      ? "bg-white text-[#1D6B45] shadow-md"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  Mes propositions ({sentRequestIds.length})
                </button>
              )}
            </div>
          </div>

          {/* Bandeau d'action pour déposer une annonce */}
          <div className="w-full lg:w-96 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-white space-y-4 shrink-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-[#D4870A] flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-amber-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Vous prévoyez une fête ?</h3>
                <p className="text-[11px] text-white/70">Recevez plusieurs devis sans engagement</p>
              </div>
            </div>
            <p className="text-xs text-white/85 leading-relaxed">
              Publiez votre besoin culinaire (date, nombre d'invités, budget) et nos chefs certifiés vous enverront leurs meilleures propositions.
            </p>
            <Link
              href="/traiteur/demande"
              className="w-full flex items-center justify-center gap-2 bg-white text-[#1D6B45] hover:bg-emerald-50 text-xs sm:text-sm font-extrabold py-3 px-4 rounded-xl shadow-md transition-all hover:scale-102"
            >
              <Plus size={16} /> Déposer une annonce d'événement
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
        <section>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          ) : filteredTraiteurs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ChefHat size={32} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">
                Aucun traiteur ne correspond à votre recherche
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Essayez d'élargir votre recherche géographique ou découvrez d'autres spécialités.
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
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTraiteurs.map((traiteur) => {
                const availableDishesCount =
                  traiteur.dishes?.filter((d) => d.is_available).length || 0;

                return (
                  <Link
                    key={traiteur.id}
                    href={`/traiteur/${traiteur.id}`}
                    className="group block h-full"
                  >
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
                              alt={traiteur.name}
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

                          <span className="text-xs font-black text-[#1D6B45] group-hover:translate-x-1 transition-transform flex items-center gap-1.5 shrink-0 bg-emerald-50 hover:bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-100 transition-colors">
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

      {/* ── 4. CONTENU : ONGLET 2 - DEMANDES D'ÉVÉNEMENTS (MARKETPLACE INVERSÉE) ── */}
      {activeTab === "demandes" && (
        <section>
          {loadingRequests ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs animate-pulse space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#D4870A] flex items-center justify-center mx-auto">
                <Sparkles size={32} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">
                Aucune demande d'événement en cours
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Organisez-vous un événement ? Déposez votre demande pour recevoir des devis de nos chefs partenaires.
              </p>
              <Link
                href="/traiteur/demande"
                className="inline-flex items-center gap-2 bg-[#1D6B45] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs hover:bg-[#154d31]"
              >
                <Plus size={15} /> Déposer une annonce
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header : Client + Type d'événement */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#1D6B45] font-black text-sm flex items-center justify-center shrink-0 border border-emerald-100">
                          {req.client?.avatar_url ? (
                            <Image
                              src={req.client.avatar_url}
                              alt={req.client.full_name || "Client"}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover rounded-2xl"
                            />
                          ) : (
                            req.client?.full_name?.slice(0, 2).toUpperCase() || "CL"
                          )}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-base">
                            {req.client?.full_name || "Organisateur"}
                          </h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={13} className="text-[#1D6B45]" />
                            {req.location}
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
                        <span>{req.guest_count} invités</span>
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
                        onClick={() => setSelectedRequest(req)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#1D6B45] text-white hover:bg-[#154d31] px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                      >
                        <Send size={13} /> Faire une proposition de devis
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 5. CONTENU : ONGLET 3 - MES PROPOSITIONS ENVOYÉES ── */}
      {activeTab === "mes_propositions" && isTraiteurUser && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <SentProposalsList />
        </section>
      )}

      {/* ── MODALE D'ENVOI DE PROPOSITION (RESPONSIVE PC & MOBILE) ── */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  Proposer un devis
                </h3>
                <p className="text-xs text-slate-500">
                  Événement : {selectedRequest.event_type} ({selectedRequest.guest_count} pers.)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            {proposalSuccess ? (
              <div className="text-center py-6 space-y-2">
                <div className="w-12 h-12 bg-emerald-100 text-[#1D6B45] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={26} />
                </div>
                <h4 className="font-bold text-slate-800 text-base">Proposition envoyée !</h4>
                <p className="text-xs text-slate-500">L'organisateur a été notifié de votre offre.</p>
              </div>
            ) : (
              <form onSubmit={handleOpenProposalConfirm} className="space-y-4">
                {proposalError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{proposalError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tarif proposé (€) *
                  </label>
                  <input
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Message & détail de la prestation *
                  </label>
                  <textarea
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
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1D6B45] text-white hover:bg-[#154d31] transition-colors shadow-xs"
                  >
                    Envoyer ma proposition
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Confirmation avant envoi */}
      <ConfirmDialog
        isOpen={showConfirmProposal}
        title="Confirmer l'envoi de la proposition"
        description={`Confirmez-vous l'envoi d'une proposition de ${proposedPrice} € pour cet événement ?`}
        confirmLabel="Confirmer et envoyer"
        cancelLabel="Modifier"
        loading={sendingProposal}
        onConfirm={handleSendProposal}
        onClose={() => setShowConfirmProposal(false)}
      />
    </div>
  );
}
