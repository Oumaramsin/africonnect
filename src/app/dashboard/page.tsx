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
} from "lucide-react";
import { cookies } from "next/headers";

type CommandeTraiteur = {
  id: string;
  statut: string;
  created_at: string;
  nb_personnes: number;
  traiteurs?: { name: string } | null;
};

type OrderPlat = {
  id: string;
  status: string;
  created_at: string;
  total_amount: number;
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
  gp_listings?: {
    departure_city: string;
    arrival_city: string;
  } | null;
};

export default async function DashboardPage() {
  let full_name = null;
  let commandesTraiteur: any[] = [];
  let ordersPlats: any[] = [];
  let gpRequests: any[] = [];
  let pendingCount = 0;

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
        },
      );
      const data = await response.json();
      const userProfile = data.data.orders;
      full_name = userProfile.full_name;
      gpRequests = userProfile.gp_requests;
      ordersPlats = userProfile.orders;
      commandesTraiteur = userProfile.commandes;
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

        {/* Alerte commandes en attente */}
        {pendingCount > 0 && (
          <Link href="/commandes">
            <div className="bg-[#D4870A]/10 border border-[#D4870A]/30 rounded-2xl p-4 mb-6 flex items-center justify-between hover:bg-[#D4870A]/15 transition-all">
              <div className="flex items-center gap-3">
                <Bell className="text-[#D4870A]" size={24} />
                <div>
                  <p className="font-semibold text-[#D4870A] text-sm">
                    {pendingCount} demande{pendingCount > 1 ? "s" : ""} en
                    attente
                  </p>
                  <p className="text-xs text-gray-500">
                    Cliquez pour accepter ou refuser
                  </p>
                </div>
              </div>
              <span className="text-[#D4870A] font-bold">→</span>
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
                {commandesTraiteur?.map((cmd: CommandeTraiteur) => (
                  <div
                    key={cmd.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <ChefHat className="text-[#1D6B45]" size={20} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {cmd.traiteurs?.name || "Traiteur"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatDate(cmd.created_at)} · {cmd.nb_personnes}{" "}
                          pers.
                        </p>
                      </div>
                    </div>
                    {getStatutBadge(cmd.statut)}
                  </div>
                ))}

                {/* Commandes plats */}
                {ordersPlats?.map((order: OrderPlat) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="text-[#D4870A]" size={20} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {order.traiteurs?.name || "Traiteur"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatDate(order.created_at)} ·{" "}
                          {Number(order.total_amount).toFixed(2)} €
                        </p>
                      </div>
                    </div>
                    {getStatutBadge(order.status)}
                  </div>
                ))}

                {/* Demandes GP */}
                {gpRequests?.map((req: GpRequest) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Plane className="text-[#1D6B45]" size={20} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {req.gp_listings?.departure_city} →{" "}
                          {req.gp_listings?.arrival_city}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatDate(req.created_at)} · {req.weight_kg} kg
                        </p>
                      </div>
                    </div>
                    {getStatutBadge(req.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
