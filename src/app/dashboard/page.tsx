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
        const traiteurOrdersPending = userProfile.traiteurs?.flatMap((t: any) => t.orders || []).filter((o: any) => o.status === "pending" || o.status === "en_attente")?.length || 0;
        const traiteurCommandesPending = userProfile.traiteurs?.flatMap((t: any) => t.commandes || []).filter((c: any) => c.statut === "en_attente" || c.statut === "pending")?.length || 0;
        const gpRequestsPending = userProfile.gp_listings?.flatMap((g: any) => g.requests || []).filter((r: any) => r.status === "pending" || r.status === "en_attente")?.length || 0;

        pendingCount = traiteurOrdersPending + traiteurCommandesPending + gpRequestsPending;
      }

      // Fetch notifications
      const notifRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        unreadNotifications = notifData.notifications?.filter((n: any) => !n.is_read) || [];
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
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex items-center w-fit gap-1">
            <Clock size={12} /> En attente
          </span>
        );
      case "acceptee":
      case "accepted":
        return (
          <span className="text-xs bg-[#E8F5E9] text-[#1D6B45] px-2 py-0.5 rounded-full flex items-center w-fit gap-1">
            <CheckCircle2 size={12} /> Acceptée
          </span>
        );
      case "refusee":
      case "rejected":
        return (
          <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full flex items-center w-fit gap-1">
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
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        {isLoggedIn ? (
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[#1D6B45] flex items-center gap-2">
                Bonjour, {full_name}{" "}
                <Hand className="text-[#D4870A]" size={24} />
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                {"Que cherches-tu aujourd'hui ?"}
              </p>
            </div>
            <Link href="/profil">
              <div className="w-10 h-10 rounded-full bg-[#1D6B45] flex items-center justify-center text-white font-bold text-sm">
                {full_name?.charAt(0).toUpperCase() || "?"}
              </div>
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[#1D6B45] flex items-center gap-2">
                Bonjour <Hand className="text-[#D4870A]" size={24} />
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                <Link
                  href="/login"
                  className="text-[#1D6B45] font-semibold hover:underline"
                >
                  Connectez-vous
                </Link>{" "}
                pour accéder à toutes les fonctionnalités
              </p>
            </div>
            <Link href="/login">
              <div className="w-10 h-10 rounded-full bg-[#1D6B45]/10 border-2 border-[#1D6B45] flex items-center justify-center text-[#1D6B45]">
                <User size={20} />
              </div>
            </Link>
          </div>
        )}

        {/* Banner de Nouvelles Notifications / Commandes Reçues */}
        {(unreadCount > 0 || pendingCount > 0) && (
          <Link href="/commandes">
            <div className="bg-gradient-to-r from-[#1D6B45]/15 via-[#1D6B45]/20 to-[#D4870A]/15 border-2 border-[#1D6B45]/40 rounded-2xl p-4 mb-6 flex items-center justify-between hover:shadow-lg transition-all transform hover:-translate-y-0.5">
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[#1D6B45] flex items-center justify-center text-white">
                    <Bell className="animate-pulse" size={20} />
                  </div>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                    {Math.max(unreadCount, pendingCount)}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-[#1A202C] text-sm flex items-center gap-1">
                    <Sparkles className="text-[#D4870A] flex-shrink-0" size={16} />
                    {pendingCount > 0
                      ? `Vous avez ${pendingCount} nouvelle${pendingCount > 1 ? "s" : ""} commande${pendingCount > 1 ? "s" : ""} reçue${pendingCount > 1 ? "s" : ""} !`
                      : unreadCount === 1
                      ? "Vous avez 1 nouvelle notification !"
                      : `Vous avez ${unreadCount} nouvelles notifications !`}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5 font-medium">
                    {pendingCount > 0
                      ? "Cliquez pour consulter et valider vos commandes reçues."
                      : unreadNotifications[0]?.message || "Cliquez pour consulter vos commandes."}
                  </p>
                </div>
              </div>
              <span className="text-xs bg-[#1D6B45] text-white font-bold px-4 py-2 rounded-xl hover:bg-[#154d31] transition-all shadow-sm">
                Voir
              </span>
            </div>
          </Link>
        )}

        {/* Services */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link href="/traiteur">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md hover:border-[#1D6B45]/20 transition-all">
              <div className="mb-3">
                <ChefHat className="text-[#1D6B45]" size={32} />
              </div>
              <div className="font-semibold text-gray-800">Traiteur</div>
              <div className="text-sm text-gray-500 mt-1">
                Plats africains à domicile
              </div>
            </div>
          </Link>

          <Link href="/gp">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md hover:border-[#D4870A]/20 transition-all">
              <div className="mb-3">
                <Plane className="text-[#D4870A]" size={32} />
              </div>
              <div className="font-semibold text-gray-800">GP Colis</div>
              <div className="text-sm text-gray-500 mt-1">
                Envoie un colis au pays
              </div>
            </div>
          </Link>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 opacity-50">
            <div className="mb-3">
              <ShoppingCart className="text-gray-600" size={32} />
            </div>
            <div className="font-semibold text-gray-800">Épicerie</div>
            <div className="text-sm text-gray-600 mt-1">Bientôt disponible</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 opacity-50">
            <div className="mb-3">
              <Scissors className="text-gray-600" size={32} />
            </div>
            <div className="font-semibold text-gray-800">Coiffure</div>
            <div className="text-sm text-gray-600 mt-1">Bientôt disponible</div>
          </div>
        </div>

        {/* Commandes récentes */}
        {isLoggedIn ? (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">
                Commandes récentes
              </h2>
              <Link
                href="/commandes"
                className="text-xs text-[#1D6B45] font-medium hover:underline"
              >
                Voir tout →
              </Link>
            </div>

            {!hasCommandes ? (
              <p className="text-gray-600 text-sm text-center py-4">
                Aucune commande pour le moment
              </p>
            ) : (
              <div className="space-y-3">
                {/* Commandes traiteur */}
                {commandesTraiteur?.map((cmd: CommandeTraiteur) => {
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
                          <p className="text-sm font-medium text-gray-800">
                            {traiteurName}
                          </p>
                          <p className="text-xs text-gray-600">
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
                {ordersPlats?.map((order: OrderPlat) => {
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
                          <p className="text-sm font-medium text-gray-800">
                            {traiteurName}
                          </p>
                          <p className="text-xs text-gray-600">
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
                {gpRequests?.map((req: GpRequest) => {
                  const listing = req.listing || req.gp_listings;
                  const depCity = req.departure_city || listing?.departure_city;
                  const arrCity = req.arrival_city || listing?.arrival_city;
                  const isListingDeleted = !listing || listing.is_active === false;

                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Plane className="text-[#1D6B45]" size={20} />
                        <div>
                          <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5 flex-wrap">
                            <span>
                              {depCity && arrCity
                                ? `${depCity} → ${arrCity}`
                                : "Annonce retirée"}
                            </span>
                            {isListingDeleted && (
                              <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium border border-red-100">
                                Annonce supprimée
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-600">
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
        ) : null}
      </div>
    </div>
  );
}
