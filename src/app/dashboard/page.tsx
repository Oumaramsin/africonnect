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
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Headphones,
  HeartHandshake,
  PlusCircle,
  Package,
  Calendar,
  Layers,
  ChevronRight,
  User,
  Search,
} from "lucide-react";
import { cookies } from "next/headers";
import DescriptionBanner from "@/components/dashboard/DescriptionBanner";
import DashboardSearchBar from "@/components/dashboard/DashboardSearchBar";

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
  let full_name: string | null = null;
  let userEmail: string | null = null;
  let userRole: string | null = null;
  let commandesTraiteur: CommandeTraiteur[] = [];
  let ordersPlats: OrderPlat[] = [];
  let gpRequests: GpRequest[] = [];
  let pendingCount = 0;
  let unreadNotifications: any[] = [];
  let unreadCount = 0;

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const isLoggedIn = !!token;

  if (isLoggedIn) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/commande`,
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
        userEmail = userProfile.email || null;
        userRole = userProfile.role || "client";
        gpRequests = userProfile.gp_requests || [];
        ordersPlats = userProfile.orders || [];
        commandesTraiteur = userProfile.commandes || [];

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

      // Notifications
      const notifRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/notifications`,
        {
          headers: { Authorization: `Bearer ${token}` },
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
          <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-full flex items-center w-fit gap-1 font-semibold">
            <Clock size={11} /> En attente
          </span>
        );
      case "acceptee":
      case "accepted":
        return (
          <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center w-fit gap-1 font-semibold">
            <CheckCircle2 size={11} /> Acceptée
          </span>
        );
      case "refusee":
      case "rejected":
        return (
          <span className="text-[11px] bg-rose-50 text-rose-600 border border-rose-200/80 px-2 py-0.5 rounded-full flex items-center w-fit gap-1 font-semibold">
            <XCircle size={11} /> Refusée
          </span>
        );
      case "annulee":
      case "cancelled":
        return (
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center w-fit gap-1 font-semibold border border-slate-200">
            <XCircle size={11} className="text-slate-400" /> Annulée
          </span>
        );
      default:
        return (
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium capitalize">
            {statut}
          </span>
        );
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });

  const hasCommandes =
    commandesTraiteur.length > 0 ||
    ordersPlats.length > 0 ||
    gpRequests.length > 0;

  const totalCommandesCount =
    commandesTraiteur.length + ordersPlats.length + gpRequests.length;

  return (
    <div className="w-full">
      {/* ══════════════════════════════════════════════════════════════
          1. VERSION MOBILE (< md) : 100% PARITÉ AVEC L'APPLICATION MOBILE
         ══════════════════════════════════════════════════════════════ */}
      <div className="md:hidden bg-[#F3F4F6] min-h-screen">
        {/* Top Hero Header Card (Gradient Vert & Or) */}
        <div className="bg-[#165034] text-white pt-5 pb-7 px-5 rounded-b-[32px] relative overflow-hidden shadow-lg">
          {/* Background Gold Blur Decoration */}
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[#D4870A]/20 blur-xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex-1 pr-3">
              <div className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 px-3 py-1 rounded-full text-white text-[11px] font-bold mb-2.5">
                <Sparkles size={12} className="text-[#FBBF24]" />
                <span>Bienvenue sur Dabari</span>
              </div>

              <h1 className="text-[22px] font-black text-white tracking-tight leading-tight mb-1">
                {isLoggedIn && full_name ? `Bonjour, ${full_name}` : "Bonjour"}
              </h1>
              <p className="text-[13px] text-white/80 leading-snug">
                {isLoggedIn
                  ? "Que souhaitez-vous commander ou envoyer aujourd'hui ?"
                  : "Connectez-vous pour profiter de tous vos services."}
              </p>
            </div>

            {isLoggedIn ? (
              <Link
                href="/profil"
                className="w-12 h-12 rounded-[18px] bg-white/20 border-[1.5px] border-white/35 flex items-center justify-center text-white font-black text-xl relative shrink-0 shadow-sm"
              >
                {full_name ? full_name.charAt(0).toUpperCase() : <User size={20} />}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#D4870A] border-2 border-[#165034]" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-[#D4870A] hover:bg-[#b87405] px-4 py-2.5 rounded-[14px] text-white font-bold text-[13px] shadow-sm shrink-0 transition-colors"
              >
                Connexion
              </Link>
            )}
          </div>

          {/* Recherche rapide sur mobile */}
          <div className="mt-4 pt-3.5 border-t border-white/15">
            <DashboardSearchBar />
          </div>

          {/* Raccourcis d'action sur mobile (grille 3 colonnes sans scroll) */}
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <Link
              href="/traiteur/demande"
              className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold text-center backdrop-blur-sm border border-white/20 transition-all"
            >
              <PlusCircle size={12} className="text-[#FBBF24] shrink-0" />
              <span className="truncate">Devis traiteur</span>
            </Link>
            <Link
              href="/gp/nouvelle"
              className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold text-center backdrop-blur-sm border border-white/20 transition-all"
            >
              <Plane size={12} className="text-[#FBBF24] shrink-0" />
              <span className="truncate">Publier un vol</span>
            </Link>
            <Link
              href="/traiteur"
              className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold text-center backdrop-blur-sm border border-white/20 transition-all"
            >
              <ChefHat size={12} className="text-[#FBBF24] shrink-0" />
              <span className="truncate">Explorer</span>
            </Link>
          </div>
        </div>

        {/* Corps Principal Mobile */}
        <div className="px-4 pt-4 pb-8 space-y-4">
          {/* Bannière de description dismissible */}
          <DescriptionBanner />

          {/* Notification Alert Banner (si notifications non lues) */}
          {unreadNotifications.length > 0 && (
            <Link
              href="/commandes"
              className="bg-white rounded-[22px] p-4 border border-emerald-200/80 shadow-xs flex items-center justify-between gap-3 block group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative w-10 h-10 rounded-2xl bg-emerald-50 text-[#1D6B45] flex items-center justify-center shrink-0">
                  <Bell size={20} />
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black rounded-full min-w-4 h-4 px-1 flex items-center justify-center border-2 border-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {unreadCount > 1
                      ? `${unreadCount} nouvelles notifications !`
                      : `${unreadCount} nouvelle notification !`}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Votre commande traiteur est en cours de traitement.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#1D6B45] bg-[#E8F5E9] px-3 py-1.5 rounded-xl shrink-0">
                Voir
              </span>
            </Link>
          )}

          {/* Section: Services Disponibles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-slate-900">
                Services disponibles
              </h2>
              <Link
                href="/services"
                className="text-xs font-bold text-[#1D6B45] hover:underline"
              >
                Voir tout →
              </Link>
            </div>

            {/* Grille 2x2 Fidèle au Mobile */}
            <div className="grid grid-cols-2 gap-3">
              {/* 1. Traiteur (Actif) */}
              <Link
                href="/traiteur"
                className="bg-white rounded-[22px] p-3.5 border border-emerald-100 shadow-xs flex flex-col justify-between active:scale-98 transition-transform"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-[#1D6B45]">
                      <ChefHat size={22} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#1D6B45] border border-emerald-200/60 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Actif
                    </span>
                  </div>
                  <h3 className="font-extrabold text-[15px] text-slate-900 leading-tight">
                    Traiteur
                  </h3>
                  <p className="text-[11px] font-bold text-[#1D6B45]">
                    Plats & Devis
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Plats faits maison & devis événements.
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#1D6B45]">
                    Commander
                  </span>
                  <div className="w-5 h-5 rounded-full bg-[#1D6B45] text-white flex items-center justify-center">
                    <ChevronRight size={12} />
                  </div>
                </div>
              </Link>

              {/* 2. GP Colis (Actif) */}
              <Link
                href="/gp"
                className="bg-white rounded-[22px] p-3.5 border border-amber-100 shadow-xs flex flex-col justify-between active:scale-98 transition-transform"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF8E7] flex items-center justify-center text-[#D4870A]">
                      <Plane size={22} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-[#D4870A] border border-amber-200/60 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Actif
                    </span>
                  </div>
                  <h3 className="font-extrabold text-[15px] text-slate-900 leading-tight">
                    GP Colis
                  </h3>
                  <p className="text-[11px] font-bold text-[#D4870A]">
                    Transport de colis
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Envois sécurisés Europe - Afrique.
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#D4870A]">
                    Envoyer
                  </span>
                  <div className="w-5 h-5 rounded-full bg-[#D4870A] text-white flex items-center justify-center">
                    <ChevronRight size={12} />
                  </div>
                </div>
              </Link>

              {/* 3. Épicerie (Bientôt) */}
              <div className="bg-white/80 rounded-[22px] p-3.5 border border-dashed border-slate-200 flex flex-col justify-between opacity-85">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <ShoppingCart size={20} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1">
                      <Clock size={10} /> Bientôt
                    </span>
                  </div>
                  <h3 className="font-bold text-[15px] text-slate-700 leading-tight">
                    Épicerie
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400">
                    Produits du pays
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Ingrédients & condiments exotiques.
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400">
                    Prochainement
                  </span>
                </div>
              </div>

              {/* 4. Coiffure (Bientôt) */}
              <div className="bg-white/80 rounded-[22px] p-3.5 border border-dashed border-slate-200 flex flex-col justify-between opacity-85">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <Scissors size={20} />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                      <Clock size={10} /> Bientôt
                    </span>
                  </div>
                  <h3 className="font-bold text-[15px] text-slate-700 leading-tight">
                    Coiffure
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400">
                    Tresses & Soins
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Tresseuses spécialisées à domicile.
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400">
                    Prochainement
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Commandes Récentes Mobile */}
          {isLoggedIn && hasCommandes && (
            <div className="bg-white rounded-[22px] p-4 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Commandes récentes
                </h3>
                <Link
                  href="/commandes"
                  className="text-xs font-bold text-[#1D6B45]"
                >
                  Voir tout →
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {commandesTraiteur.slice(0, 2).map((cmd) => {
                  const name = cmd.traiteur?.name || cmd.traiteurs?.name || "Traiteur";
                  return (
                    <div key={cmd.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#1D6B45] flex items-center justify-center shrink-0">
                          <ChefHat size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">{name}</p>
                          <p className="text-[10px] text-slate-500">
                            {formatDate(cmd.created_at)} · {cmd.nb_personnes} pers.
                          </p>
                        </div>
                      </div>
                      {getStatutBadge(cmd.statut)}
                    </div>
                  );
                })}

                {ordersPlats.slice(0, 2).map((order) => {
                  const name = order.traiteur?.name || order.traiteurs?.name || "Plats faits maison";
                  return (
                    <div key={order.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#1D6B45] flex items-center justify-center shrink-0">
                          <ChefHat size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">{name}</p>
                          <p className="text-[10px] text-slate-500">
                            {formatDate(order.created_at)} · {Number(order.total_amount).toFixed(2)} €
                          </p>
                        </div>
                      </div>
                      {getStatutBadge(order.status)}
                    </div>
                  );
                })}

                {gpRequests.slice(0, 2).map((gp) => {
                  const dep = gp.departure_city || gp.listing?.departure_city || "Départ";
                  const arr = gp.arrival_city || gp.listing?.arrival_city || "Arrivée";
                  return (
                    <div key={gp.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#D4870A] flex items-center justify-center shrink-0">
                          <Plane size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[130px] inline-flex items-center gap-1">
                            <span>{dep}</span>
                            <ArrowRight size={10} className="text-slate-400 shrink-0" />
                            <span>{arr}</span>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatDate(gp.created_at)} · {gp.weight_kg} Kg
                          </p>
                        </div>
                      </div>
                      {getStatutBadge(gp.status)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Sécurité & Confiance Mobile */}
          <div className="flex items-center justify-center gap-2 py-3 text-center">
            <ShieldCheck size={14} className="text-[#1D6B45]" />
            <p className="text-[11px] font-semibold text-slate-500">
              Plateforme 100% sécurisée • Réseau de confiance Dabari
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          2. VERSION DESKTOP (≥ md) : LUXE, PRESTIGE & HAUTE COUTURE
         ══════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-10">
        {/* ── FLAGSHIP HERO BANNER DESKTOP ── */}
        <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#0c3924] via-[#165034] to-[#0d4129] text-white shadow-2xl shadow-[#165034]/20 border border-emerald-900/40">
          {/* Cercles de diffusion d'ambiance luxueuse */}
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-[#D4870A]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-28 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
            {/* Colonne Gauche : Titre et Raccourcis */}
            <div className="max-w-2xl space-y-5">
              <div className="inline-flex items-center gap-2 bg-white/12 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full border border-white/20 shadow-xs">
                <Sparkles size={14} className="text-[#FBBF24]" />
                <span className="tracking-wide">L'Excellence de la Diaspora • Traiteurs & GP Certifié</span>
              </div>

              <h1 className="text-3xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                {isLoggedIn && full_name ? (
                  <>
                    Bonjour, <span className="text-[#FAF7F2]">{full_name}</span>{" "}
                    <Sparkles size={24} className="inline-block text-[#D4870A] ml-1.5 align-middle animate-pulse" />
                  </>
                ) : (
                  <>
                    L'Écosystème Dabari{" "}
                    <span className="text-[#D4870A]">d'Excellence</span>
                  </>
                )}
              </h1>

              <p className="text-white/85 text-base lg:text-lg leading-relaxed font-normal max-w-xl">
                Savourez l'authenticité des meilleurs traiteurs de la diaspora ou confiez vos bagages en toute sérénité à des voyageurs GP certifiés entre l'Afrique et le monde.
              </p>

              {/* Raccourcis d'action sous forme de pills modernes */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  href="/traiteur"
                  className="inline-flex items-center gap-2.5 bg-white text-[#1D6B45] hover:bg-emerald-50 px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-black/10 transition-all hover:scale-102 hover:shadow-xl"
                >
                  <ChefHat size={18} />
                  <span>Explorer les Traiteurs</span>
                </Link>

                <Link
                  href="/gp"
                  className="inline-flex items-center gap-2.5 bg-[#D4870A] hover:bg-[#b87405] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-amber-900/20 transition-all hover:scale-102 hover:shadow-xl"
                >
                  <Plane size={18} />
                  <span>Trouver un vol GP</span>
                </Link>

                <Link
                  href="/traiteur/demande"
                  className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md px-4 py-3 rounded-2xl font-semibold text-sm transition-all"
                >
                  <PlusCircle size={17} />
                  <span>Demander un devis</span>
                </Link>
              </div>

              {/* Barre de recherche luxueuse sur Desktop */}
              <div className="pt-2">
                <DashboardSearchBar />
              </div>

              {/* Indicateurs de confiance et de réassurance sur Desktop */}
              <div className="pt-2 flex items-center gap-6 text-xs text-white/80 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-300 shrink-0" />
                  <span>Paiement sous séquestre 100% garanti</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChefHat size={16} className="text-amber-300 shrink-0" />
                  <span>Chefs & Traiteurs certifiés</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plane size={16} className="text-sky-300 shrink-0" />
                  <span>Vols GP réguliers vérifiés</span>
                </div>
              </div>
            </div>

            {/* Colonne Droite : Cockpit Utilisateur & Statistiques en Direct */}
            <div className="w-full lg:w-80 shrink-0">
              {isLoggedIn ? (
                <div className="bg-white/10 backdrop-blur-xl border border-white/25 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#D4870A] to-[#b87405] text-white font-black text-2xl flex items-center justify-center shadow-md">
                      {full_name ? full_name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-base truncate max-w-[150px]">
                          {full_name || "Membre Dabari"}
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                      </div>
                      <p className="text-xs text-white/70 capitalize font-medium">
                        {userRole === "admin" ? "Administrateur" : "Membre vérifié"}
                      </p>
                    </div>
                  </div>

                  {/* Compteurs en direct */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/15">
                    <Link
                      href="/commandes"
                      className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all text-center block group"
                    >
                      <p className="text-2xl font-black text-white group-hover:scale-105 transition-transform">
                        {totalCommandesCount}
                      </p>
                      <p className="text-[11px] text-white/70 font-medium">Commandes</p>
                    </Link>

                    <Link
                      href="/commandes"
                      className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all text-center block group"
                    >
                      <p className="text-2xl font-black text-[#FBBF24] group-hover:scale-105 transition-transform">
                        {Math.max(unreadCount, pendingCount)}
                      </p>
                      <p className="text-[11px] text-white/70 font-medium">Alertes</p>
                    </Link>
                  </div>

                  <Link
                    href="/profil"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-white text-[#165034] hover:bg-emerald-50 transition-colors shadow-sm"
                  >
                    Gérer mon profil & adresses <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-xl border border-white/25 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto text-white">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Rejoignez Dabari</h3>
                    <p className="text-xs text-white/75 mt-1">
                      Accédez aux tarifs négociés et au suivi en direct de vos livraisons.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/login"
                      className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-white text-[#1D6B45] hover:bg-emerald-50 transition-colors"
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/register"
                      className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-[#D4870A] hover:bg-[#b87405] text-white transition-colors"
                    >
                      S'inscrire
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── BANNIÈRE D'ALERTE EN CAS DE NOUVELLES ACTIONS ── */}
        {(unreadCount > 0 || pendingCount > 0) && (
          <section>
            <Link href="/commandes" className="block group">
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-2 border-[#1D6B45]/30 rounded-3xl p-6 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-[#1D6B45] text-white flex items-center justify-center shadow-md">
                      <Bell size={24} />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[11px] font-black rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-xs">
                      {Math.max(unreadCount, pendingCount)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                      <Sparkles className="text-[#D4870A]" size={16} />
                      {pendingCount > 0
                        ? `Vous avez ${pendingCount} commande${pendingCount > 1 ? "s" : ""} en attente d'approbation !`
                        : `${unreadCount} nouvelle(s) notification(s) sur vos commandes !`}
                    </h3>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {pendingCount > 0
                        ? "Validez ou déclinez immédiatement les demandes reçues de vos clients."
                        : unreadNotifications[0]?.message || "Cliquez ici pour consulter le détail de vos commandes."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-[#1D6B45] text-white text-sm font-bold px-5 py-2.5 rounded-xl group-hover:bg-[#154d31] transition-colors shadow-xs flex items-center gap-1.5">
                    Accéder à mes commandes <ArrowRight size={15} />
                  </span>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* ── GRILLE DES 4 SERVICES FLAGSHIP AVEC SURVOL 3D ── */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1D6B45]">
                Écosystème Dabari
              </span>
              <h2 className="text-2xl font-black text-slate-900">
                Nos Services Disponibles
              </h2>
            </div>
            <Link
              href="/services"
              className="text-sm font-bold text-[#1D6B45] hover:text-[#154d31] hover:underline flex items-center gap-1"
            >
              Consulter tout le catalogue <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Traiteur (Actif) */}
            <Link href="/traiteur" className="block group">
              <div className="h-full bg-white rounded-3xl p-6 border-2 border-emerald-100 hover:border-[#1D6B45] shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-emerald-50/40 to-white">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-emerald-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <ChefHat size={30} className="text-[#1D6B45]" />
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-100/90 text-[#1D6B45] flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> Actif
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-[#1D6B45] transition-colors">
                    Traiteurs & Chefs
                  </h3>
                  <p className="text-xs font-bold text-[#1D6B45] mt-0.5">
                    Plats faits maison & Devis événements
                  </p>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    Découvrez les saveurs de l'Afrique : tiep, mafé, ndolé, saka-saka, aloco préparés avec authenticité par nos chefs partenaires.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#1D6B45]">
                    Commander ou devis
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#1D6B45] text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-xs">
                    <ArrowRight size={15} />
                  </div>
                </div>
              </div>
            </Link>

            {/* 2. GP Colis (Actif) */}
            <Link href="/gp" className="block group">
              <div className="h-full bg-white rounded-3xl p-6 border-2 border-amber-100 hover:border-[#D4870A] shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-amber-50/40 to-white">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-amber-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Plane size={30} className="text-[#D4870A]" />
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-100/90 text-[#D4870A] flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> Actif
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-[#D4870A] transition-colors">
                    Transport GP Colis
                  </h3>
                  <p className="text-xs font-bold text-[#D4870A] mt-0.5">
                    Europe ⇄ Afrique & Reste du monde
                  </p>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    Expédiez vos colis rapidement et en toute sécurité avec des voyageurs certifiés. Suivi en temps réel et tarifs transparents au kilo.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#D4870A]">
                    Envoyer un colis
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#D4870A] text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-xs">
                    <ArrowRight size={15} />
                  </div>
                </div>
              </div>
            </Link>

            {/* 3. Épicerie (Bientôt) */}
            <div className="h-full bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-dashed border-slate-200 flex flex-col justify-between opacity-85">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <ShoppingCart size={28} className="text-slate-400" />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center gap-1.5">
                    <Clock size={12} /> Bientôt
                  </span>
                </div>
                <h3 className="font-bold text-slate-700 text-lg">Épicerie & Produits</h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  Saveurs & Ingrédients du pays
                </p>
                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                  Condiments rares, épices authentiques, farines et fruits tropicaux livrés chez vous.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Lancement prochain</span>
                <Layers size={16} />
              </div>
            </div>

            {/* 4. Coiffure & Soins (Bientôt) */}
            <div className="h-full bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-dashed border-slate-200 flex flex-col justify-between opacity-85">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Scissors size={28} className="text-slate-400" />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center gap-1.5">
                    <Clock size={12} /> Bientôt
                  </span>
                </div>
                <h3 className="font-bold text-slate-700 text-lg">Coiffure & Soins</h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  Tresses, locks & soins afro
                </p>
                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                  Trouvez facilement des professionnels de la coiffure afro à domicile ou en salon près de chez vous.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Lancement prochain</span>
                <Layers size={16} />
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION DESKTOP EN 2 COLONNES : ACTIVITÉ (65%) & ESPACE PRO / RÉASSURANCE (35%) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLONNE GAUCHE (2 tiers) : COMMANDES & EXPÉDITIONS RÉCENTES */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Centre d'Opérations & Commandes Récentes
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Suivi direct de vos devis traiteur, plats commandés et réservations de colis GP
                  </p>
                </div>

                {isLoggedIn && (
                  <Link
                    href="/commandes"
                    className="text-xs font-bold text-[#1D6B45] hover:text-[#154d31] hover:underline flex items-center gap-1"
                  >
                    Tout afficher ({totalCommandesCount}) →
                  </Link>
                )}
              </div>

              {!isLoggedIn ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#1D6B45] flex items-center justify-center mx-auto">
                    <Package size={28} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Connectez-vous pour voir vos commandes
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Accédez à l'historique complet de vos devis traiteurs, commandes de plats et expéditions GP.
                  </p>
                  <Link
                    href="/login"
                    className="inline-block mt-2 bg-[#1D6B45] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs hover:bg-[#154d31] transition-colors"
                  >
                    Se connecter
                  </Link>
                </div>
              ) : !hasCommandes ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Package size={28} />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm">
                    Aucune commande pour le moment
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Vos futures commandes de traiteurs ou demandes de transport GP apparaîtront ici.
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <Link
                      href="/traiteur"
                      className="bg-[#1D6B45] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs hover:bg-[#154d31] transition-all"
                    >
                      Commander un plat
                    </Link>
                    <Link
                      href="/gp"
                      className="bg-[#D4870A] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs hover:bg-[#b87405] transition-all"
                    >
                      Expédier un colis
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {/* 1. Commandes Traiteur Devis */}
                  {commandesTraiteur.slice(0, 3).map((cmd) => {
                    const traiteurName =
                      cmd.traiteur?.name || cmd.traiteurs?.name || "Chef Traiteur";
                    return (
                      <div
                        key={cmd.id}
                        className="py-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 p-2.5 rounded-2xl transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#1D6B45] flex items-center justify-center shrink-0">
                            <ChefHat size={22} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {traiteurName}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} /> {formatDate(cmd.created_at)}
                              </span>
                              <span>•</span>
                              <span>{cmd.nb_personnes} personnes</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatutBadge(cmd.statut)}
                          <Link
                            href="/commandes"
                            className="text-xs font-bold text-slate-600 hover:text-[#1D6B45] hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                          >
                            Détails
                          </Link>
                        </div>
                      </div>
                    );
                  })}

                  {/* 2. Commandes Plats au détail */}
                  {ordersPlats.slice(0, 3).map((order) => {
                    const traiteurName =
                      order.traiteur?.name || order.traiteurs?.name || "Chef Traiteur";
                    return (
                      <div
                        key={order.id}
                        className="py-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 p-2.5 rounded-2xl transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-[#D4870A] flex items-center justify-center shrink-0">
                            <ShoppingCart size={22} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {traiteurName}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} /> {formatDate(order.created_at)}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-slate-800">
                                {Number(order.total_amount).toFixed(2)} €
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatutBadge(order.status)}
                          <Link
                            href="/commandes"
                            className="text-xs font-bold text-slate-600 hover:text-[#1D6B45] hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                          >
                            Détails
                          </Link>
                        </div>
                      </div>
                    );
                  })}

                  {/* 3. Demandes GP Colis */}
                  {gpRequests.slice(0, 3).map((req) => {
                    const listing = req.listing || req.gp_listings;
                    const depCity = req.departure_city || listing?.departure_city;
                    const arrCity = req.arrival_city || listing?.arrival_city;

                    return (
                      <div
                        key={req.id}
                        className="py-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 p-2.5 rounded-2xl transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                            <Plane size={22} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {depCity && arrCity ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span>{depCity}</span>
                                  <ArrowRight size={13} className="text-slate-400 shrink-0" />
                                  <span>{arrCity}</span>
                                </span>
                              ) : (
                                "Demande de transport GP"
                              )}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} /> {formatDate(req.created_at)}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-slate-800">
                                {req.weight_kg} kg réservés
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatutBadge(req.status)}
                          <Link
                            href="/commandes"
                            className="text-xs font-bold text-slate-600 hover:text-[#1D6B45] hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                          >
                            Suivi
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* COLONNE DROITE (1 tiers) : ESPACES PRO & SÉCURITÉ */}
          <div className="space-y-6">
            {/* Carte Devenez Transporteur GP */}
            <div className="bg-gradient-to-br from-[#D4870A] to-[#995d03] text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-amber-500/10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Plane size={24} />
              </div>
              <div>
                <h4 className="text-lg font-black tracking-tight text-white">
                  Vous prenez l'avion bientôt ?
                </h4>
                <p className="text-xs text-white/90 mt-1 leading-relaxed">
                  Rentabilisez vos valises en transportant les colis autorisés de la diaspora en toute légalité et sécurité.
                </p>
              </div>
              <Link
                href="/gp/nouvelle"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-xs bg-white text-amber-900 hover:bg-amber-50 shadow-sm transition-all"
              >
                <PlusCircle size={15} />
                Publier une annonce de vol GP
              </Link>
            </div>

            {/* Carte Vous êtes Traiteur ? */}
            <div className="bg-gradient-to-br from-[#1D6B45] to-[#0c3924] text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-[#1D6B45]/15 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <ChefHat size={24} />
              </div>
              <div>
                <h4 className="text-lg font-black tracking-tight text-white">
                  Vous cuisinez avec passion ?
                </h4>
                <p className="text-xs text-white/90 mt-1 leading-relaxed">
                  Rejoignez notre brigade de traiteurs partenaires, recevez des demandes de devis et développez votre activité sans frais fixes.
                </p>
              </div>
              <Link
                href="/profil/traiteur"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-xs bg-white text-[#1D6B45] hover:bg-emerald-50 shadow-sm transition-all"
              >
                Accéder à l'espace Traiteur
              </Link>
            </div>

            {/* Badges de Confiance & Réassurance */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#1D6B45]" />
                Pourquoi choisir Dabari ?
              </h4>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1D6B45] shrink-0 mt-0.5" />
                  <span>
                    <strong>Transporteurs vérifiés</strong> : vérification d'identité et billets de vol validés.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <HeartHandshake size={16} className="text-[#D4870A] shrink-0 mt-0.5" />
                  <span>
                    <strong>Avis authentiques</strong> : retours certifiés sur chaque chef et voyageur.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Headphones size={16} className="text-[#1D6B45] shrink-0 mt-0.5" />
                  <span>
                    <strong>Assistance WhatsApp 7j/7</strong> : une équipe dédiée vous accompagne en direct.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
