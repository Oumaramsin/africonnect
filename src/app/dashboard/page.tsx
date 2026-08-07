import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Bell,
  ChefHat,
  Plane,
  ShoppingCart,
  Scissors,
  Hand,
  User,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Headphones,
  HeartHandshake,
} from "lucide-react";
import { cookies } from "next/headers";

type CommandeTraiteur = {
  id: string;
  statut: string;
  created_at: string;
  nb_personnes: number;
  traiteur?: { name: string } | null;
  traiteurs?: { name: string } | null;
};

type OrderPlat = {
  id: string;
  status: string;
  created_at: string;
  total_amount: number;
  traiteur?: { name: string } | null;
  traiteurs?: { name: string } | null;
  order_items?: {
    id: string;
    quantity: number;
    dishes?: { name: string } | null;
  }[];
};

type GpRequest = {
  id: string;
  status: string;
  created_at: string;
  weight_kg: number;
  departure_city?: string | null;
  arrival_city?: string | null;
  listing?: {
    departure_city: string;
    arrival_city: string;
    is_active?: boolean | null;
  } | null;
  gp_listings?: {
    departure_city: string;
    arrival_city: string;
    is_active?: boolean | null;
  } | null;
};

export default async function DashboardPage() {
  let full_name = null;
  let commandesTraiteur: any[] = [];
  let ordersPlats: any[] = [];
  let gpRequests: any[] = [];
  let pendingCount = 0;
  let unreadNotifications: any[] = [];
  let unreadCount = 0;

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const isLoggedIn = !!token;

  if (isLoggedIn) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande`,
        {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );
      const data = await response.json();
      const userProfile = data.data?.orders;
      if (userProfile) {
        full_name = userProfile.full_name;
        gpRequests = userProfile.gp_requests || [];
        ordersPlats = userProfile.orders || [];
        commandesTraiteur = userProfile.commandes || [];

        // Compter les commandes/demandes reçues en attente de traitement (Traiteur & GP)
        const traiteurOrdersPending =
          userProfile.traiteurs
            ?.flatMap((t: any) => t.orders || [])
            .filter(
              (o: any) => o.status === "pending" || o.status === "en_attente",
            )?.length || 0;
        const traiteurCommandesPending =
          userProfile.traiteurs
            ?.flatMap((t: any) => t.commandes || [])
            .filter(
              (c: any) => c.statut === "en_attente" || c.statut === "pending",
            )?.length || 0;
        const gpRequestsPending =
          userProfile.gp_listings
            ?.flatMap((g: any) => g.requests || [])
            .filter(
              (r: any) => r.status === "pending" || r.status === "en_attente",
            )?.length || 0;

        pendingCount =
          traiteurOrdersPending + traiteurCommandesPending + gpRequestsPending;
      }

      // Fetch notifications
      const notifRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        unreadNotifications =
          notifData.notifications?.filter((n: any) => !n.is_read) || [];
        unreadCount = notifData.unread_count || 0;
      }
    } catch (error) {
      console.error("Erreur dans le fetch du dashboard :", error);
    }
  }

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "en_attente":
      case "pending":
        return (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-0.5 rounded-full flex items-center w-fit gap-1 font-medium">
            <Clock size={12} /> En attente
          </span>
        );
      case "acceptee":
      case "accepted":
        return (
          <span className="text-xs bg-[#E8F5E9] text-[#1D6B45] px-2.5 py-0.5 rounded-full flex items-center w-fit gap-1 font-medium">
            <CheckCircle2 size={12} /> Acceptée
          </span>
        );
      case "refusee":
      case "rejected":
        return (
          <span className="text-xs bg-red-50 text-red-500 px-2.5 py-0.5 rounded-full flex items-center w-fit gap-1 font-medium">
            <XCircle size={12} /> Refusée
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });

  const hasCommandes =
    (commandesTraiteur?.length || 0) > 0 ||
    (ordersPlats?.length || 0) > 0 ||
    (gpRequests?.length || 0) > 0;

  return (
    <div className="min-h-screen bg-[#F3F4F6] relative overflow-hidden">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-28 space-y-6">
        {/* En-tête Top Hero Banner Intégré en Haut */}
        {isLoggedIn ? (
          <div className="-mx-4 -mt-8 pt-8 pb-7 px-6 bg-gradient-to-br from-[#1D6B45] via-[#165637] to-[#0F4A30] rounded-b-[32px] text-white shadow-lg relative overflow-hidden mb-6">
            {/* Glow Or en arrière-plan */}
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-36 h-36 bg-[#D4870A]/25 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-white/95 text-[11px] font-bold px-3 py-1 rounded-full mb-2.5 border border-white/20">
                  <Sparkles size={12} className="text-[#D4870A]" /> Bienvenue
                  sur Dabari
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Bonjour, {full_name}{" "}
                  <Hand className="text-[#D4870A] animate-pulse" size={24} />
                </h1>
                <p className="text-white/80 text-xs mt-1 font-medium leading-relaxed">
                  Que souhaitez-vous commander ou envoyer aujourd&apos;hui ?
                </p>
              </div>

              <Link
                href="/profil"
                className="relative group flex-shrink-0 ml-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/15 border-2 border-white/30 backdrop-blur-md flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
                  {full_name?.charAt(0).toUpperCase() || "?"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#D4870A] border-2 border-white rounded-full"></span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="-mx-4 -mt-8 pt-8 pb-7 px-6 bg-gradient-to-br from-[#1D6B45] via-[#165637] to-[#0F4A30] rounded-b-[32px] text-white shadow-lg relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-36 h-36 bg-[#D4870A]/25 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-white/95 text-[11px] font-bold px-3 py-1 rounded-full mb-2.5 border border-white/20">
                  <Sparkles size={12} className="text-[#D4870A]" /> Bienvenue
                  sur Dabari
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Bonjour <Hand className="text-[#D4870A]" size={24} />
                </h1>
                <p className="text-white/80 text-xs mt-1 font-medium">
                  Connectez-vous pour profiter de tous vos services.
                </p>
              </div>

              <Link
                href="/login"
                className="bg-[#D4870A] text-white font-bold text-xs px-4 py-2.5 rounded-2xl hover:bg-[#b37005] transition-colors shadow-md flex-shrink-0 ml-4"
              >
                Connexion
              </Link>
            </div>
          </div>
        )}

        {/* Bannière d'Alerte de Notification */}
        {(unreadCount > 0 || pendingCount > 0) && (
          <Link href="/commandes" className="block my-3">
            <div className="bg-[#E8F5E9] border border-[#1D6B45]/30 rounded-2xl p-4.5 flex items-center justify-between hover:bg-[#E8F5E9]/80 transition-all shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-[#1D6B45] text-white flex items-center justify-center">
                    <Bell size={20} />
                  </div>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center border-2 border-white">
                    {Math.max(unreadCount, pendingCount)}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm flex items-center gap-1">
                    <Sparkles className="text-[#D4870A]" size={15} />
                    {pendingCount > 0
                      ? `Vous avez ${pendingCount} nouvelle${pendingCount > 1 ? "s" : ""} commande${pendingCount > 1 ? "s" : ""} reçue${pendingCount > 1 ? "s" : ""} !`
                      : unreadCount === 1
                        ? "Vous avez 1 nouvelle notification !"
                        : `Vous avez ${unreadCount} nouvelles notifications !`}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {pendingCount > 0
                      ? "Cliquez pour consulter et valider vos commandes."
                      : unreadNotifications[0]?.message ||
                        "Cliquez pour consulter vos commandes."}
                  </p>
                </div>
              </div>
              <span className="text-xs bg-[#1D6B45] text-[#FFFFFF] font-bold px-3.5 py-1.5 rounded-xl hover:bg-[#154d31] transition-colors">
                Voir
              </span>
            </div>
          </Link>
        )}

        {/* Mini Descriptif Dabari (MAX 3 Lignes) */}
        <div className="bg-white rounded-2xl p-3 border border-emerald-100/90 shadow-xs flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#1D6B45]/10 text-[#1D6B45] flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={14} className="text-[#1D6B45]" />
          </div>
          <div className="text-[12px] text-gray-600 leading-relaxed">
            <strong className="text-gray-900 font-bold">Dabari</strong> est une plateforme de mise en relation. Elle vous permet de commander des <strong className="text-[#1D6B45]">plats faits maison &amp; devis traiteur</strong>, et d&apos;envoyer vos <strong className="text-[#D4870A]">colis (GP) </strong>en toute sécurité entre l&apos;Europe et l&apos;Afrique.
          </div>
        </div>

        {/* Grille 2x2 de Services (Identique à la page Services) */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-base">
              Services disponibles
            </h2>
            <Link
              href="/services"
              className="text-xs font-semibold text-[#1D6B45] hover:underline"
            >
              Voir tout →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* 1. Traiteur (Disponible) */}
            <Link href="/traiteur" className="block group">
              <div className="h-full bg-white rounded-3xl p-4 border-2 border-[#1D6B45]/20 shadow-sm hover:shadow-md hover:border-[#1D6B45] transition-all duration-200 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-[#1D6B45]/5 to-transparent">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-[#1D6B45]/15 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <ChefHat size={26} className="text-[#1D6B45]" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#1D6B45] border border-[#1D6B45]/20 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Actif
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm group-hover:text-[#1D6B45] transition-colors">
                    Traiteur
                  </h3>
                  <p className="text-[11px] font-medium text-[#1D6B45] mt-0.5">
                    Plats & Devis
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">
                    Plats africains faits maison & devis événements.
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#1D6B45]">
                    Commander
                  </span>
                  <div className="w-6 h-6 rounded-full bg-[#1D6B45] text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            </Link>

            {/* 2. GP Colis (Disponible) */}
            <Link href="/gp" className="block group">
              <div className="h-full bg-white rounded-3xl p-4 border-2 border-[#D4870A]/20 shadow-sm hover:shadow-md hover:border-[#D4870A] transition-all duration-200 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-[#D4870A]/5 to-transparent">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-[#D4870A]/15 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Plane size={26} className="text-[#D4870A]" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF8E7] text-[#D4870A] border border-[#D4870A]/20 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Actif
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm group-hover:text-[#D4870A] transition-colors">
                    GP Colis
                  </h3>
                  <p className="text-[11px] font-medium text-[#D4870A] mt-0.5">
                    Transport de colis
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">
                    Envoi de colis sécurisé entre l&apos;Europe et
                    l&apos;Afrique.
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#D4870A]">
                    Envoyer
                  </span>
                  <div className="w-6 h-6 rounded-full bg-[#D4870A] text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>
            </Link>

            {/* 3. Épicerie (Bientôt) */}
            <div className="h-full bg-white/70 backdrop-blur-sm rounded-3xl p-4 border border-dashed border-gray-200 flex flex-col justify-between opacity-80">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <ShoppingCart size={24} className="text-gray-400" />
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#D4870A]/10 text-[#D4870A] border border-[#D4870A]/30 flex items-center gap-1">
                    <Clock size={9} /> Bientôt
                  </span>
                </div>
                <h3 className="font-bold text-gray-700 text-sm">Épicerie</h3>
                <p className="text-[11px] font-medium text-gray-400 mt-0.5">
                  Produits du pays
                </p>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
                  Ingrédients et condiments exotiques authentiques.
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-semibold">Prochainement</span>
              </div>
            </div>

            {/* 4. Coiffure (Bientôt) */}
            <div className="h-full bg-white/70 backdrop-blur-sm rounded-3xl p-4 border border-dashed border-gray-200 flex flex-col justify-between opacity-80">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Scissors size={24} className="text-gray-400" />
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#1D6B45]/10 text-[#1D6B45] border border-[#1D6B45]/30 flex items-center gap-1">
                    <Clock size={9} /> Bientôt
                  </span>
                </div>
                <h3 className="font-bold text-gray-700 text-sm">Coiffure</h3>
                <p className="text-[11px] font-medium text-gray-400 mt-0.5">
                  Tresses & Soins
                </p>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
                  Coiffeuses et tresseuses spécialisées à domicile.
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-gray-400">
                <span className="text-[10px] font-semibold">Prochainement</span>
              </div>
            </div>
          </div>
        </div>

        {/* Commandes récentes */}
        {isLoggedIn && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-base">
                Commandes récentes
              </h2>
              <Link
                href="/commandes"
                className="text-xs text-[#1D6B45] font-semibold hover:underline"
              >
                Voir tout →
              </Link>
            </div>

            {!hasCommandes ? (
              <p className="text-gray-400 text-xs text-center py-4">
                Aucune commande pour le moment
              </p>
            ) : (
              <div className="space-y-3">
                {/* Commandes traiteur */}
                {commandesTraiteur?.slice(0, 2).map((cmd: CommandeTraiteur) => {
                  const traiteurName =
                    cmd.traiteur?.name || cmd.traiteurs?.name || "Traiteur";
                  return (
                    <div
                      key={cmd.id}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <ChefHat className="text-[#1D6B45]" size={20} />
                        <div>
                          <p className="text-xs font-semibold text-gray-800">
                            {traiteurName}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {formatDate(cmd.created_at)} · {cmd.nb_personnes}{" "}
                            pers.
                          </p>
                        </div>
                      </div>
                      {getStatutBadge(cmd.statut)}
                    </div>
                  );
                })}

                {/* Commandes plats */}
                {ordersPlats?.slice(0, 2).map((order: OrderPlat) => {
                  const traiteurName =
                    order.traiteur?.name || order.traiteurs?.name || "Traiteur";
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="text-[#D4870A]" size={20} />
                        <div>
                          <p className="text-xs font-semibold text-gray-800">
                            {traiteurName}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {formatDate(order.created_at)} ·{" "}
                            {Number(order.total_amount).toFixed(2)} €
                          </p>
                        </div>
                      </div>
                      {getStatutBadge(order.status)}
                    </div>
                  );
                })}

                {/* Demandes GP */}
                {gpRequests?.slice(0, 2).map((req: GpRequest) => {
                  const listing = req.listing || req.gp_listings;
                  const depCity = req.departure_city || listing?.departure_city;
                  const arrCity = req.arrival_city || listing?.arrival_city;

                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Plane className="text-[#1D6B45]" size={20} />
                        <div>
                          <p className="text-xs font-semibold text-gray-800">
                            {depCity && arrCity
                              ? `${depCity} → ${arrCity}`
                              : "Demande GP"}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {formatDate(req.created_at)} · {req.weight_kg} kg
                          </p>
                        </div>
                      </div>
                      {getStatutBadge(req.status)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
