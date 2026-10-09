"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getValidToken, removeToken, authFetch } from "@/lib/auth";
import {
  TraiteurRequest,
  TraiteurProposal,
  formatWhatsAppUrl,
} from "@/lib/types/traiteur";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Inbox,
  ChefHat,
  User,
  Calendar,
  Users,
  MapPin,
  MessageSquare,
  StickyNote,
  Banknote,
  Plane,
  Package,
  Scale,
  PartyPopper,
  ArrowRight,
  Edit3,
  Sparkles,
  PlusCircle,
  Check,
  Phone,
  AlertCircle,
  Trash2,
} from "lucide-react";
import CancelConfirmModal from "@/components/commandes/CancelConfirmModal";
import EditDevisModal from "@/components/commandes/EditDevisModal";
import EditPlatModal from "@/components/commandes/EditPlatModal";
import EditGpModal from "@/components/commandes/EditGpModal";
import EditTraiteurRequestModal from "@/components/commandes/EditTraiteurRequestModal";
import ProposalCard from "@/components/commandes/ProposalCard";
import ConfirmDialog from "@/components/commandes/ConfirmDialog";
import GpTrackingTimeline, {
  getGpStatusLabel,
  getNextGpStatus,
} from "@/components/gp/GpTrackingTimeline";
import SignalGpDelayModal from "@/components/gp/SignalGpDelayModal";
import { ChevronDown, ChevronUp, Truck, CheckCheck } from "lucide-react";

type CommandeTraiteur = {
  id: string;
  date_evenement: string;
  nb_personnes: number;
  adresse: string;
  type_evenement: string | null;
  notes: string | null;
  statut: string;
  message_traiteur: string | null;
  created_at: string;
  client_id: string;
  traiteur_id: string;
  traiteur?: { name: string; whatsapp: string | null } | null;
  traiteurs?: { name: string; whatsapp: string | null } | null;
  client?: { full_name: string; phone: string | null } | null;
  profiles?: { full_name: string; phone: string | null } | null;
};

type OrderPlat = {
  id: string;
  client_id: string;
  traiteur_id: string;
  status: string;
  delivery_type: string;
  delivery_address: string | null;
  delivery_date: string | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
  traiteur?: { name: string; whatsapp: string | null } | null;
  traiteurs?: { name: string; whatsapp: string | null } | null;
  client?: { full_name: string; phone: string | null } | null;
  profiles?: { full_name: string; phone: string | null } | null;
  order_items?: {
    id: string;
    quantity: number;
    dish?: { name: string; price: number } | null;
    dishes?: { name: string; price: number } | null;
  }[];
};

type GpRequest = {
  id: string;
  listing_id: string;
  sender_id: string;
  weight_kg: number;
  content_desc: string;
  declared_value: number;
  status: string;
  total_amount: number;
  notes: string | null;
  departure_city?: string | null;
  departure_country?: string | null;
  arrival_city?: string | null;
  arrival_country?: string | null;
  departure_date?: string | null;
  arrival_date?: string | null;
  is_delayed?: boolean | null;
  delay_reason?: string | null;
  created_at: string;
  listing?: {
    departure_city: string;
    arrival_city: string;
    departure_country: string;
    arrival_country: string;
    departure_date: string;
    arrival_date?: string | null;
    pickup_city?: string | null;
    pickup_address?: string | null;
    dropoff_city?: string | null;
    dropoff_address?: string | null;
    is_delayed?: boolean | null;
    delay_reason?: string | null;
    gp_id: string;
    is_active?: boolean | null;
    gp?: { full_name?: string; phone?: string | null; whatsapp?: string | null } | null;
    profiles?: { full_name?: string; phone?: string | null; whatsapp?: string | null } | null;
  } | null;
  gp_listings?: {
    departure_city: string;
    arrival_city: string;
    departure_country: string;
    arrival_country: string;
    departure_date: string;
    arrival_date?: string | null;
    pickup_city?: string | null;
    pickup_address?: string | null;
    dropoff_city?: string | null;
    dropoff_address?: string | null;
    is_delayed?: boolean | null;
    delay_reason?: string | null;
    gp_id: string;
    is_active?: boolean | null;
    gp?: { full_name?: string; phone?: string | null; whatsapp?: string | null } | null;
    profiles?: { full_name?: string; phone?: string | null; whatsapp?: string | null } | null;
  } | null;
  sender?: { full_name: string; phone: string | null } | null;
  profiles?: { full_name: string; phone: string | null } | null;
};

type Tab = "envoyees" | "receptions" | "recues";

export default function CommandesPage() {
  const [tab, setTab] = useState<Tab>("envoyees");
  const [serviceFilter, setServiceFilter] = useState<
    "tout" | "traiteur" | "gp"
  >("tout");
  const [isTraiteur, setIsTraiteur] = useState(false);
  const [isGp, setIsGp] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [messageRefus, setMessageRefus] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<{
    type:
      | "accepter_traiteur"
      | "refuser_traiteur"
      | "accepter_order"
      | "refuser_order"
      | "accepter_gp"
      | "refuser_gp";
    item: any;
  } | null>(null);

  // Envoyées
  const [commandesEnvoyees, setCommandesEnvoyees] = useState<
    CommandeTraiteur[]
  >([]);
  const [ordersEnvoyees, setOrdersEnvoyees] = useState<OrderPlat[]>([]);
  const [gpEnvoyees, setGpEnvoyees] = useState<GpRequest[]>([]);

  // Mes recherches de traiteur & propositions reçues (Client)
  const [myTraiteurRequests, setMyTraiteurRequests] = useState<TraiteurRequest[]>([]);
  const [proposalActionLoading, setProposalActionLoading] = useState<string | null>(null);
  const [proposalConfirm, setProposalConfirm] = useState<{
    proposal: TraiteurProposal;
    action: "accept" | "reject";
    eventType: string;
  } | null>(null);

  // Reçues (Espace Pro)
  const [commandesRecues, setCommandesRecues] = useState<CommandeTraiteur[]>(
    [],
  );
  const [ordersRecues, setOrdersRecues] = useState<OrderPlat[]>([]);
  const [gpRecues, setGpRecues] = useState<GpRequest[]>([]);

  // Modales de modification & annulation client
  const [editingDevis, setEditingDevis] = useState<CommandeTraiteur | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderPlat | null>(null);
  const [editingGp, setEditingGp] = useState<GpRequest | null>(null);
  const [editingTraiteurRequest, setEditingTraiteurRequest] =
    useState<TraiteurRequest | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    type: "traiteur" | "order" | "gp" | "traiteur_request";
    id: string;
    title: string;
  } | null>(null);

  // Suivi de commande GP & Retard
  const [expandedGpTracking, setExpandedGpTracking] = useState<Record<string, boolean>>({});
  const [gpStatusConfirm, setGpStatusConfirm] = useState<{
    request: GpRequest;
    newStatus: string;
    statusLabel: string;
  } | null>(null);
  const [updatingGpStatusId, setUpdatingGpStatusId] = useState<string | null>(null);
  const [delayTargetGp, setDelayTargetGp] = useState<GpRequest | null>(null);

  useEffect(() => {
    const load = async () => {
      const token = getValidToken();
      if (!token) {
        router.push("/login");
        return;
      }
      await loadAll();
    };
    load();
  }, []);

  const sortOrdersByPendingFirst = <
    T extends { statut?: string; status?: string; created_at?: string },
  >(
    items: T[],
  ): T[] => {
    return [...items].sort((a, b) => {
      const statusA = a.statut || a.status || "";
      const statusB = b.statut || b.status || "";

      const isPendingA = statusA === "en_attente" || statusA === "pending";
      const isPendingB = statusB === "en_attente" || statusB === "pending";

      if (isPendingA && !isPendingB) return -1;
      if (!isPendingA && isPendingB) return 1;

      //tri ordre décroissant
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  };

  async function loadAll() {
    setLoading(true);
    const token = getValidToken();
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      authFetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read-all`, {
        method: "PATCH",
      }).catch((err) => console.error("Erreur mark-all-as-read:", err));

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (response.status === 401) {
        removeToken();
        router.push("/login");
        return;
      }
      const res = await response.json();
      if (!response.ok) {
        console.error(res.message || "Erreur de chargement des commandes");
        setLoading(false);
        return;
      }
      const profile = res.data.orders;
      if (!profile) return;
      // ── 1. Commandes envoyées (Client) ──
      setCommandesEnvoyees(sortOrdersByPendingFirst(profile.commandes || []));
      setOrdersEnvoyees(sortOrdersByPendingFirst(profile.orders || []));
      setGpEnvoyees(sortOrdersByPendingFirst(profile.gp_requests || []));
      // ── 2. Recherches de traiteur (Client) & Devis reçus ──
      setMyTraiteurRequests(profile.traiteur_requests || []);
      // ── 3. Statut & Commandes reçues (Traiteur) ──
      const traiteurData = profile.traiteurs?.[0];
      if (profile.role === "traiteur" || traiteurData) {
        setIsTraiteur(true);
        setCommandesRecues(
          sortOrdersByPendingFirst(traiteurData?.commandes || []),
        );
        setOrdersRecues(sortOrdersByPendingFirst(traiteurData?.orders || []));
      }
      // ── 4. Statut & Demandes reçues (GP Voyageur) ──
      const gpListings = profile.gp_listings || [];
      if (gpListings.length > 0) {
        setIsGp(true);
        // Récupère toutes les demandes reçues sur tous vos trajets
        const allGpRequestsReceived = gpListings.flatMap(
          (l: any) => l.requests || [],
        );
        setGpRecues(sortOrdersByPendingFirst(allGpRequestsReceived));
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des commandes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleProposalStatus(
    proposal: TraiteurProposal,
    status: "accepted" | "rejected",
  ) {
    setProposalActionLoading(proposal.id);
    const actionLabel = status === "accepted" ? "l'acceptation" : "le refus";
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/traiteur/proposals/${proposal.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        },
      );
      if (res.ok) {
        await loadAll();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || data.message || `Erreur lors de ${actionLabel} de la proposition.`);
      }
    } catch (e: any) {
      console.error(`Erreur ${actionLabel} proposition:`, e);
      alert(e.message || `Erreur réseau lors de ${actionLabel}.`);
    } finally {
      setProposalActionLoading(null);
    }
  }

  async function confirmProposalAction() {
    if (!proposalConfirm) return;
    const { proposal, action } = proposalConfirm;
    await handleProposalStatus(proposal, action === "accept" ? "accepted" : "rejected");
    setProposalConfirm(null);
  }

  async function handleAccepterTraiteur(commande: CommandeTraiteur) {
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande/traiteur/${commande.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ statut: "acceptee" }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || data.message || "Erreur lors de l'acceptation");
        return;
      }
      setCommandesRecues((prev) =>
        sortOrdersByPendingFirst(
          prev.map((c) =>
            c.id === commande.id ? { ...c, statut: "acceptee" } : c,
          ),
        ),
      );
    } catch (e: any) {
      alert(e.message || "Erreur réseau");
    }
  }

  async function handleRefuserTraiteur(commande: CommandeTraiteur) {
    const message = messageRefus[commande.id] || "";
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande/traiteur/${commande.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ statut: "refusee", message_traiteur: message }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || data.message || "Erreur lors du refus");
        return;
      }
      setCommandesRecues((prev) =>
        sortOrdersByPendingFirst(
          prev.map((c) =>
            c.id === commande.id
              ? { ...c, statut: "refusee", message_traiteur: message }
              : c,
          ),
        ),
      );
    } catch (e: any) {
      alert(e.message || "Erreur réseau");
    }
  }

  async function handleAccepterOrder(order: OrderPlat) {
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande/order/${order.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "accepted" }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || data.message || "Erreur lors de l'acceptation");
        return;
      }
      setOrdersRecues((prev) =>
        sortOrdersByPendingFirst(
          prev.map((o) => (o.id === order.id ? { ...o, status: "accepted" } : o)),
        ),
      );
    } catch (e: any) {
      alert(e.message || "Erreur réseau");
    }
  }

  async function handleRefuserOrder(order: OrderPlat) {
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande/order/${order.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "rejected" }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || data.message || "Erreur lors du refus");
        return;
      }
      setOrdersRecues((prev) =>
        sortOrdersByPendingFirst(
          prev.map((o) => (o.id === order.id ? { ...o, status: "rejected" } : o)),
        ),
      );
    } catch (e: any) {
      alert(e.message || "Erreur réseau");
    }
  }

  async function handleAccepterGp(request: GpRequest) {
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande/gp/${request.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "accepted" }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || data.message || "Erreur lors de l'acceptation");
        return;
      }
      setGpRecues((prev) =>
        sortOrdersByPendingFirst(
          prev.map((r) =>
            r.id === request.id ? { ...r, status: "accepted" } : r,
          ),
        ),
      );
    } catch (e: any) {
      alert(e.message || "Erreur réseau");
    }
  }

  async function handleRefuserGp(request: GpRequest) {
    const message = messageRefus[request.id] || "";
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande/gp/${request.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "rejected", message }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || data.message || "Erreur lors du refus");
        return;
      }
      setGpRecues((prev) =>
        sortOrdersByPendingFirst(
          prev.map((r) =>
            r.id === request.id ? { ...r, status: "rejected" } : r,
          ),
        ),
      );
    } catch (e: any) {
      alert(e.message || "Erreur réseau");
    }
  }


  async function handleConfirmUpdateGpStatus() {
    if (!gpStatusConfirm) return;
    const { request, newStatus } = gpStatusConfirm;
    setUpdatingGpStatusId(request.id);
    try {
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande/gp/${request.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (res.ok) {
        setGpRecues((prev) =>
          sortOrdersByPendingFirst(
            prev.map((r) =>
              r.id === request.id ? { ...r, status: newStatus } : r,
            ),
          ),
        );
        setGpEnvoyees((prev) =>
          sortOrdersByPendingFirst(
            prev.map((r) =>
              r.id === request.id ? { ...r, status: newStatus } : r,
            ),
          ),
        );
        setGpStatusConfirm(null);
      }
    } catch (e) {
      console.error("Erreur mise à jour statut GP:", e);
    } finally {
      setUpdatingGpStatusId(null);
    }
  }

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "en_attente":
      case "pending":
        return (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium flex items-center w-fit gap-1">
            <Clock size={14} /> En attente
          </span>
        );
      case "acceptee":
      case "accepted":
        return (
          <span className="text-xs bg-[#E8F5E9] text-[#1D6B45] px-2 py-1 rounded-full font-medium flex items-center w-fit gap-1">
            <CheckCircle2 size={14} /> Acceptée
          </span>
        );
      case "colis_recu":
        return (
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium flex items-center w-fit gap-1 border border-blue-200">
            <Package size={14} /> Colis réceptionné
          </span>
        );
      case "en_acheminement":
        return (
          <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium flex items-center w-fit gap-1 border border-purple-200">
            <Plane size={14} /> En acheminement
          </span>
        );
      case "arrive":
        return (
          <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full font-medium flex items-center w-fit gap-1 border border-amber-200">
            <MapPin size={14} /> Arrivé à destination
          </span>
        );
      case "livre":
        return (
          <span className="text-xs bg-[#E8F5E9] text-[#1D6B45] px-2.5 py-1 rounded-full font-medium flex items-center w-fit gap-1 border border-[#1D6B45]/20">
            <CheckCheck size={14} /> Livré & Récupéré
          </span>
        );
      case "refusee":
      case "rejected":
        return (
          <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium flex items-center w-fit gap-1">
            <XCircle size={14} /> Refusée
          </span>
        );
      case "annulee":
      case "cancelled":
        return (
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium flex items-center w-fit gap-1 border border-gray-200">
            <XCircle size={14} className="text-gray-400" /> Annulée
          </span>
        );
      default:
        return (
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium flex items-center w-fit gap-1 border border-gray-200">
            {statut}
          </span>
        );
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const pendingRecues =
    commandesRecues.filter(
      (c) => c.statut === "en_attente" || c.statut === "pending",
    ).length +
    ordersRecues.filter(
      (o) => o.status === "pending" || o.status === "en_attente",
    ).length +
    gpRecues.filter((r) => r.status === "pending" || r.status === "en_attente")
      .length;

  const totalPendingProposals = myTraiteurRequests.reduce(
    (acc, r) =>
      acc + (r.proposals?.filter((p) => p.status === "pending").length || 0),
    0,
  );

  if (loading)
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-[#1D6B45]">Chargement...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-24">
      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package size={24} /> Commandes & Réceptions
        </h1>

        {/* Onglets */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setTab("envoyees")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === "envoyees"
                ? "bg-white text-[#1D6B45] shadow-sm"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            <ShoppingCart size={18} className="inline mr-1.5" /> Mes commandes
          </button>

          <button
            onClick={() => setTab("receptions")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
              tab === "receptions"
                ? "bg-white text-[#1D6B45] shadow-sm"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            <PartyPopper size={18} className="inline mr-1.5" /> Devis & Annonces
            {totalPendingProposals > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 text-gray-900 rounded-full text-xs flex items-center justify-center font-bold shadow">
                {totalPendingProposals}
              </span>
            )}
          </button>

          {(isTraiteur || isGp) && (
            <button
              onClick={() => setTab("recues")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                tab === "recues"
                  ? "bg-white text-[#1D6B45] shadow-sm"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <Inbox size={18} className="inline mr-1.5" /> Espace Pro
              {pendingRecues > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                  {pendingRecues}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Sous-filtres Traiteur / GP (visible sur Mes commandes et Espace Pro) */}
        {tab !== "receptions" && (
          <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
            {(["tout", "traiteur", "gp"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setServiceFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border border-transparent ${
                  serviceFilter === f
                    ? "bg-white text-[#1D6B45]"
                    : "bg-white/20 text-white hover:bg-white/30 border-white/10"
                }`}
              >
                {f === "tout"
                  ? "Tout voir"
                  : f === "traiteur"
                    ? "Traiteur & Plats"
                    : "GP Colis"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        {/* ── ONGLET ENVOYÉES ── */}
        {tab === "envoyees" && (
          <>
            {/* Commandes traiteur */}
            {(serviceFilter === "tout" || serviceFilter === "traiteur") &&
              commandesEnvoyees.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    <ChefHat size={18} className="inline mr-1" /> Commandes
                    traiteur
                  </h2>
                  <div className="space-y-3">
                    {commandesEnvoyees.map((commande) => {
                      const traiteurInfo =
                        commande.traiteur || commande.traiteurs;
                      return (
                        <div
                          key={commande.id}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-800">
                                <ChefHat
                                  size={16}
                                  className="inline mr-1 text-[#1D6B45]"
                                />{" "}
                                {traiteurInfo?.name || "Traiteur"}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {formatDate(commande.created_at)}
                              </p>
                            </div>
                            {getStatutBadge(commande.statut)}
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>{formatDate(commande.date_evenement)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>{commande.nb_personnes} personnes</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>{commande.adresse}</span>
                            </div>
                            {commande.type_evenement && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <PartyPopper
                                  size={16}
                                  className="text-[#1D6B45] inline mr-1"
                                />
                                <span>{commande.type_evenement}</span>
                              </div>
                            )}
                            {commande.notes && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <StickyNote
                                  size={16}
                                  className="text-[#1D6B45] inline mr-1"
                                />
                                <span>{commande.notes}</span>
                              </div>
                            )}
                          </div>
                          {commande.statut === "refusee" &&
                            commande.message_traiteur && (
                              <div className="bg-red-50 rounded-xl p-3 mb-3">
                                <p className="text-xs text-red-600 font-medium mb-1">
                                  Motif du refus :
                                </p>
                                <p className="text-sm text-red-700">
                                  {commande.message_traiteur}
                                </p>
                              </div>
                            )}
                          {commande.statut === "acceptee" &&
                            traiteurInfo?.whatsapp && (
                              <button
                                onClick={() => {
                                  const url = formatWhatsAppUrl(
                                    traiteurInfo.whatsapp,
                                    `Bonjour, je vous contacte suite à ma commande du ${commande.date_evenement} sur Dabari.`
                                  );
                                  if (url) window.open(url, "_blank");
                                }}
                                className="w-full bg-[#25D366] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1da851] transition-colors flex items-center justify-center gap-2"
                              >
                                <MessageSquare
                                  size={16}
                                  className="inline mr-2"
                                />{" "}
                                Contacter le traiteur sur WhatsApp
                              </button>
                            )}
                          {(commande.statut === "en_attente" ||
                            commande.statut === "pending") && (
                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={() => setEditingDevis(commande)}
                                className="flex-1 py-2.5 px-3 bg-[#1D6B45]/10 text-[#1D6B45] hover:bg-[#1D6B45]/20 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Edit3 size={14} /> Modifier la demande
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCancelTarget({
                                    type: "traiteur",
                                    id: commande.id,
                                    title: `votre devis chez ${traiteurInfo?.name || "le traiteur"}`,
                                  })
                                }
                                className="flex-1 py-2.5 px-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                              >
                                <XCircle size={14} /> Annuler
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Commandes plats */}
            {(serviceFilter === "tout" || serviceFilter === "traiteur") &&
              ordersEnvoyees.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    <ShoppingCart size={18} className="inline mr-1" /> Commandes
                    plats
                  </h2>
                  <div className="space-y-3">
                    {ordersEnvoyees.map((order) => {
                      const traiteurInfo = order.traiteur || order.traiteurs;
                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-800">
                                <ChefHat
                                  size={16}
                                  className="inline mr-1 text-[#1D6B45]"
                                />{" "}
                                {traiteurInfo?.name || "Traiteur"}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {formatDate(order.created_at)}
                              </p>
                            </div>
                            {getStatutBadge(order.status)}
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-3">
                            {order.order_items?.map((item) => {
                              const dishInfo = item.dish || item.dishes;
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between text-sm text-gray-600"
                                >
                                  <ChefHat
                                    size={16}
                                    className="text-[#1D6B45] inline mr-1"
                                  />{" "}
                                  <span className="text-gray-600">
                                    {dishInfo?.name} x{item.quantity}
                                  </span>
                                  <span className="font-medium text-[#1D6B45]">
                                    {dishInfo?.price
                                      ? (
                                          dishInfo.price * item.quantity
                                        ).toFixed(2)
                                      : "0.00"}{" "}
                                    €
                                  </span>
                                </div>
                              );
                            })}
                            <div className="border-t border-gray-200 pt-2 mt-1 flex justify-between font-bold text-black text-sm">
                              <span>Total</span>
                              <span className="text-[#1D6B45]">
                                {Number(order.total_amount).toFixed(2)} €
                              </span>
                            </div>
                            {order.delivery_address && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 pt-1">
                                <MapPin
                                  size={16}
                                  className="text-[#1D6B45] inline mr-1"
                                />
                                <span>{order.delivery_address}</span>
                              </div>
                            )}
                            {order.delivery_date && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar
                                  size={16}
                                  className="text-[#1D6B45] inline mr-1"
                                />
                                <span>{formatDate(order.delivery_date)}</span>
                              </div>
                            )}
                          </div>
                          {order.status === "accepted" &&
                            traiteurInfo?.whatsapp && (
                              <button
                                onClick={() => {
                                  const url = formatWhatsAppUrl(
                                    traiteurInfo.whatsapp,
                                    `Bonjour, je vous contacte suite à ma commande de plats sur Dabari.`
                                  );
                                  if (url) window.open(url, "_blank");
                                }}
                                className="w-full bg-[#25D366] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1da851] transition-colors flex items-center justify-center gap-2"
                              >
                                <MessageSquare
                                  size={16}
                                  className="inline mr-2"
                                />{" "}
                                Contacter le traiteur sur WhatsApp
                              </button>
                            )}
                          {(order.status === "pending" ||
                            order.status === "en_attente") && (
                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={() => setEditingOrder(order)}
                                className="flex-1 py-2.5 px-3 bg-[#1D6B45]/10 text-[#1D6B45] hover:bg-[#1D6B45]/20 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Edit3 size={14} /> Modifier la commande
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCancelTarget({
                                    type: "order",
                                    id: order.id,
                                    title: `votre commande chez ${traiteurInfo?.name || "le traiteur"}`,
                                  })
                                }
                                className="flex-1 py-2.5 px-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                              >
                                <XCircle size={14} /> Annuler
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Demandes GP */}
            {(serviceFilter === "tout" || serviceFilter === "gp") &&
              gpEnvoyees.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    <Plane size={18} className="inline mr-1" /> Demandes GP
                    colis
                  </h2>
                  <div className="space-y-3">
                    {gpEnvoyees.map((request) => {
                      const listing = request.listing || request.gp_listings;
                      const depCity =
                        request.departure_city || listing?.departure_city;
                      const depCountry =
                        request.departure_country || listing?.departure_country;
                      const arrCity =
                        request.arrival_city || listing?.arrival_city;
                      const arrCountry =
                        request.arrival_country || listing?.arrival_country;
                      const depDate =
                        request.departure_date || listing?.departure_date;
                      const arrDate =
                        request.arrival_date || listing?.arrival_date;
                      const pickupCity = listing?.pickup_city;
                      const dropoffCity = listing?.dropoff_city;
                      const isListingDeleted =
                        !listing || listing.is_active === false;

                      return (
                        <div
                          key={request.id}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-800 flex items-center flex-wrap gap-1">
                                <Plane
                                  size={16}
                                  className="inline mr-1 text-[#1D6B45]"
                                />{" "}
                                <span>
                                  {depCity && arrCity
                                    ? `${depCity} (${depCountry || ""}) → ${arrCity} (${arrCountry || ""})`
                                    : "Annonce retirée"}
                                </span>
                                {isListingDeleted && (
                                  <span className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-medium border border-red-100">
                                    Annonce supprimée
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {formatDate(request.created_at)}
                              </p>
                            </div>
                            {getStatutBadge(request.status)}
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                              <Calendar
                                size={16}
                                className="text-[#1D6B45] inline mr-1 shrink-0"
                              />
                              <span>
                                <strong>Départ :</strong> {depDate ? formatDate(depDate) : "N/A"}
                                {pickupCity && ` (Dépôt : ${pickupCity})`}
                              </span>
                            </div>
                            {arrDate && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                                <Calendar
                                  size={16}
                                  className="text-[#D4870A] inline mr-1 shrink-0"
                                />
                                <span>
                                  <strong>Arrivée :</strong> {formatDate(arrDate)}
                                  {dropoffCity && ` (Récupération : ${dropoffCity})`}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Scale
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>{request.weight_kg} kg</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Package
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>{request.content_desc}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Banknote
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>{request.total_amount} €</span>
                            </div>
                            {request.notes && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <StickyNote
                                  size={16}
                                  className="text-[#1D6B45] inline mr-1"
                                />
                                <span>{request.notes}</span>
                              </div>
                            )}
                          </div>

                          {/* Suivi de commande GP (Client) */}
                          <div className="pt-3 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedGpTracking((prev) => ({
                                  ...prev,
                                  [request.id]: !prev[request.id],
                                }))
                              }
                              className="w-full py-2.5 px-3.5 bg-emerald-50/80 hover:bg-emerald-100/80 text-[#1D6B45] rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border border-emerald-100/60"
                            >
                              <span className="flex items-center gap-2">
                                <Truck size={15} />
                                <span>Suivre l&apos;acheminement du colis · {getGpStatusLabel(request.status)}</span>
                              </span>
                              {expandedGpTracking[request.id] ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </button>

                            {expandedGpTracking[request.id] && (
                              <div className="mt-3">
                                <GpTrackingTimeline
                                  status={request.status}
                                  departureCity={depCity}
                                  departureCountry={depCountry}
                                  arrivalCity={arrCity}
                                  arrivalCountry={arrCountry}
                                  departureDate={depDate}
                                  arrivalDate={arrDate}
                                  pickupAddress={listing?.pickup_address}
                                  pickupCity={pickupCity}
                                  dropoffAddress={listing?.dropoff_address}
                                  dropoffCity={dropoffCity}
                                  weightKg={request.weight_kg}
                                  contentDesc={request.content_desc}
                                  totalAmount={request.total_amount}
                                  contactName={listing?.gp?.full_name || listing?.profiles?.full_name}
                                  contactPhone={listing?.gp?.phone || listing?.gp?.whatsapp || listing?.profiles?.phone}
                                  isDelayed={Boolean(request.is_delayed || listing?.is_delayed)}
                                  delayReason={request.delay_reason || listing?.delay_reason}
                                  isGpMode={false}
                                />
                              </div>
                            )}
                          </div>

                          {(request.status === "pending" ||
                            request.status === "en_attente") && (
                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={() => setEditingGp(request)}
                                className="flex-1 py-2.5 px-3 bg-amber-50 text-[#D4870A] hover:bg-amber-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Edit3 size={14} /> Modifier la réservation
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setCancelTarget({
                                    type: "gp",
                                    id: request.id,
                                    title: `votre réservation GP (${depCity} → ${arrCity})`,
                                  })
                                }
                                className="flex-1 py-2.5 px-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                              >
                                <XCircle size={14} /> Annuler
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {((serviceFilter === "tout" &&
              commandesEnvoyees.length === 0 &&
              ordersEnvoyees.length === 0 &&
              gpEnvoyees.length === 0) ||
              (serviceFilter === "traiteur" &&
                commandesEnvoyees.length === 0 &&
                ordersEnvoyees.length === 0) ||
              (serviceFilter === "gp" && gpEnvoyees.length === 0)) && (
              <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center max-w-md mx-auto my-8">
                <div className="w-16 h-16 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-4 text-[#1D6B45]">
                  <Package size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Vous n&apos;avez passé aucune commande
                </h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  {serviceFilter === "traiteur"
                    ? "Vous n'avez fait aucune demande de devis ni commande de plat."
                    : serviceFilter === "gp"
                      ? "Vous n'avez fait aucune réservation de transport GP."
                      : "Vos demandes de devis traiteur, commandes de plats et envois de colis GP apparaîtront ici."}
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 bg-[#1D6B45] text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-[#165637] transition-all shadow-md active:scale-95"
                >
                  Découvrir les services <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </>
        )}

        {/* ── ONGLET DEVIS & ANNONCES (RÉCEPTIONS) ── */}
        {tab === "receptions" && (
          <div className="space-y-6">
            {/* Bannière CTA pour publier une demande */}
            <div className="bg-gradient-to-r from-emerald-800 via-[#1D6B45] to-emerald-700 rounded-3xl p-5 sm:p-6 text-white shadow-md">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-xs font-semibold backdrop-blur-sm mb-2">
                <Sparkles size={13} className="text-amber-300" />
                <span>Trouvez le traiteur idéal pour votre événement</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Vous préparez un événement ?</h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed mt-1">
                Publiez votre recherche de traiteur (mariage, buffet, baptême, anniversaire...). Les traiteurs certifiés de votre secteur vous feront des propositions et devis sur-mesure !
              </p>
              <div className="mt-4 pt-3.5 border-t border-white/15 flex items-center justify-between flex-wrap gap-3">
                <span className="text-[11px] text-emerald-100/80 font-medium">
                  Direct, sans engagement & devis personnalisés
                </span>
                <Link
                  href="/traiteur/demande"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold text-xs shadow-md transition-all active:scale-95 whitespace-nowrap"
                >
                  <PlusCircle size={16} />
                  Publier une annonce
                </Link>
              </div>
            </div>

            {/* Liste des annonces publiées par l'utilisateur */}
            {myTraiteurRequests.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center max-w-md mx-auto my-8">
                <div className="w-16 h-16 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-4 text-[#1D6B45]">
                  <PartyPopper size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Aucune recherche de traiteur en cours
                </h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  Vous n&apos;avez pas encore publié de demande. Décrivez vos envies culinaires et laissez les traiteurs venir vers vous avec leurs devis !
                </p>
                <Link
                  href="/traiteur/demande"
                  className="inline-flex items-center justify-center gap-2 bg-[#1D6B45] text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-[#165637] transition-all shadow-md active:scale-95"
                >
                  <PlusCircle size={16} />
                  Publier ma première demande
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Mes annonces & devis reçus ({myTraiteurRequests.length})
                  </h2>
                  <span className="text-xs text-gray-500 font-medium">
                    {totalPendingProposals} offre(s) en attente
                  </span>
                </div>

                {myTraiteurRequests.map((req) => {
                  const proposals = req.proposals || [];
                  const isFulfilled = (req.status as string) === "fulfilled" || (req.status as string) === "pourvue";
                  const isCancelled = (req.status as string) === "cancelled" || (req.status as string) === "annulee";
                  const isOpen = !isFulfilled && !isCancelled;

                  return (
                    <div
                      key={req.id}
                      className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                      {/* En-tête de la demande */}
                      <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                {req.event_type}
                              </span>
                              {isOpen && (
                                <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  Annonce en ligne
                                </span>
                              )}
                              {isFulfilled && (
                                <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-medium">
                                  <CheckCircle2 size={13} className="text-blue-600" />
                                  Offre retenue
                                </span>
                              )}
                              {isCancelled && (
                                <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-0.5 rounded-full font-medium">
                                  <XCircle size={13} className="text-gray-400" />
                                  Annulée
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mt-2">
                              {req.title || `Recherche de traiteur pour ${req.event_type.toLowerCase()}`}
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Publiée le {formatDate(req.created_at)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {isOpen && (
                              <button
                                type="button"
                                onClick={() => setEditingTraiteurRequest(req)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D6B45] hover:text-[#165637] hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
                              >
                                <Edit3 size={13} />
                                Modifier
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setCancelTarget({
                                  type: "traiteur_request",
                                  id: req.id,
                                  title: req.title || `Recherche ${req.event_type}`,
                                })
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 transition-colors"
                            >
                              <Trash2 size={13} />
                              Supprimer
                            </button>
                          </div>
                        </div>

                        {/* Détails événement en liste verticale claire */}
                        <div className="mt-4 bg-white rounded-2xl p-4 border border-gray-100 space-y-2.5 text-xs text-gray-700">
                          <div className="flex items-baseline gap-2">
                            <Calendar size={14} className="text-[#1D6B45] shrink-0 translate-y-0.5" />
                            <span className="text-gray-500 font-medium shrink-0">Date :</span>
                            <span className="text-gray-900 font-semibold">{formatDate(req.event_date)}</span>
                          </div>

                          <div className="flex items-baseline gap-2">
                            <Users size={14} className="text-[#1D6B45] shrink-0 translate-y-0.5" />
                            <span className="text-gray-500 font-medium shrink-0">Invités :</span>
                            <span className="text-gray-900 font-semibold">
                              {req.guest_count ? `${req.guest_count} pers.` : "Non précisé"}
                            </span>
                          </div>

                          <div className="flex items-baseline gap-2">
                            <MapPin size={14} className="text-[#1D6B45] shrink-0 translate-y-0.5" />
                            <span className="text-gray-500 font-medium shrink-0">Lieu :</span>
                            <span className="text-gray-900 font-semibold">{req.location}</span>
                          </div>

                          {req.budget && Number(req.budget) > 0 && (
                            <div className="flex items-baseline gap-2">
                              <Banknote size={14} className="text-[#1D6B45] shrink-0 translate-y-0.5" />
                              <span className="text-gray-500 font-medium shrink-0">Budget estimé :</span>
                              <span className="text-[#1D6B45] font-bold">
                                {Number(req.budget).toLocaleString("fr-FR")} €
                              </span>
                            </div>
                          )}

                          <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-start gap-2">
                              <ChefHat size={14} className="text-[#1D6B45] shrink-0 mt-0.5" />
                              <div>
                                <span className="text-gray-500 font-medium mr-1.5">Plats & envies :</span>
                                <span className="text-gray-900 font-medium leading-relaxed whitespace-pre-line">
                                  {req.food_preferences}
                                </span>
                              </div>
                            </div>
                          </div>

                          {req.description && (
                            <div className="flex items-start gap-2 text-gray-500 pt-1">
                              <StickyNote size={14} className="text-gray-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-gray-500 font-medium mr-1.5">Précisions :</span>
                                <span className="text-gray-700 italic leading-relaxed">{req.description}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section Propositions des traiteurs */}
                      <div className="p-5 sm:p-6 bg-white">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <MessageSquare size={16} className="text-[#1D6B45]" />
                            Propositions reçues ({proposals.length})
                          </h4>
                          {proposals.length > 0 && (
                            <span className="text-xs text-emerald-600 font-medium">
                              {proposals.filter((p) => p.status === "accepted").length > 0
                                ? "Offre acceptée"
                                : "Sélectionnez votre traiteur"}
                            </span>
                          )}
                        </div>

                        {proposals.length === 0 ? (
                          <div className="text-center py-8 px-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200">
                            <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-600">
                              <Clock size={20} />
                            </div>
                            <p className="text-xs font-semibold text-gray-700">
                              En attente de propositions
                            </p>
                            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
                              Votre annonce est en ligne. Les traiteurs de votre secteur la consultent et vous enverront bientôt leurs devis et propositions personnalisées.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {(() => {
                              const pendingPrices = proposals
                                .filter((p) => p.status === "pending")
                                .map((p) => Number(p.proposed_price || 0));
                              const bestPrice =
                                pendingPrices.length > 1 ? Math.min(...pendingPrices) : null;
                              return proposals.map((prop) => (
                                <ProposalCard
                                  key={prop.id}
                                  proposal={prop}
                                  eventType={req.event_type}
                                  budget={req.budget}
                                  requestOpen={isOpen}
                                  isBestPrice={
                                    bestPrice !== null &&
                                    prop.status === "pending" &&
                                    Number(prop.proposed_price || 0) === bestPrice
                                  }
                                  loading={proposalActionLoading === prop.id}
                                  formatDate={formatDate}
                                  onAccept={() =>
                                    setProposalConfirm({ proposal: prop, action: "accept", eventType: req.event_type })
                                  }
                                  onReject={() =>
                                    setProposalConfirm({ proposal: prop, action: "reject", eventType: req.event_type })
                                  }
                                />
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ONGLET REÇUES ── */}
        {tab === "recues" && (
          <>
            {/* Commandes traiteur reçues */}
            {isTraiteur &&
              (serviceFilter === "tout" || serviceFilter === "traiteur") &&
              commandesRecues.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    <ChefHat size={18} className="inline mr-1" /> Commandes
                    traiteur reçues
                  </h2>
                  <div className="space-y-3">
                    {commandesRecues.map((commande) => {
                      const clientInfo = commande.client || commande.profiles;
                      return (
                        <div
                          key={commande.id}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-800">
                                <User
                                  size={16}
                                  className="inline mr-1 text-[#1D6B45]"
                                />{" "}
                                {clientInfo?.full_name || "Client"}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {formatDate(commande.created_at)}
                              </p>
                            </div>
                            {getStatutBadge(commande.statut)}
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>{formatDate(commande.date_evenement)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>{commande.nb_personnes} personnes</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>{commande.adresse}</span>
                            </div>
                            {commande.type_evenement && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <PartyPopper
                                  size={16}
                                  className="text-[#1D6B45] inline mr-1"
                                />
                                <span>{commande.type_evenement}</span>
                              </div>
                            )}
                            {commande.notes && (
                              <div className="flex items-start gap-2 text-sm text-gray-600">
                                <StickyNote
                                  size={16}
                                  className="text-[#1D6B45] inline mr-1"
                                />
                                <span>{commande.notes}</span>
                              </div>
                            )}
                          </div>
                          {commande.statut === "refusee" &&
                            commande.message_traiteur && (
                              <div className="bg-red-50 rounded-xl p-3 mb-3">
                                <p className="text-xs text-red-600 font-medium mb-1">
                                  Motif du refus :
                                </p>
                                <p className="text-sm text-red-700">
                                  {commande.message_traiteur}
                                </p>
                              </div>
                            )}
                          {commande.statut === "en_attente" && (
                            <div className="space-y-3">
                              <textarea
                                rows={2}
                                placeholder="Message au client (optionnel)..."
                                value={messageRefus[commande.id] || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMessageRefus((prev) => ({
                                    ...prev,
                                    [commande.id]: val,
                                  }));
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D6B45]"
                              />
                              <div className="flex gap-3">
                                <button
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "accepter_traiteur",
                                      item: commande,
                                    })
                                  }
                                  className="flex-1 bg-[#1D6B45] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0F4A30] transition-colors"
                                >
                                  <CheckCircle2
                                    size={16}
                                    className="inline mr-2"
                                  />{" "}
                                  Accepter
                                </button>
                                <button
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "refuser_traiteur",
                                      item: commande,
                                    })
                                  }
                                  className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
                                >
                                  <XCircle size={16} className="inline mr-2" />{" "}
                                  Refuser
                                </button>
                              </div>
                            </div>
                          )}
                          {commande.statut === "acceptee" &&
                            clientInfo?.phone && (
                              <button
                                onClick={() => {
                                  const url = formatWhatsAppUrl(
                                    clientInfo.phone,
                                    `Bonjour, j'ai accepté votre commande du ${commande.date_evenement}. Parlons des détails !`
                                  );
                                  if (url) window.open(url, "_blank");
                                }}
                                className="w-full bg-[#25D366] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1da851] transition-colors flex items-center justify-center gap-2"
                              >
                                <MessageSquare
                                  size={16}
                                  className="inline mr-2"
                                />{" "}
                                Contacter le client sur WhatsApp
                              </button>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Orders plats reçues */}
            {isTraiteur &&
              (serviceFilter === "tout" || serviceFilter === "traiteur") &&
              ordersRecues.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    <ShoppingCart size={18} className="inline mr-1" /> Commandes
                    plats reçues
                  </h2>
                  <div className="space-y-3">
                    {ordersRecues.map((order) => {
                      const clientInfo = order.client || order.profiles;
                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-800">
                                <User
                                  size={16}
                                  className="inline mr-1 text-[#1D6B45]"
                                />{" "}
                                {clientInfo?.full_name || "Client"}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {formatDate(order.created_at)}
                              </p>
                            </div>
                            {getStatutBadge(order.status)}
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-4">
                            {order.order_items?.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-sm text-gray-600"
                              >
                                <ChefHat
                                  size={16}
                                  className="text-[#1D6B45] inline mr-1"
                                />{" "}
                                <span className="text-gray-600">
                                  {item.dishes?.name} x{item.quantity}
                                </span>
                                <span className="font-medium">
                                  {item.dishes?.price
                                    ? (
                                        item.dishes.price * item.quantity
                                      ).toFixed(2)
                                    : "0.00"}{" "}
                                  €
                                </span>
                              </div>
                            ))}
                            <div className="border-t border-gray-200 pt-2 mt-1 flex justify-between font-bold text-black text-sm">
                              <span>Total</span>
                              <span className="text-[#1D6B45]">
                                {Number(order.total_amount).toFixed(2)} €
                              </span>
                            </div>
                            {order.delivery_address && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 pt-1">
                                <MapPin
                                  size={16}
                                  className="text-[#1D6B45] inline mr-1"
                                />
                                <span>{order.delivery_address}</span>
                              </div>
                            )}
                          </div>
                          {order.status === "pending" && (
                            <div className="flex gap-3">
                              <button
                                onClick={() =>
                                  setConfirmAction({
                                    type: "accepter_order",
                                    item: order,
                                  })
                                }
                                className="flex-1 bg-[#1D6B45] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0F4A30] transition-colors"
                              >
                                <CheckCircle2
                                  size={16}
                                  className="inline mr-2"
                                />{" "}
                                Accepter
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmAction({
                                    type: "refuser_order",
                                    item: order,
                                  })
                                }
                                className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
                              >
                                <XCircle size={16} className="inline mr-2" />{" "}
                                Refuser
                              </button>
                            </div>
                          )}
                          {order.status === "accepted" && clientInfo?.phone && (
                            <button
                              onClick={() => {
                                const url = formatWhatsAppUrl(
                                  clientInfo.phone,
                                  `Bonjour, j'ai accepté votre commande de plats sur Dabari !`
                                );
                                if (url) window.open(url, "_blank");
                              }}
                              className="w-full bg-[#25D366] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1da851] transition-colors flex items-center justify-center gap-2"
                            >
                              <MessageSquare
                                size={16}
                                className="inline mr-2"
                              />{" "}
                              Contacter le client sur WhatsApp
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Demandes GP reçues */}
            {isGp &&
              (serviceFilter === "tout" || serviceFilter === "gp") &&
              gpRecues.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    <Plane size={18} className="inline mr-1" /> Demandes GP
                    reçues
                  </h2>
                  <div className="space-y-3">
                    {gpRecues.map((request) => {
                      const senderInfo = request.sender || request.profiles;
                      const listing = request.listing || request.gp_listings;
                      const depCity =
                        request.departure_city || listing?.departure_city;
                      const depCountry =
                        request.departure_country || listing?.departure_country;
                      const arrCity =
                        request.arrival_city || listing?.arrival_city;
                      const arrCountry =
                        request.arrival_country || listing?.arrival_country;
                      const depDate =
                        request.departure_date || listing?.departure_date;
                      const arrDate =
                        request.arrival_date || listing?.arrival_date;
                      const pickupCity = listing?.pickup_city;
                      const dropoffCity = listing?.dropoff_city;

                      const isListingDeleted =
                        !listing || listing.is_active === false;

                      return (
                        <div
                          key={request.id}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-800">
                                <User
                                  size={16}
                                  className="inline mr-1 text-[#1D6B45]"
                                />{" "}
                                {senderInfo?.full_name || "Expéditeur"}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {formatDate(request.created_at)}
                              </p>
                            </div>
                            {getStatutBadge(request.status)}
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                              <Plane
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>
                                {depCity && arrCity
                                  ? `${depCity} (${depCountry || ""}) → ${arrCity} (${arrCountry || ""})`
                                  : "Annonce retirée"}
                              </span>
                              {isListingDeleted && (
                                <span className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-medium border border-red-100">
                                  Annonce supprimée
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                              <Calendar
                                size={16}
                                className="text-[#1D6B45] inline mr-1 shrink-0"
                              />
                              <span>
                                <strong>Départ :</strong> {depDate ? formatDate(depDate) : "N/A"}
                                {pickupCity && ` (Dépôt : ${pickupCity})`}
                              </span>
                            </div>
                            {arrDate && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
                                <Calendar
                                  size={16}
                                  className="text-[#D4870A] inline mr-1 shrink-0"
                                />
                                <span>
                                  <strong>Arrivée :</strong> {formatDate(arrDate)}
                                  {dropoffCity && ` (Récupération : ${dropoffCity})`}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Scale
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>{request.weight_kg} kg</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Package
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>{request.content_desc}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Banknote
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>{request.total_amount} €</span>
                            </div>
                            {request.notes && (
                              <div className="flex items-start gap-2 text-sm text-gray-600">
                                <StickyNote
                                  size={16}
                                  className="text-[#1D6B45] inline mr-1"
                                />
                                <span>{request.notes}</span>
                              </div>
                            )}
                          </div>
                          {request.status === "pending" && (
                            <div className="space-y-3">
                              <textarea
                                rows={2}
                                placeholder="Message à l'expéditeur (optionnel)..."
                                value={messageRefus[request.id] || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMessageRefus((prev) => ({
                                    ...prev,
                                    [request.id]: val,
                                  }));
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1D6B45]"
                              />
                              <div className="flex gap-3">
                                <button
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "accepter_gp",
                                      item: request,
                                    })
                                  }
                                  className="flex-1 bg-[#1D6B45] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0F4A30] transition-colors"
                                >
                                  <CheckCircle2
                                    size={16}
                                    className="inline mr-2"
                                  />{" "}
                                  Accepter
                                </button>
                                <button
                                  onClick={() =>
                                    setConfirmAction({
                                      type: "refuser_gp",
                                      item: request,
                                    })
                                  }
                                  className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
                                >
                                  <XCircle size={16} className="inline mr-2" />{" "}
                                  Refuser
                                </button>
                              </div>
                            </div>
                          )}
                          {/* Suivi & Contrôles GP (Espace Pro) */}
                          {request.status !== "pending" &&
                            request.status !== "refused" &&
                            request.status !== "rejected" &&
                            request.status !== "cancelled" &&
                            request.status !== "annulee" && (
                              <div className="pt-2">
                                <GpTrackingTimeline
                                  status={request.status}
                                  departureCity={depCity}
                                  departureCountry={depCountry}
                                  arrivalCity={arrCity}
                                  arrivalCountry={arrCountry}
                                  departureDate={depDate}
                                  arrivalDate={arrDate}
                                  pickupAddress={listing?.pickup_address}
                                  pickupCity={pickupCity}
                                  dropoffAddress={listing?.dropoff_address}
                                  dropoffCity={dropoffCity}
                                  weightKg={request.weight_kg}
                                  contentDesc={request.content_desc}
                                  totalAmount={request.total_amount}
                                  contactName={senderInfo?.full_name}
                                  contactPhone={senderInfo?.phone}
                                  isDelayed={Boolean(request.is_delayed || listing?.is_delayed)}
                                  delayReason={request.delay_reason || listing?.delay_reason}
                                  isGpMode={true}
                                  updatingStatus={updatingGpStatusId === request.id}
                                  onUpdateStatus={(newStatus) => {
                                    setGpStatusConfirm({
                                      request,
                                      newStatus,
                                      statusLabel: getGpStatusLabel(newStatus),
                                    });
                                  }}
                                  onSignalDelay={() => setDelayTargetGp(request)}
                                />
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {(isTraiteur || isGp) &&
              ((serviceFilter === "tout" &&
                commandesRecues.length === 0 &&
                ordersRecues.length === 0 &&
                gpRecues.length === 0) ||
                (serviceFilter === "traiteur" &&
                  commandesRecues.length === 0 &&
                  ordersRecues.length === 0) ||
                (serviceFilter === "gp" && gpRecues.length === 0)) && (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">📥</div>
                  <p className="text-gray-500">
                    Aucune demande reçue pour le moment
                  </p>
                </div>
              )}

            {!isTraiteur && !isGp && (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">📥</div>
                <p className="text-gray-500">
                  {"Vous n'êtes pas encore prestataire"}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pop-up (Modale) de confirmation */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-auto shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {confirmAction.type.startsWith("accepter")
                ? "Confirmer l'acceptation"
                : "Confirmer le refus"}
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              Es-tu sûr(e) de vouloir{" "}
              {confirmAction.type.startsWith("accepter")
                ? "accepter"
                : "refuser"}{" "}
              cette demande ?
              {confirmAction.type.startsWith("refuser") &&
                " Cette action est irréversible et un message sera envoyé au client."}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  switch (confirmAction.type) {
                    case "accepter_traiteur":
                      handleAccepterTraiteur(confirmAction.item);
                      break;
                    case "refuser_traiteur":
                      handleRefuserTraiteur(confirmAction.item);
                      break;
                    case "accepter_order":
                      handleAccepterOrder(confirmAction.item);
                      break;
                    case "refuser_order":
                      handleRefuserOrder(confirmAction.item);
                      break;
                    case "accepter_gp":
                      handleAccepterGp(confirmAction.item);
                      break;
                    case "refuser_gp":
                      handleRefuserGp(confirmAction.item);
                      break;
                  }
                  setConfirmAction(null);
                }}
                className={`flex-1 py-3 rounded-xl text-white font-medium text-sm transition-colors flex items-center justify-center ${
                  confirmAction.type.startsWith("accepter")
                    ? "bg-[#1D6B45] hover:bg-[#0F4A30]"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Oui,{" "}
                {confirmAction.type.startsWith("accepter")
                  ? "accepter"
                  : "refuser"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de modification Devis */}
      <EditDevisModal
        isOpen={Boolean(editingDevis)}
        onClose={() => setEditingDevis(null)}
        onSuccess={() => loadAll()}
        commande={editingDevis}
      />

      {/* Modale de modification Commande Plats */}
      <EditPlatModal
        isOpen={Boolean(editingOrder)}
        onClose={() => setEditingOrder(null)}
        onSuccess={() => loadAll()}
        order={editingOrder}
      />

      {/* Modale de modification GP */}
      <EditGpModal
        isOpen={Boolean(editingGp)}
        onClose={() => setEditingGp(null)}
        onSuccess={() => loadAll()}
        request={editingGp}
      />

      {/* Modale de modification Annonce Traiteur */}
      <EditTraiteurRequestModal
        isOpen={Boolean(editingTraiteurRequest)}
        onClose={() => setEditingTraiteurRequest(null)}
        onSuccess={() => loadAll()}
        request={editingTraiteurRequest}
      />

      {/* Confirmation acceptation / refus d'une proposition */}
      <ConfirmDialog
        isOpen={Boolean(proposalConfirm)}
        variant={proposalConfirm?.action === "reject" ? "danger" : "primary"}
        icon={proposalConfirm?.action === "reject" ? "warning" : "check"}
        title={
          proposalConfirm?.action === "reject"
            ? "Décliner cette offre ?"
            : "Accepter cette offre ?"
        }
        description={
          proposalConfirm ? (
            proposalConfirm.action === "reject" ? (
              <>
                Vous allez décliner le devis de{" "}
                <span className="font-semibold text-gray-800">
                  {proposalConfirm.proposal.traiteur?.name || "ce traiteur"}
                </span>{" "}
                ({Number(proposalConfirm.proposal.proposed_price || 0).toLocaleString("fr-FR")} €). Le traiteur ne pourra plus vous recontacter pour cette annonce.
              </>
            ) : (
              <>
                Vous allez retenir le devis de{" "}
                <span className="font-semibold text-gray-800">
                  {proposalConfirm.proposal.traiteur?.name || "ce traiteur"}
                </span>{" "}
                à{" "}
                <span className="font-semibold text-[#1D6B45]">
                  {Number(proposalConfirm.proposal.proposed_price || 0).toLocaleString("fr-FR")} €
                </span>{" "}
                pour votre événement ({proposalConfirm.eventType}). L&apos;annonce sera clôturée et le traiteur sera prévenu.
              </>
            )
          ) : null
        }
        confirmLabel={
          proposalConfirm?.action === "reject" ? "Oui, décliner" : "Oui, accepter"
        }
        loadingLabel="Validation..."
        loading={Boolean(proposalActionLoading)}
        onConfirm={confirmProposalAction}
        onClose={() => setProposalConfirm(null)}
      />

      {/* Modale de confirmation de mise à jour du statut GP */}
      <ConfirmDialog
        isOpen={Boolean(gpStatusConfirm)}
        title="Mettre à jour le suivi du colis"
        description={
          gpStatusConfirm ? (
            <>
              Voulez-vous passer ce transport de colis à l&apos;étape{" "}
              <strong className="text-[#1D6B45]">« {gpStatusConfirm.statusLabel} »</strong> ?
              L&apos;expéditeur sera automatiquement notifié de l&apos;avancement de son colis.
            </>
          ) : null
        }
        confirmLabel="Confirmer l'étape"
        loadingLabel="Mise à jour..."
        loading={Boolean(updatingGpStatusId)}
        variant="primary"
        icon="send"
        onConfirm={handleConfirmUpdateGpStatus}
        onClose={() => setGpStatusConfirm(null)}
      />

      {/* Modale de signalement de retard GP */}
      <SignalGpDelayModal
        isOpen={Boolean(delayTargetGp)}
        target={
          delayTargetGp
            ? {
                id: delayTargetGp.id,
                currentArrivalDate:
                  delayTargetGp.arrival_date ||
                  delayTargetGp.listing?.arrival_date ||
                  null,
                departureDate:
                  delayTargetGp.departure_date ||
                  delayTargetGp.listing?.departure_date ||
                  null,
                routeLabel: `${delayTargetGp.departure_city || delayTargetGp.listing?.departure_city || ""} → ${delayTargetGp.arrival_city || delayTargetGp.listing?.arrival_city || ""}`,
                delayReason:
                  delayTargetGp.delay_reason ||
                  delayTargetGp.listing?.delay_reason ||
                  "",
              }
            : null
        }
        onClose={() => setDelayTargetGp(null)}
        onSuccess={() => loadAll()}
      />

      {/* Modale de confirmation d'annulation / suppression */}
      <CancelConfirmModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onSuccess={() => loadAll()}
        target={cancelTarget}
      />
    </div>
  );
}
