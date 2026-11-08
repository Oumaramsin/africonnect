"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  MessageSquare,
  User,
  MapPin,
  Lock,
  PlaneTakeoff,
  PlaneLanding,
  Package,
  Home,
  Calendar,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Star,
  ChevronRight,
  Luggage,
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  WifiOff,
} from "lucide-react";
import CountryFlag from "@/components/ui/CountryFlag";
import CountryDialPicker from "@/components/ui/CountryDialPicker";
import { authFetch, hasSession, isNetworkError } from "@/lib/auth";
import { formatWhatsAppUrl } from "@/lib/types/traiteur";
import type { GpListing } from "@/lib/types/gp";
import { useEscapeKey } from "@/hooks/useEscapeKey";

const AUTHORIZED_ITEMS = [
  "Vêtements, chaussures & textiles traditionnels (Wax, Bazin, Kente)",
  "Produits secs hermétiquement scellés (Fonio, piment séché, bissap, épices)",
  "Documents administratifs, courriers & livres",
  "Cosmétiques solides & beurre de karité scellés",
  "Petits objets artisanaux & souvenirs non dangereux",
];

const PROHIBITED_ITEMS = [
  "Substances illicites & médicaments sans ordonnance nominative",
  "Liquides & aérosols non conformes aux normes IATA",
  "Batteries au lithium en vrac & matières inflammables",
  "Produits frais périssables non protégés / non autorisés",
  "Contrefaçons & objets interdits au passage en douane",
];

const subscribeToNothing = () => () => {};

/** Session ouverte ? Lue dans le navigateur ; toujours faux au rendu serveur (page mise en cache). */
function useHasSession(): boolean {
  return useSyncExternalStore(subscribeToNothing, hasSession, () => false);
}

const errorMessage = (body: { error?: unknown; message?: unknown } | null, fallback: string): string => {
  const value = body?.error || body?.message;
  return typeof value === "string" && value.trim() ? value : fallback;
};

type LoadState = "loading" | "ready" | "not_found" | "error";

type LoadResult =
  | { status: "ok"; listing: GpListing }
  | { status: "not_found" }
  | { status: "error"; message: string; offline: boolean };

/** Annonce GP, chargée depuis le navigateur quand le rendu serveur n'a pas pu l'obtenir. */
async function fetchListing(listingId: string): Promise<LoadResult> {
  try {
    const res = await authFetch(`/api/gp/${encodeURIComponent(listingId)}`);
    const body = await res.json();
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) {
      return {
        status: "error",
        offline: false,
        message: errorMessage(body, "Impossible de charger ce vol GP."),
      };
    }
    const listing = body?.data?.gp;
    if (!listing || listing.is_active === false) return { status: "not_found" };
    return { status: "ok", listing };
  } catch (err) {
    return isNetworkError(err)
      ? { status: "error", offline: true, message: err.message }
      : { status: "error", offline: false, message: "Impossible de charger ce vol GP. Réessayez dans un instant." };
  }
}

// Dates de vol sans heure (colonne DATE, minuit UTC) : affichées en UTC pour ne pas décaler le jour
// selon le fuseau du visiteur, et pour un rendu identique côté serveur et navigateur
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const isValidNumberFormat = (str: string) => /^\d+([.,]\d+)?$/.test(str);

type Props = {
  listingId: string;
  /** Annonce obtenue au rendu serveur ; null si l'API était injoignable (chargement côté client). */
  initialListing: GpListing | null;
};

export default function GpDetailClient({ listingId, initialListing }: Props) {
  const router = useRouter();
  const isLoggedIn = useHasSession();

  const [listing, setListing] = useState<GpListing | null>(initialListing);
  const [loadState, setLoadState] = useState<LoadState>(initialListing ? "ready" : "loading");
  const [loadError, setLoadError] = useState<{ message: string; offline: boolean } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Erreur de saisie (sous le formulaire) et erreur d'envoi (dans la modale, au premier plan)
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSecurityAccordion, setShowSecurityAccordion] = useState(false);
  // Verrou synchrone : un double clic ne doit pas envoyer deux réservations
  const submitLockRef = useRef(false);

  const [form, setForm] = useState({
    weight_kg: "2",
    content_desc: "",
    declared_value: "",
    notes: "",
    recipient_name: "",
    recipient_phone_code: "+225",
    recipient_phone_number: "",
  });

  const applyResult = useCallback((result: LoadResult) => {
    if (result.status === "ok") {
      setListing(result.listing);
      setLoadError(null);
      setLoadState("ready");
    } else if (result.status === "not_found") {
      setLoadState("not_found");
    } else {
      setLoadError({ message: result.message, offline: result.offline });
      setLoadState("error");
    }
  }, []);

  // Chargement côté navigateur uniquement si le rendu serveur n'a pas fourni l'annonce
  useEffect(() => {
    if (initialListing) return;
    let ignore = false;
    fetchListing(listingId).then((result) => {
      if (!ignore) applyResult(result);
    });
    return () => {
      ignore = true;
    };
  }, [initialListing, listingId, applyResult]);

  const retryLoad = () => {
    setLoadState("loading");
    setLoadError(null);
    void fetchListing(listingId).then(applyResult);
  };

  const closeConfirmModal = useCallback(() => {
    if (submitLockRef.current) return;
    setShowConfirmModal(false);
    setSubmitError(null);
  }, []);

  useEscapeKey(closeConfirmModal, showConfirmModal && !submitting);

  const pricePerKg = Number(listing?.price_per_kg) || 0;
  const availableKg = Number(listing?.available_kg) || 0;

  const cleanWeightStr = form.weight_kg.trim().replace(",", ".");
  const cleanDeclaredStr = form.declared_value.trim().replace(",", ".");

  const weightNum = parseFloat(cleanWeightStr) || 0;
  const declaredValNum = parseFloat(cleanDeclaredStr) || 0;

  const total = weightNum * pricePerKg;

  const isWeightExceeded = listing ? weightNum > availableKg : false;

  const isWeightInvalid =
    !form.weight_kg.trim() ||
    !isValidNumberFormat(form.weight_kg.trim()) ||
    isNaN(weightNum) ||
    weightNum <= 0 ||
    isWeightExceeded;

  const isDeclaredValInvalid =
    form.declared_value.trim() !== "" &&
    (!isValidNumberFormat(form.declared_value.trim()) || isNaN(declaredValNum) || declaredValNum < 0);

  const isSubmitDisabled =
    submitting ||
    isWeightInvalid ||
    !form.content_desc.trim() ||
    !form.recipient_name.trim() ||
    !form.recipient_phone_number.trim() ||
    isDeclaredValInvalid;

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isWeightExceeded) {
      setFormError(
        `Capacité insuffisante : le poids saisi (${weightNum} kg) dépasse la capacité restante du voyageur (${availableKg} kg disponibles).`,
      );
      return;
    }
    if (isWeightInvalid) {
      setFormError(`Le poids doit être un nombre valide entre 0.5 et ${availableKg || 10} kg`);
      return;
    }

    if (!form.content_desc.trim()) {
      setFormError("La description du contenu de votre colis est requise");
      return;
    }

    if (!form.recipient_name.trim()) {
      setFormError("Le nom et prénom du destinataire à l'arrivée sont requis");
      return;
    }

    if (!form.recipient_phone_number.trim()) {
      setFormError("Le numéro de téléphone du destinataire à l'arrivée est requis");
      return;
    }

    const recipientDigits = form.recipient_phone_number.replace(/\D/g, "");
    if (recipientDigits.length < 6) {
      setFormError("Le numéro de téléphone du destinataire doit contenir au moins 6 chiffres (sans lettres)");
      return;
    }

    if (isDeclaredValInvalid) {
      setFormError("La valeur déclarée doit être un nombre positif (ex: 80)");
      return;
    }

    setFormError(null);
    setSubmitError(null);
    setShowConfirmModal(true);
  };

  const confirmOrder = async () => {
    if (!listing || submitLockRef.current) return;
    if (!hasSession()) {
      setShowConfirmModal(false);
      router.push("/login");
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const safeDeclaredValue =
      form.declared_value.trim() !== "" && !isDeclaredValInvalid ? declaredValNum : 0;
    const fullRecipientPhone = `${form.recipient_phone_code} ${form.recipient_phone_number.trim()}`;

    try {
      // Même contenu en cas de nouvel essai : la clé d'idempotence d'authFetch évite un doublon
      // si la première tentative est arrivée au serveur malgré la coupure
      const response = await authFetch(`/api/gp/${encodeURIComponent(listing.id)}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight_kg: weightNum,
          content_desc: form.content_desc,
          declared_value: safeDeclaredValue,
          total_amount: total,
          notes: form.notes || null,
          recipient_name: form.recipient_name.trim(),
          recipient_phone: fullRecipientPhone,
          status: "pending",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSubmitError(
          response.status === 401
            ? "Votre session a expiré : reconnectez-vous pour envoyer votre demande."
            : errorMessage(data, "Erreur lors de l'envoi de la demande de réservation."),
        );
        return;
      }
      setShowConfirmModal(false);
      setSuccess(true);
    } catch (err) {
      setSubmitError(
        isNetworkError(err)
          ? err.message
          : "Votre demande n'a pas pu être envoyée. Vérifiez votre connexion puis réessayez.",
      );
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const setPresetWeight = (w: number) => {
    if (!listing) return;
    const capped = Math.min(w, availableKg);
    setForm({ ...form, weight_kg: capped.toString() });
  };

  if (loadState === "loading") {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-24 text-center" aria-busy="true">
        <div className="inline-block w-10 h-10 border-4 border-[#1D6B45] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 text-sm mt-4 font-semibold">
          Chargement des détails du vol...
        </p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center space-y-4" role="alert">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#D4870A] flex items-center justify-center mx-auto">
          {loadError?.offline ? <WifiOff size={30} /> : <AlertCircle size={30} />}
        </div>
        <h1 className="text-xl font-black text-slate-900">Impossible d&apos;afficher ce vol</h1>
        <p className="text-sm text-slate-500">{loadError?.message}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={retryLoad}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1D6B45] text-white rounded-xl text-xs font-bold hover:bg-[#154d31] cursor-pointer"
          >
            <RotateCcw size={14} /> Réessayer
          </button>
          <Link href="/gp" className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-[#1D6B45]">
            <ArrowLeft size={14} /> Retour aux annonces GP
          </Link>
        </div>
      </div>
    );
  }

  if (loadState === "not_found" || !listing) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-xl font-black text-slate-900">Trajet GP introuvable</h1>
        <p className="text-slate-500 text-base">
          Ce trajet n&apos;existe pas ou a été retiré par le voyageur.
        </p>
        <Link
          href="/gp"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1D6B45] text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft size={14} /> Retour aux annonces GP
        </Link>
      </div>
    );
  }

  const gpProfile = listing.gp || listing.profiles;
  const flightRef = `GP-${listing.id.slice(0, 6).toUpperCase()}`;

  if (success) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-16 text-center space-y-6" role="status">
        <div className="w-20 h-20 bg-emerald-100 text-[#1D6B45] rounded-3xl flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 size={44} />
        </div>
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#1D6B45]">
            Réservation n° {flightRef}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Demande de réservation transmise !
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            {gpProfile?.full_name || "Le voyageur"} a reçu votre demande. Convenez
            ensemble du rendez-vous de remise et du règlement, à effectuer
            directement auprès du voyageur.
          </p>
        </div>

        {/* Détails récapitulatifs */}
        <div className="bg-[#FAF7F2] rounded-3xl p-5 border border-amber-100 text-left max-w-md mx-auto text-xs space-y-2.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Trajet :</span>
            <span className="font-bold text-slate-900">
              {listing.departure_city} ➔ {listing.arrival_city}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Poids réservé :</span>
            <span className="font-bold text-slate-900">{form.weight_kg} kg</span>
          </div>
          <div className="flex justify-between border-t border-slate-200/80 pt-2 font-black text-sm">
            <span className="text-slate-800">Montant convenu :</span>
            <span className="text-[#1D6B45]">{total.toFixed(2)} € TTC</span>
          </div>
        </div>

        {gpProfile?.whatsapp && (
          <button
            type="button"
            onClick={() => {
              const waUrl = formatWhatsAppUrl(
                gpProfile.whatsapp,
                `Bonjour, je viens de faire une demande GP sur Dabari pour le vol ${listing.departure_city} → ${listing.arrival_city} (${form.weight_kg} kg).`,
              );
              if (waUrl) window.open(waUrl, "_blank", "noopener,noreferrer");
            }}
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold px-6 py-3.5 rounded-2xl text-sm shadow-md transition-all hover:scale-102 cursor-pointer"
          >
            <MessageSquare size={18} /> Contacter le voyageur sur WhatsApp
          </button>
        )}

        <div className="pt-4 flex items-center justify-center gap-4 text-xs font-bold">
          <Link
            href="/commandes"
            className="text-[#1D6B45] hover:underline flex items-center gap-1"
          >
            <span>Voir mes réservations</span>
            <ChevronRight size={14} />
          </Link>
          <span className="text-slate-300">•</span>
          <Link
            href="/gp"
            className="text-slate-500 hover:text-slate-700"
          >
            Retour aux annonces GP
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 pb-28">
      {/* ── FIL D'ARIANE ── */}
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link
          href="/gp"
          className="hover:text-[#1D6B45] transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={13} /> Tous les vols GP
        </Link>
        <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />
        <span className="text-slate-900 font-bold truncate" aria-current="page">
          {listing.departure_city} ➔ {listing.arrival_city}
        </span>
      </nav>

      {/* ── 1. HERO BANNER VOL GP FAÇON BOARDING PASS ── */}
      <section className="relative overflow-hidden rounded-3xl md:rounded-[36px] bg-gradient-to-br from-[#123825] via-[#1D6B45] to-[#8C5806] text-white shadow-xl shadow-[#1D6B45]/10 p-6 sm:p-10 md:p-12">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-[#D4870A]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/25">
                Vol certifié #{flightRef}
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  listing.flight_type === "direct"
                    ? "bg-emerald-400/25 text-emerald-200 border border-emerald-400/30"
                    : "bg-amber-400/25 text-amber-200 border border-amber-400/30"
                }`}
              >
                {listing.flight_type === "direct" ? "Vol direct" : "Vol avec escale"}
              </span>
              <span className="bg-white/10 text-white/90 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-300" />
                Paiement direct au voyageur
              </span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="flex items-center gap-2">
                  <CountryFlag country={listing.departure_country} size={26} />
                  <span>{listing.departure_city}</span>
                </span>
                <span className="text-amber-300" aria-hidden="true">➔</span>
                <span className="sr-only">vers</span>
                <span className="flex items-center gap-2">
                  <CountryFlag country={listing.arrival_country} size={26} />
                  <span>{listing.arrival_city}</span>
                </span>
              </h1>
            </div>

            <p className="text-white/85 text-xs sm:text-sm max-w-xl leading-relaxed flex items-center gap-2 flex-wrap">
              <Calendar size={15} className="text-emerald-300 shrink-0" />
              <span>
                Départ le <strong>{formatDate(listing.departure_date)}</strong>
              </span>
              {listing.arrival_date && (
                <span>
                  • Arrivée estimée le{" "}
                  <strong>{formatDate(listing.arrival_date)}</strong>
                </span>
              )}
            </p>
          </div>

          {/* Badge Tarif et Kilos disponibles */}
          <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-3xl p-5 sm:p-6 text-center shrink-0 self-stretch md:self-auto space-y-1">
            <span className="text-[11px] font-bold text-white/75 uppercase tracking-wider block">
              Capacité restante
            </span>
            <div className="text-3xl sm:text-4xl font-black text-white">
              {listing.available_kg}{" "}
              <span className="text-lg font-semibold text-white/80">kg</span>
            </div>
            <div className="text-sm font-extrabold text-amber-300 pt-1.5 border-t border-white/15 flex items-center justify-center gap-1">
              <span>{pricePerKg.toFixed(2)} €</span>
              <span className="text-xs text-white/80">/ kg</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── ALERTE RETARD SI LE VOL A ÉTÉ DÉCALÉ ── */}
      {listing.is_delayed && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#D4870A] flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div className="space-y-1">
            <h2 className="font-black text-amber-950 text-base">
              Arrivée décalée signalée par le voyageur
            </h2>
            <p className="text-xs text-amber-900 leading-relaxed">
              Nouvelle date d&apos;arrivée prévue le :{" "}
              <strong>
                {listing.arrival_date ? formatDate(listing.arrival_date) : "À confirmer"}
              </strong>
            </p>
            {listing.delay_reason && (
              <p className="text-xs text-amber-800 italic pt-1">
                Motif communiqué : {listing.delay_reason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 2. DESKTOP SPLIT EN 2 COLONNES (DÉTAILS / RÉSERVATION STICKY) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── COLONNE GAUCHE : DÉTAILS VOL & VOYAGEUR ── */}
        <section className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Fiche Voyageur Certifié */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1D6B45] to-[#145033] text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-xs">
                  {gpProfile?.full_name?.charAt(0).toUpperCase() || "V"}
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                    {gpProfile?.full_name || "Voyageur Partenaire"}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1D6B45] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 size={13} />
                      <span>Identité & Billet vérifiés</span>
                    </span>
                    {Number(listing.review_count) > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        <span>
                          {listing.rating} ({listing.review_count} avis)
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        Nouveau voyageur certifié
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {gpProfile?.whatsapp && (
                <button
                  type="button"
                  onClick={() => {
                    const waUrl = formatWhatsAppUrl(
                      gpProfile.whatsapp,
                      `Bonjour ${gpProfile.full_name || ""}, je vous contacte à propos de votre vol GP Dabari ${listing.departure_city} → ${listing.arrival_city}`,
                    );
                    if (waUrl) window.open(waUrl, "_blank", "noopener,noreferrer");
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all hover:scale-102 shrink-0 cursor-pointer"
                >
                  <MessageSquare size={16} /> WhatsApp Direct
                </button>
              )}
            </div>

            {/* Consignes du voyageur */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Consignes du voyageur
              </h3>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-100 font-medium">
                {listing.description ||
                  "Aucune consigne particulière. Colis inspectés ensemble avant départ pour respecter les règles douanières et aériennes."}
              </p>
            </div>
          </div>

          {/* Dépôt & Récupération */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
            <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Package size={18} className="text-[#1D6B45]" />
              <span>Modalités de remise et retrait</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dépôt */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[11px] font-black text-[#1D6B45] uppercase tracking-wider flex items-center gap-1.5">
                  <PlaneTakeoff size={14} /> Dépôt avant le départ
                </span>
                <p className="text-xs font-bold text-slate-900">
                  Départ : {formatDate(listing.departure_date)}
                </p>
                {listing.pickup_city && (
                  <p className="text-xs text-slate-600 flex items-start gap-1.5">
                    <MapPin size={13} className="text-[#1D6B45] shrink-0 mt-0.5" />
                    <span>
                      Zone : <strong>{listing.pickup_city}</strong>
                    </span>
                  </p>
                )}
                {listing.pickup_address && (
                  <p className="text-xs text-slate-500 flex items-start gap-1.5">
                    <Home size={13} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{listing.pickup_address}</span>
                  </p>
                )}
              </div>

              {/* Récupération */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[11px] font-black text-[#D4870A] uppercase tracking-wider flex items-center gap-1.5">
                  <PlaneLanding size={14} /> Retrait à destination
                </span>
                <p className="text-xs font-bold text-slate-900">
                  Arrivée :{" "}
                  {listing.arrival_date ? formatDate(listing.arrival_date) : "À confirmer"}
                </p>
                {listing.dropoff_city && (
                  <p className="text-xs text-slate-600 flex items-start gap-1.5">
                    <MapPin size={13} className="text-[#D4870A] shrink-0 mt-0.5" />
                    <span>
                      Zone : <strong>{listing.dropoff_city}</strong>
                    </span>
                  </p>
                )}
                {listing.dropoff_address && (
                  <p className="text-xs text-slate-500 flex items-start gap-1.5">
                    <Home size={13} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{listing.dropoff_address}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── ACCORDÉON OBJETS AUTORISÉS VS INTERDITS (IATA) ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2>
              <button
                type="button"
                onClick={() => setShowSecurityAccordion(!showSecurityAccordion)}
                aria-expanded={showSecurityAccordion}
                aria-controls="guide-colis"
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-amber-50 text-[#D4870A] flex items-center justify-center shrink-0">
                    <Luggage size={20} />
                  </span>
                  <span>
                    <span className="block font-extrabold text-slate-900 text-sm sm:text-base">
                      Guide des colis : Objets autorisés & interdits
                    </span>
                    <span className="block text-xs text-slate-500 font-normal">
                      Conformité stricte aux réglementations douanières et IATA
                    </span>
                  </span>
                </span>
                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  {showSecurityAccordion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>
            </h2>

            {showSecurityAccordion && (
              <div
                id="guide-colis"
                className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in duration-200"
              >
                {/* Autorisés */}
                <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100 space-y-2.5">
                  <div className="flex items-center gap-2 text-[#1D6B45] font-extrabold">
                    <CheckCircle2 size={16} />
                    <span>Objets acceptés & recommandés</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-700">
                    {AUTHORIZED_ITEMS.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check size={13} className="text-[#1D6B45] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Interdits */}
                <div className="bg-rose-50/60 rounded-2xl p-4 border border-rose-100 space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-700 font-extrabold">
                    <Ban size={16} />
                    <span>Strictement interdit</span>
                  </div>
                  <ul className="space-y-1.5 text-slate-700">
                    {PROHIBITED_ITEMS.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <AlertTriangle size={13} className="text-rose-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Déroulement d'un envoi en 4 étapes */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#1D6B45]" />
              <span>Comment se déroule un envoi ?</span>
            </h2>

            <ol className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <li className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-[#1D6B45] text-white font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <p className="font-bold text-slate-900">Réservation en ligne</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Vous réservez vos kilos et le voyageur valide votre demande.
                </p>
              </li>

              <li className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-[#1D6B45] text-white font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <p className="font-bold text-slate-900">Inspection conjointe</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Remise et vérification physique du contenu avant le départ.
                </p>
              </li>

              <li className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-[#1D6B45] text-white font-bold flex items-center justify-center text-xs">
                  3
                </span>
                <p className="font-bold text-slate-900">Acheminement aérien</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Le voyageur transporte votre colis en soute ou cabine.
                </p>
              </li>

              <li className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-[#1D6B45] text-white font-bold flex items-center justify-center text-xs">
                  4
                </span>
                <p className="font-bold text-slate-900">Remise & Règlement</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Le destinataire récupère le colis ; le règlement se fait directement avec le voyageur.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* ── COLONNE DROITE : RÉSERVATION STICKY ── */}
        <aside className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-lg space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-black text-slate-900 text-lg">
                  Réserver des kilos
                </h2>
                <p className="text-xs text-slate-500">
                  Validation directe par le voyageur
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">
                  Tarif
                </span>
                <span className="text-xl font-black text-[#1D6B45]">
                  {pricePerKg.toFixed(2)} €
                </span>
                <span className="text-[10px] text-slate-400">/kg</span>
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 font-medium"
              >
                <AlertTriangle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form
              id="gp-reservation-form"
              onSubmit={handlePreSubmit}
              className="space-y-4"
            >
              {/* Sélecteur de Poids avec slider et boutons rapides */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="gp-weight" className="text-xs font-bold text-slate-700">
                    Poids à expédier *
                  </label>
                  <span className="text-xs font-extrabold text-[#1D6B45]">
                    {weightNum} kg / {availableKg} kg libres
                  </span>
                </div>

                {/* Slider interactif */}
                <input
                  type="range"
                  min="0.5"
                  max={availableKg}
                  step="0.5"
                  value={weightNum || 1}
                  aria-label="Poids à expédier (curseur)"
                  onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  className="w-full accent-[#1D6B45] cursor-pointer mb-2"
                />

                {/* Boutons presets */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[1, 2, 3, 5, 10].map((kg) => {
                    if (kg > availableKg) return null;
                    const isSelected = weightNum === kg;
                    return (
                      <button
                        key={kg}
                        type="button"
                        onClick={() => setPresetWeight(kg)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#1D6B45] text-white border-[#1D6B45]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50"
                        }`}
                      >
                        {kg} kg
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setPresetWeight(availableKg)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-[#D4870A] font-bold hover:bg-amber-100 transition-all cursor-pointer"
                  >
                    Max ({availableKg} kg)
                  </button>
                </div>

                <input
                  id="gp-weight"
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  placeholder={`Ex: 3 (max ${availableKg} kg)`}
                  value={form.weight_kg}
                  onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    isWeightExceeded
                      ? "border-red-400 bg-red-50/40 text-red-700 focus:border-red-500"
                      : "border-slate-200 focus:border-[#1D6B45]"
                  } focus:outline-hidden`}
                />

                {/* Message d'erreur visible si le poids dépasse la capacité */}
                {isWeightExceeded && (
                  <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2 animate-in fade-in duration-150">
                    <AlertCircle size={15} className="shrink-0 text-red-600" />
                    <span>
                      Capacité insuffisante : vous demandez <strong>{weightNum} kg</strong> alors qu&apos;il ne reste que <strong>{availableKg} kg</strong> disponibles chez ce voyageur.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="gp-content" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nature exacte du contenu *
                </label>
                <input
                  id="gp-content"
                  type="text"
                  required
                  placeholder="Ex: Vêtements traditionnels, sachets de bissap..."
                  value={form.content_desc}
                  onChange={(e) => setForm({ ...form, content_desc: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm font-medium"
                />
              </div>

              {/* Destinataire à l'arrivée */}
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-slate-200/90 space-y-3">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-[#1D6B45]" />
                  <span className="text-xs font-black text-slate-800">
                    Destinataire à l&apos;arrivée *
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Personne qui récupérera le colis à l&apos;arrivée ({listing.arrival_city}).
                </p>

                <div>
                  <label htmlFor="gp-recipient-name" className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nom & Prénom du destinataire *
                  </label>
                  <input
                    id="gp-recipient-name"
                    type="text"
                    required
                    placeholder="Ex: Amadou Diallo"
                    value={form.recipient_name}
                    onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-[#1D6B45] focus:outline-hidden text-xs font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="gp-recipient-phone" className="block text-[11px] font-bold text-slate-700 mb-1">
                    Téléphone du destinataire *
                  </label>
                  <div className="flex gap-2">
                    <CountryDialPicker
                      value={form.recipient_phone_code}
                      onChange={(code) => setForm({ ...form, recipient_phone_code: code })}
                    />
                    <input
                      id="gp-recipient-phone"
                      type="tel"
                      inputMode="numeric"
                      required
                      placeholder="Ex: 07 12 34 56 78"
                      value={form.recipient_phone_number}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^0-9\s]/g, "");
                        setForm({ ...form, recipient_phone_number: clean });
                      }}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:border-[#1D6B45] focus:outline-hidden text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="gp-declared-value" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Valeur estimée du contenu (€)
                  <span className="text-slate-400 font-normal ml-1">(facultatif)</span>
                </label>
                <input
                  id="gp-declared-value"
                  type="number"
                  min="0"
                  placeholder="Ex: 80"
                  value={form.declared_value}
                  onChange={(e) => setForm({ ...form, declared_value: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm font-medium"
                />
              </div>

              <div>
                <label htmlFor="gp-notes" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Instructions ou notes pour le voyageur
                  <span className="text-slate-400 font-normal ml-1">(facultatif)</span>
                </label>
                <textarea
                  id="gp-notes"
                  rows={2}
                  placeholder="Ex: Disponible pour déposer le colis à Paris 18e en soirée..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-xs leading-relaxed font-medium resize-none"
                />
              </div>

              {/* Calcul du total en direct */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Calcul estimé :</span>
                  <span>
                    {weightNum} kg × {pricePerKg.toFixed(2)} €
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="font-extrabold text-slate-800 text-sm">
                    Total estimé
                  </span>
                  <span className="text-2xl font-black text-[#1D6B45]">
                    {total.toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* Bouton de confirmation principal Desktop */}
              {isLoggedIn ? (
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="w-full bg-[#1D6B45] hover:bg-[#154d31] disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-black shadow-md flex items-center justify-center gap-2 transition-all hover:scale-101 cursor-pointer"
                >
                  <Package size={16} />
                  <span>Envoyer ma demande ({total.toFixed(2)} €)</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="w-full bg-slate-900 hover:bg-black text-white py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Lock size={15} />
                  <span>Connectez-vous pour réserver</span>
                </Link>
              )}
            </form>
          </div>
        </aside>
      </div>

      {/* ── BARRE FLOTTANTE MOBILE ── */}
      <div className="fixed bottom-above-nav inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 z-40 lg:hidden shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">
              Total ({weightNum} kg)
            </span>
            <span className="text-xl font-black text-[#1D6B45]">
              {total.toFixed(2)} €
            </span>
          </div>
          {isLoggedIn ? (
            <button
              type="submit"
              form="gp-reservation-form"
              disabled={isSubmitDisabled}
              className="flex-1 max-w-[220px] bg-[#1D6B45] text-white py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm hover:bg-[#155235] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-center cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Package size={16} />
              <span>Réserver ({total.toFixed(2)} €)</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex-1 max-w-[220px] bg-slate-900 text-white py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm shadow-md text-center cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Lock size={15} />
              <span>Se connecter</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── MODALE DE CONFIRMATION DE RÉSERVATION ── */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gp-confirm-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeConfirmModal();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="w-14 h-14 bg-emerald-100 text-[#1D6B45] rounded-2xl flex items-center justify-center shadow-xs">
              <Package size={28} />
            </div>

            <div className="space-y-1">
              <h2 id="gp-confirm-title" className="font-extrabold text-slate-900 text-xl">
                Confirmer la demande de réservation
              </h2>
              <p className="text-xs text-slate-500">
                Vol : {listing.departure_city} ➔ {listing.arrival_city} ({flightRef})
              </p>
            </div>

            <div className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-slate-200/80 text-xs space-y-2.5 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Poids réservé :</span>
                <strong className="text-slate-900">{form.weight_kg} kg</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contenu déclaré :</span>
                <strong className="text-slate-900 truncate max-w-[180px]">
                  {form.content_desc}
                </strong>
              </div>
              {form.recipient_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Destinataire :</span>
                  <strong className="text-slate-900 truncate max-w-[200px]">
                    {form.recipient_name} ({form.recipient_phone_code} {form.recipient_phone_number})
                  </strong>
                </div>
              )}
              {form.declared_value && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Valeur déclarée :</span>
                  <span className="font-semibold text-slate-800">
                    {form.declared_value} €
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
                <span className="text-slate-800">Montant estimé :</span>
                <span className="text-[#1D6B45]">{total.toFixed(2)} €</span>
              </div>
            </div>

            {/* Erreur d'envoi affichée dans la modale, au premier plan */}
            {submitError && (
              <div
                role="alert"
                className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 font-medium"
              >
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>
                  {submitError}
                  {!isLoggedIn && (
                    <>
                      {" "}
                      <Link href="/login" className="font-bold underline">
                        Se connecter
                      </Link>
                    </>
                  )}
                </span>
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Aucun paiement n&apos;est effectué sur Dabari : vous réglez le voyageur
              directement. Il est notifié immédiatement pour convenir du rendez-vous
              d&apos;inspection et de remise.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={submitting}
                className="flex-1 py-3.5 rounded-2xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={confirmOrder}
                disabled={submitting}
                aria-busy={submitting}
                className="flex-1 py-3.5 rounded-2xl text-xs font-bold bg-[#1D6B45] text-white hover:bg-[#154d31] transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
              >
                {submitting ? "Transmission..." : submitError ? "Réessayer" : "Confirmer et réserver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
