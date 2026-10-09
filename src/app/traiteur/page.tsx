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
} from "lucide-react";
import { getValidToken, authFetch } from "@/lib/auth";
import SentProposalsList from "@/components/traiteur/SentProposalsList";
import ConfirmDialog from "@/components/commandes/ConfirmDialog";

const CUISINE_EMOJI: Record<string, string> = {
  senegalais: "🇸🇳",
  ivoirien: "🇨🇮",
  camerounais: "🇨🇲",
  congolais: "🇨🇬",
};

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

  // Modale d'envoi de proposition pour traiteur
  const [selectedRequest, setSelectedRequest] = useState<TraiteurRequest | null>(null);
  const [proposedPrice, setProposedPrice] = useState("");
  const [proposalMessage, setProposalMessage] = useState("");
  const [sendingProposal, setSendingProposal] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSuccess, setProposalSuccess] = useState(false);

  // Chargement simultané initial pour garantir que les compteurs (traiteurs ET demandes) sont exacts dès l'ouverture
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

  // Filtrage par recherche pour les traiteurs
  const filteredTraiteurs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return traiteurs;

    return traiteurs.filter((traiteur) => {
      return (
        traiteur.name.toLowerCase().includes(query) ||
        traiteur.bio?.toLowerCase().includes(query) ||
        traiteur.delivery_zones?.some((z) => z.toLowerCase().includes(query)) ||
        traiteur.cuisine_type?.some((c) => c.toLowerCase().includes(query))
      );
    });
  }, [traiteurs, searchQuery]);

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
  };

  const hasActiveFilters = searchQuery.trim().length > 0;

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
    <div className="min-h-screen bg-[#F3F4F6] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1D6B45] via-[#165637] to-[#0F4A30] px-4 pt-10 pb-6 text-white shadow-md">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="text-white/70 text-sm mb-3 inline-block hover:text-white transition-colors"
          >
            ← Accueil
          </Link>
          <div className="mb-2">
            <h1 className="text-2xl font-extrabold text-white">Traiteurs africains</h1>
            <p className="text-white/80 text-xs mt-1">
              Commandez de délicieux plats ou trouvez un traiteur pour vos événements.
            </p>
          </div>

          {/* Bandeau d'annonce pour clients */}
          <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-3.5 my-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-amber-300 mt-0.5">
                <Sparkles size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">
                  Vous organisez un mariage, un baptême ou une fête ?
                </p>
                <p className="text-[11px] text-white/80 mt-0.5 leading-relaxed">
                  Publiez votre besoin culinaire et recevez des propositions personnalisées de nos traiteurs.
                </p>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-3">
              <span className="text-[11px] text-white/70">
                Gratuit & devis sur-mesure direct traiteurs
              </span>
              <Link
                href="/traiteur/demande"
                className="bg-white text-[#1D6B45] hover:bg-emerald-50 text-xs font-bold px-3.5 py-1.5 rounded-xl shrink-0 transition-all shadow-xs flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
              >
                <Plus size={13} /> Déposer une annonce
              </Link>
            </div>
          </div>

          {/* Onglets : Nos traiteurs vs Demandes clients vs Mes propositions */}
          <div className="flex gap-1.5 mb-4 bg-black/20 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab("traiteurs")}
              className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${
                activeTab === "traiteurs"
                  ? "bg-white text-[#1D6B45] shadow-xs"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Traiteurs ({traiteurs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("demandes")}
              className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${
                activeTab === "demandes"
                  ? "bg-white text-[#1D6B45] shadow-xs"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Demandes ({requests.length})
            </button>
            {isTraiteurUser && (
              <button
                type="button"
                onClick={() => setActiveTab("mes_propositions")}
                className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${
                  activeTab === "mes_propositions"
                    ? "bg-white text-[#1D6B45] shadow-xs"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Mes propositions ({sentRequestIds.length})
              </button>
            )}
          </div>

          {/* Search Bar */}
          {activeTab !== "mes_propositions" && (
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-3 text-[#1D6B45]" />
              <input
                type="text"
                placeholder={
                  activeTab === "traiteurs"
                    ? "Rechercher par zone, ville, nom de traiteur..."
                    : "Rechercher par type d'événement, ville, plats..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white text-gray-800 placeholder-gray-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results counter */}
      {hasActiveFilters && (
        <div className="bg-[#E8F5E9]/60 border-b border-[#1D6B45]/10 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center justify-between text-xs">
            <span className="font-semibold text-[#1D6B45]">
              {activeTab === "traiteurs"
                ? `${filteredTraiteurs.length} traiteur(s) trouvé(s)`
                : `${filteredRequests.length} demande(s) trouvée(s)`}
            </span>
            <button
              onClick={handleResetFilters}
              className="text-red-600 font-semibold hover:underline"
            >
              Effacer la recherche
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* ── ONGLET 1 : NOS TRAITEURS ── */}
        {activeTab === "traiteurs" && (
          <>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-4 animate-pulse">
                    <div className="h-32 bg-gray-200 rounded-2xl mb-3" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : filteredTraiteurs.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-3xl border border-gray-100 p-8">
                <div className="flex justify-center mb-3">
                  <ChefHat size={48} className="text-gray-300" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">
                  Aucun traiteur disponible
                </p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
                  Aucun traiteur ne correspond à votre recherche.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-[#1D6B45] text-white rounded-xl text-xs font-bold hover:bg-[#155235] transition-colors"
                  >
                    Voir tous les traiteurs
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                {filteredTraiteurs.map((traiteur) => (
                  <Link
                    key={traiteur.id}
                    href={`/traiteur/${traiteur.id}`}
                    className="block w-full mb-6 group"
                  >
                    <div className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-xs group-hover:shadow-md transition-all duration-200">
                      <div className="h-36 bg-gradient-to-r from-[#E8F5E9] to-[#C8E6C9] flex items-center justify-center overflow-hidden relative">
                        {traiteur.image_url ? (
                          <img
                            src={traiteur.image_url}
                            alt={traiteur.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-5xl">
                            {CUISINE_EMOJI[traiteur.cuisine_type?.[0]] || (
                              <ChefHat size={48} className="text-[#1D6B45]" />
                            )}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-1">
                          <h2 className="font-semibold text-gray-800 text-lg">
                            {traiteur.name}
                          </h2>
                          {traiteur.review_count && traiteur.review_count > 0 ? (
                            <div className="flex items-center gap-1 bg-[#E8F5E9] px-2 py-1 rounded-lg">
                              <Star
                                size={12}
                                className="text-yellow-500"
                                fill="currentColor"
                              />
                              <span className="text-[#1D6B45] text-xs font-medium">
                                {traiteur.rating}
                              </span>
                              <span className="text-gray-400 text-xs">
                                ({traiteur.review_count})
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                              <span className="text-gray-500 text-xs font-medium">
                                Nouveau
                              </span>
                            </div>
                          )}
                        </div>

                        <p className="text-gray-500 text-sm mb-2.5 line-clamp-2">
                          {traiteur.bio}
                        </p>

                        {/* Delivery zones badges */}
                        {traiteur.delivery_zones && traiteur.delivery_zones.length > 0 && (
                          <div className="flex items-start gap-1.5 mb-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <MapPin size={13} className="text-[#1D6B45] shrink-0 mt-0.5" />
                            <div className="flex flex-wrap gap-1">
                              {traiteur.delivery_zones.map((zone) => (
                                <span
                                  key={zone}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md font-medium border bg-white text-gray-600 border-gray-200"
                                >
                                  {zone}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex gap-1 flex-wrap">
                            {traiteur.cuisine_type?.map((c) => (
                              <span
                                key={c}
                                className="bg-[#E8F5E9] text-[#1D6B45] text-xs px-2 py-1 rounded-full capitalize font-medium"
                              >
                                {CUISINE_EMOJI[c]} {c}
                              </span>
                            ))}
                          </div>
                          <span className="text-[#1D6B45] text-sm font-semibold shrink-0 whitespace-nowrap ml-2">
                            {traiteur.dishes?.filter((d) => d.is_available).length || 0}{" "}
                            plat
                            {(traiteur.dishes?.filter((d) => d.is_available).length || 0) > 1
                              ? "s"
                              : ""}{" "}
                            →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ONGLET 2 : DEMANDES CLIENTS ── */}
        {activeTab === "demandes" && (
          <>
            {loadingRequests ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-5 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
                    <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8 shadow-xs">
                <div className="w-16 h-16 bg-amber-50 text-[#D4870A] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={28} />
                </div>
                <h3 className="font-bold text-gray-800 text-base mb-1">
                  Aucune recherche d'événement en cours
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mb-5">
                  Vous organisez un événement prochainement ? Publiez votre recherche pour recevoir des devis de nos traiteurs.
                </p>
                <Link
                  href="/traiteur/demande"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#1D6B45] text-white rounded-xl text-xs font-bold hover:bg-[#155235] transition-colors shadow-sm"
                >
                  <Plus size={15} /> Publier une annonce
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-medium">
                    Traiteurs : consultez les demandes et envoyez vos devis personnalisés aux organisateurs.
                  </p>
                </div>

                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs hover:shadow-md transition-shadow"
                  >
                    {/* En-tête : Nom & Prénom du Client bien visible + Événement complet sans coupure */}
                    <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-[#E8F5E9] text-[#1D6B45] flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-100">
                          {req.client?.avatar_url ? (
                            <img
                              src={req.client.avatar_url}
                              alt={req.client.full_name}
                              className="w-full h-full object-cover rounded-2xl"
                            />
                          ) : (
                            <span>
                              {req.client?.full_name
                                ? req.client.full_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()
                                : "CL"}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-gray-900 text-sm sm:text-base">
                              {req.client?.full_name || "Organisateur"}
                            </h4>
                            <span className="bg-[#E8F5E9] text-[#1D6B45] text-[11px] font-bold px-2.5 py-0.5 rounded-md whitespace-normal break-words">
                              {req.event_type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={12} className="text-[#1D6B45]" />
                            {req.location}
                          </p>
                        </div>
                      </div>

                      {req.budget ? (
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-gray-400 block font-medium">
                            Budget estimé
                          </span>
                          <span className="text-base font-black text-[#1D6B45]">
                            {req.budget} €
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <h3 className="font-bold text-gray-900 text-sm mb-2 break-words">
                      {req.title || `Recherche traiteur pour ${req.event_type.toLowerCase()}`}
                    </h3>

                    {/* Détails : Date, Invités, etc. */}
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-2xl text-xs mb-3">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Calendar size={14} className="text-[#1D6B45] shrink-0" />
                        <span>
                          {new Date(req.event_date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Users size={14} className="text-[#D4870A] shrink-0" />
                        <span>
                          {req.guest_count
                            ? `${req.guest_count} invités estimés`
                            : "Nb d'invités non précisé"}
                        </span>
                      </div>
                    </div>

                    {/* Nourriture souhaitée */}
                    <div className="mb-3.5">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Utensils size={12} className="text-[#1D6B45]" /> Plats & Nourriture souhaitée
                      </p>
                      <p className="text-xs text-gray-700 bg-amber-50/40 p-3 rounded-xl border border-amber-100/60 leading-relaxed break-words whitespace-pre-line">
                        {req.food_preferences}
                      </p>
                    </div>

                    {req.description && (
                      <p className="text-xs text-gray-500 mb-3 italic break-words">
                        "{req.description}"
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      {sentRequestIds.includes(req.id) ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1D6B45] bg-[#E8F5E9] px-2.5 py-1 rounded-full">
                          <CheckCircle2 size={12} /> Proposition envoyée
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium">
                          {req.proposals?.length || 0} proposition(s) reçue(s)
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequest(req);
                          setProposedPrice("");
                          setProposalMessage("");
                          setProposalError(null);
                        }}
                        className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          sentRequestIds.includes(req.id)
                            ? "bg-white border border-[#1D6B45] text-[#1D6B45] hover:bg-emerald-50"
                            : "bg-[#1D6B45] hover:bg-[#155235] text-white"
                        }`}
                      >
                        <Send size={13} />{" "}
                        {sentRequestIds.includes(req.id)
                          ? "Modifier ma proposition"
                          : "Envoyer une proposition"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ONGLET 3 : MES PROPOSITIONS (traiteur) ── */}
        {activeTab === "mes_propositions" && isTraiteurUser && (
          <SentProposalsList
            onLoaded={(ids) => setSentRequestIds(ids)}
          />
        )}
      </div>

      {/* Modale d'envoi de proposition (devis traiteur) */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => {
                setSelectedRequest(null);
                setProposalError(null);
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>

            {proposalSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#E8F5E9] text-[#1D6B45] rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Proposition envoyée !
                </h3>
                <p className="text-xs text-gray-500">
                  L'organisateur a été notifié de votre devis et pourra vous contacter.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <span className="inline-block bg-[#E8F5E9] text-[#1D6B45] text-[11px] font-bold px-2.5 py-0.5 rounded-md mb-2">
                    {selectedRequest.event_type}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">
                    Envoyer une proposition
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Client : <strong>{selectedRequest.client?.full_name || "Organisateur"}</strong> · {selectedRequest.location}
                  </p>
                </div>

                {/* Rappel du besoin client */}
                <div className="bg-gray-50 rounded-2xl p-3 text-xs text-gray-700 mb-4 border border-gray-100 space-y-1">
                  <p className="font-semibold text-gray-900">
                    Plats demandés :
                  </p>
                  <p className="text-gray-600 italic">
                    "{selectedRequest.food_preferences}"
                  </p>
                  {selectedRequest.budget && (
                    <p className="text-[#1D6B45] font-semibold pt-1">
                      Budget indicatif client : {selectedRequest.budget} €
                    </p>
                  )}
                </div>

                {proposalError && (
                  <div className="mb-3 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{proposalError}</span>
                  </div>
                )}

                <form onSubmit={handleOpenProposalConfirm} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                      <Euro size={13} className="text-[#1D6B45]" />
                      Votre tarif proposé TTC (€) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="Ex: 650"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                      <FileText size={13} className="text-[#1D6B45]" />
                      Détails de votre proposition & menu *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Décrivez votre menu, les quantités prévues, vos services inclus (livraison, service chaud...)..."
                      value={proposalMessage}
                      onChange={(e) => setProposalMessage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white resize-none"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(null)}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={sendingProposal || !proposedPrice || !proposalMessage.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-[#1D6B45] hover:bg-[#165637] text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      Continuer
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation avant transmission du devis traiteur */}
      <ConfirmDialog
        isOpen={showConfirmProposal}
        title="Transmettre votre proposition ?"
        description={
          selectedRequest ? (
            <>
              Vous êtes sur le point d'envoyer un devis de{" "}
              <strong className="text-[#1D6B45]">
                {proposedPrice ? `${proposedPrice} €` : "—"}
              </strong>{" "}
              à {selectedRequest.client?.full_name || "l'organisateur"} pour son
              événement ({selectedRequest.event_type}). Il sera notifié immédiatement.
            </>
          ) : undefined
        }
        confirmLabel="Oui, envoyer"
        loadingLabel="Envoi en cours..."
        icon="send"
        loading={sendingProposal}
        error={proposalError}
        onConfirm={handleSendProposal}
        onClose={() => setShowConfirmProposal(false)}
      />
    </div>
  );
}
