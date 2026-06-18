import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import Link from "next/link";

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

type GpListing = {
  id: string;
};

export default async function DashboardPage() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isLoggedIn = !!session;

  const { data: profile } = isLoggedIn
    ? await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()
    : { data: null };

  // ── Dernières commandes traiteur ──
  const { data: commandesTraiteur } = isLoggedIn
    ? await supabase
        .from("commandes_traiteur")
        .select("*, traiteurs(name)")
        .eq("client_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(2)
    : { data: null };

  // ── Dernières commandes plats ──
  const { data: ordersPlats } = isLoggedIn
    ? await supabase
        .from("orders")
        .select("*, traiteurs(name), order_items(id, quantity, dishes(name))")
        .eq("client_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(2)
    : { data: null };

  // ── Dernières demandes GP ──
  const { data: gpRequests } = isLoggedIn
    ? await supabase
        .from("gp_requests")
        .select(
          "*, gp_listings(departure_city, arrival_city, departure_country, arrival_country)",
        )
        .eq("sender_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(2)
    : { data: null };

  // ── Commandes reçues en attente (prestataire) ──
  const { data: traiteurData } = isLoggedIn
    ? await supabase
        .from("traiteurs")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle()
    : { data: null };

  let pendingCount = 0;

  if (traiteurData) {
    const { count: cmdPending } = await supabase
      .from("commandes_traiteur")
      .select("id", { count: "exact" })
      .eq("traiteur_id", traiteurData.id)
      .eq("statut", "en_attente");

    const { count: ordersPending } = await supabase
      .from("orders")
      .select("id", { count: "exact" })
      .eq("traiteur_id", traiteurData.id)
      .eq("status", "pending");

    pendingCount += (cmdPending || 0) + (ordersPending || 0);
  }

  const { data: gpListings } = isLoggedIn
    ? await supabase
        .from("gp_listings")
        .select("id")
        .eq("gp_id", session.user.id)
    : { data: null };

  if (gpListings && gpListings.length > 0) {
    const ids = (gpListings as GpListing[]).map((l) => l.id);
    const { count: gpPending } = await supabase
      .from("gp_requests")
      .select("id", { count: "exact" })
      .in("listing_id", ids)
      .eq("status", "pending");

    pendingCount += gpPending || 0;
  }

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "en_attente":
      case "pending":
        return (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
            ⏳ En attente
          </span>
        );
      case "acceptee":
      case "accepted":
        return (
          <span className="text-xs bg-[#E8F5E9] text-[#1D6B45] px-2 py-0.5 rounded-full">
            ✅ Acceptée
          </span>
        );
      case "refusee":
      case "rejected":
        return (
          <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">
            ❌ Refusée
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
              <h1 className="text-2xl font-bold text-[#1D6B45]">
                Bonjour, {profile?.full_name} 👋
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                {"Que cherches-tu aujourd'hui ?"}
              </p>
            </div>
            <Link href="/profil">
              <div className="w-10 h-10 rounded-full bg-[#1D6B45] flex items-center justify-center text-white font-bold text-sm">
                {profile?.full_name?.charAt(0).toUpperCase() || "?"}
              </div>
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[#1D6B45]">
                Bonjour 👋
              </h1>
              <p className="text-gray-500 mt-1 text-sm">
                <Link href="/login" className="text-[#1D6B45] font-semibold hover:underline">
                  Connectez-vous
                </Link>
                {" "}pour accéder à toutes les fonctionnalités
              </p>
            </div>
            <Link href="/login">
              <div className="w-10 h-10 rounded-full bg-[#1D6B45]/10 border-2 border-[#1D6B45] flex items-center justify-center text-[#1D6B45] font-bold text-sm">
                ?
              </div>
            </Link>
          </div>
        )}

        {/* Alerte commandes en attente */}
        {pendingCount > 0 && (
          <Link href="/commandes">
            <div className="bg-[#D4870A]/10 border border-[#D4870A]/30 rounded-2xl p-4 mb-6 flex items-center justify-between hover:bg-[#D4870A]/15 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔔</span>
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
              <div className="text-3xl mb-3">🍲</div>
              <div className="font-semibold text-gray-800">Traiteur</div>
              <div className="text-sm text-gray-500 mt-1">
                Plats africains à domicile
              </div>
            </div>
          </Link>

          <Link href="/gp">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md hover:border-[#D4870A]/20 transition-all">
              <div className="text-3xl mb-3">✈️</div>
              <div className="font-semibold text-gray-800">GP Colis</div>
              <div className="text-sm text-gray-500 mt-1">
                Envoie un colis au pays
              </div>
            </div>
          </Link>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 opacity-50">
            <div className="text-3xl mb-3">🛒</div>
            <div className="font-semibold text-gray-800">Épicerie</div>
            <div className="text-sm text-gray-400 mt-1">Bientôt disponible</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 opacity-50">
            <div className="text-3xl mb-3">💇</div>
            <div className="font-semibold text-gray-800">Coiffure</div>
            <div className="text-sm text-gray-400 mt-1">Bientôt disponible</div>
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
              <p className="text-gray-400 text-sm text-center py-4">
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
                      <span className="text-xl">🍽️</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {cmd.traiteurs?.name || "Traiteur"}
                        </p>
                        <p className="text-xs text-gray-400">
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
                      <span className="text-xl">🛒</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {order.traiteurs?.name || "Traiteur"}
                        </p>
                        <p className="text-xs text-gray-400">
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
                      <span className="text-xl">✈️</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {req.gp_listings?.departure_city} →{" "}
                          {req.gp_listings?.arrival_city}
                        </p>
                        <p className="text-xs text-gray-400">
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
