"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import cookies from "js-cookie";
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
  Link,
  ArrowRight,
} from "lucide-react";

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
  created_at: string;
  listing?: {
    departure_city: string;
    arrival_city: string;
    departure_country: string;
    arrival_country: string;
    departure_date: string;
    gp_id: string;
    is_active?: boolean | null;
  } | null;
  gp_listings?: {
    departure_city: string;
    arrival_city: string;
    departure_country: string;
    arrival_country: string;
    departure_date: string;
    gp_id: string;
    is_active?: boolean | null;
  } | null;
  sender?: { full_name: string; phone: string | null } | null;
  profiles?: { full_name: string; phone: string | null } | null;
};

type Tab = "envoyees" | "recues";

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

  // Reçues
  const [commandesRecues, setCommandesRecues] = useState<CommandeTraiteur[]>(
    [],
  );
  const [ordersRecues, setOrdersRecues] = useState<OrderPlat[]>([]);
  const [gpRecues, setGpRecues] = useState<GpRequest[]>([]);

  useEffect(() => {
    const load = async () => {
      const token = cookies.get("token");
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
    const token = cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch((err) => console.error("Erreur mark-all-as-read:", err));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
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
      // ── 2. Statut & Commandes reçues (Traiteur) ──
      const traiteurData = profile.traiteurs?.[0];
      if (profile.role === "traiteur" || traiteurData) {
        setIsTraiteur(true);
        setCommandesRecues(
          sortOrdersByPendingFirst(traiteurData?.commandes || []),
        );
        setOrdersRecues(sortOrdersByPendingFirst(traiteurData?.orders || []));
      }
      // ── 3. Statut & Demandes reçues (GP Voyageur) ──
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

  async function handleAccepterTraiteur(commande: CommandeTraiteur) {
    const token = cookies.get("token");

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/commande/traiteur/${commande.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statut: "acceptee" }),
      },
    );

    setCommandesRecues((prev) =>
      sortOrdersByPendingFirst(
        prev.map((c) =>
          c.id === commande.id ? { ...c, statut: "acceptee" } : c,
        ),
      ),
    );
    window.dispatchEvent(new Event("dabari_orders_updated"));
  }

  async function handleRefuserTraiteur(commande: CommandeTraiteur) {
    const message = messageRefus[commande.id] || "";
    const token = cookies.get("token");

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/commande/traiteur/${commande.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statut: "refusee", message_traiteur: message }),
      },
    );

    setCommandesRecues((prev) =>
      sortOrdersByPendingFirst(
        prev.map((c) =>
          c.id === commande.id
            ? { ...c, statut: "refusee", message_traiteur: message }
            : c,
        ),
      ),
    );
    window.dispatchEvent(new Event("dabari_orders_updated"));
  }

  async function handleAccepterOrder(order: OrderPlat) {
    const token = cookies.get("token");

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/commande/order/${order.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "accepted" }),
      },
    );

    setOrdersRecues((prev) =>
      sortOrdersByPendingFirst(
        prev.map((o) => (o.id === order.id ? { ...o, status: "accepted" } : o)),
      ),
    );
    window.dispatchEvent(new Event("dabari_orders_updated"));
  }

  async function handleRefuserOrder(order: OrderPlat) {
    const token = cookies.get("token");

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/commande/order/${order.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "rejected" }),
      },
    );

    setOrdersRecues((prev) =>
      sortOrdersByPendingFirst(
        prev.map((o) => (o.id === order.id ? { ...o, status: "rejected" } : o)),
      ),
    );
    window.dispatchEvent(new Event("dabari_orders_updated"));
  }

  async function handleAccepterGp(request: GpRequest) {
    const token = cookies.get("token");

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/commande/gp/${request.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "accepted" }),
      },
    );

    setGpRecues((prev) =>
      sortOrdersByPendingFirst(
        prev.map((r) =>
          r.id === request.id ? { ...r, status: "accepted" } : r,
        ),
      ),
    );
    window.dispatchEvent(new Event("dabari_orders_updated"));
  }

  async function handleRefuserGp(request: GpRequest) {
    const message = messageRefus[request.id] || "";
    const token = cookies.get("token");

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/commande/gp/${request.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "rejected", message }),
      },
    );

    setGpRecues((prev) =>
      sortOrdersByPendingFirst(
        prev.map((r) =>
          r.id === request.id ? { ...r, status: "rejected" } : r,
        ),
      ),
    );
    window.dispatchEvent(new Event("dabari_orders_updated"));
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
      case "refusee":
      case "rejected":
        return (
          <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium flex items-center w-fit gap-1">
            <XCircle size={14} /> Refusée
          </span>
        );
      default:
        return null;
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
        <h1 className="text-2xl font-bold text-white">
          <Package size={24} className="inline mr-2" /> Commandes
        </h1>

        {/* Onglets */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setTab("envoyees")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === "envoyees"
                ? "bg-white text-[#1D6B45]"
                : "bg-white/20 text-white"
            }`}
          >
            <ShoppingCart size={18} className="inline mr-2" /> Mes envois
          </button>
          {(isTraiteur || isGp) && (
            <button
              onClick={() => setTab("recues")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                tab === "recues"
                  ? "bg-white text-[#1D6B45]"
                  : "bg-white/20 text-white"
              }`}
            >
              <Inbox size={18} className="inline mr-2" /> Reçues
              {pendingRecues > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                  {pendingRecues}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Sous-filtres Traiteur / GP */}
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
                                  const num = traiteurInfo
                                    .whatsapp!.replace(/\+/g, "")
                                    .replace(/\s/g, "");
                                  const msg = encodeURIComponent(
                                    `Bonjour, je vous contacte suite à ma commande du ${commande.date_evenement} sur Dabari.`,
                                  );
                                  window.open(
                                    `https://wa.me/${num}?text=${msg}`,
                                    "_blank",
                                  );
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
                                  const num = traiteurInfo
                                    .whatsapp!.replace(/\+/g, "")
                                    .replace(/\s/g, "");
                                  const msg = encodeURIComponent(
                                    `Bonjour, je vous contacte suite à ma commande de plats sur Dabari.`,
                                  );
                                  window.open(
                                    `https://wa.me/${num}?text=${msg}`,
                                    "_blank",
                                  );
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
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>
                                Départ : {depDate ? formatDate(depDate) : "N/A"}
                              </span>
                            </div>
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
                                  const num = clientInfo
                                    .phone!.replace(/\+/g, "")
                                    .replace(/\s/g, "");
                                  const msg = encodeURIComponent(
                                    `Bonjour, j'ai accepté votre commande du ${commande.date_evenement}. Parlons des détails !`,
                                  );
                                  window.open(
                                    `https://wa.me/${num}?text=${msg}`,
                                    "_blank",
                                  );
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
                                const num = clientInfo
                                  .phone!.replace(/\+/g, "")
                                  .replace(/\s/g, "");
                                const msg = encodeURIComponent(
                                  `Bonjour, j'ai accepté votre commande de plats sur Dabari !`,
                                );
                                window.open(
                                  `https://wa.me/${num}?text=${msg}`,
                                  "_blank",
                                );
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
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar
                                size={16}
                                className="text-[#1D6B45] inline mr-1"
                              />
                              <span>
                                {depDate ? formatDate(depDate) : "N/A"}
                              </span>
                            </div>
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
                          {request.status === "accepted" &&
                            senderInfo?.phone && (
                              <button
                                onClick={() => {
                                  const num = senderInfo
                                    .phone!.replace(/\+/g, "")
                                    .replace(/\s/g, "");
                                  const msg = encodeURIComponent(
                                    `Bonjour, j'ai accepté votre demande de colis. Parlons des détails !`,
                                  );
                                  window.open(
                                    `https://wa.me/${num}?text=${msg}`,
                                    "_blank",
                                  );
                                }}
                                className="w-full bg-[#25D366] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1da851] transition-colors flex items-center justify-center gap-2"
                              >
                                <MessageSquare
                                  size={16}
                                  className="inline mr-2"
                                />{" "}
                                Contacter l'expéditeur sur WhatsApp
                              </button>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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
    </div>
  );
}
