"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  MessageSquare,
  User,
  MapPin,
  Lock,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Package,
  Home,
  Calendar,
  AlertTriangle,
  Phone,
} from "lucide-react";
import { getFlag } from "@/lib/types/gp";
import { getValidToken, authFetch } from "@/lib/auth";
import { formatWhatsAppUrl } from "@/lib/types/traiteur";

type GpListing = {
  id: string;
  gp_id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  arrival_date: string | null;
  available_kg: number;
  price_per_kg: number;
  description: string | null;
  flight_type: string | null;
  pickup_city: string | null;
  pickup_address: string | null;
  dropoff_city: string | null;
  dropoff_address: string | null;
  is_delayed?: boolean | null;
  delay_reason?: string | null;
  is_active: boolean;
  rating: number;
  review_count: number;
  gp?: {
    full_name: string;
    phone: string | null;
    whatsapp: string | null;
  } | null;
  profiles?: {
    full_name: string;
    phone: string | null;
    whatsapp: string | null;
  } | null;
};

type GpRequest = {
  id: string;
  weight_kg: number;
  content_desc: string;
  declared_value: number;
  total_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
};

export default function GpDetailPage() {
  const { listingId } = useParams();
  const router = useRouter();

  const [listing, setListing] = useState<GpListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    weight_kg: "",
    content_desc: "",
    declared_value: "",
    notes: "",
  });

  useEffect(() => {
    const load = async () => {
      const token = getValidToken();
      if (token) {
        setIsLoggedIn(true);
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/gp/${listingId}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        const data = await response.json();
        if (!response.ok) {
          setError(data.message || "Erreur lors du chargement du GP");
          return;
        }
        setListing(data.data?.gp || null);
      } catch (e: any) {
        setError(e.message || "Erreur de connexion au serveur");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [listingId]);

  const total = listing
    ? parseFloat(form.weight_kg || "0") * listing.price_per_kg
    : 0;

  const cleanWeightStr = form.weight_kg.trim().replace(",", ".");
  const cleanDeclaredStr = form.declared_value.trim().replace(",", ".");

  const weightNum = parseFloat(cleanWeightStr);
  const declaredValNum = parseFloat(cleanDeclaredStr);

  const isValidNumberFormat = (str: string) => /^\d+([.,]\d+)?$/.test(str);

  const isWeightInvalid =
    !form.weight_kg.trim() ||
    !isValidNumberFormat(form.weight_kg.trim()) ||
    isNaN(weightNum) ||
    weightNum <= 0;

  const isDeclaredValInvalid =
    form.declared_value.trim() !== "" &&
    (!isValidNumberFormat(form.declared_value.trim()) ||
      isNaN(declaredValNum) ||
      declaredValNum < 0);

  const isSubmitDisabled =
    submitting ||
    isWeightInvalid ||
    !form.content_desc.trim() ||
    isDeclaredValInvalid;

  const handlePreSubmit = async () => {
    if (isWeightInvalid) {
      setError("Le poids doit être un nombre valide supérieur à 0 (ex: 2.5)");
      return;
    }

    if (!form.content_desc.trim()) {
      setError("La description du contenu est requise");
      return;
    }

    if (isDeclaredValInvalid) {
      setError(
        "La valeur déclarée doit être un nombre positif valide (ex: 100)",
      );
      return;
    }

    setShowConfirmModal(true);
    setError(null);
  };
  const confirmOrder = async () => {
    setSubmitting(true);
    const token = getValidToken();
    if (!token) {
      router.push("/login");
      setSubmitting(false);
      return;
    }

    const safeDeclaredValue =
      form.declared_value.trim() !== "" && !isDeclaredValInvalid
        ? declaredValNum
        : 0;

    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/gp/${listingId}/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            weight_kg: weightNum,
            content_desc: form.content_desc,
            declared_value: safeDeclaredValue,
            total_amount: total,
            notes: form.notes || null,
            status: "pending",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || data.error || "Erreur lors de l'envoi de la commande");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  if (loading)
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-[#1D6B45]">Chargement...</div>
      </div>
    );

  if (!listing)
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-gray-500">Annonce introuvable</div>
      </div>
    );

  if (success)
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-4">
            <CheckCircle2 size={64} className="text-[#1D6B45]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1D6B45] mb-2">
            Demande envoyée !
          </h2>
          <p className="text-gray-500 mb-6">
            {listing.gp?.full_name || listing.profiles?.full_name || "Le GP"} a
            reçu ta demande et va te contacter rapidement.
          </p>
          {(listing.gp?.whatsapp || listing.profiles?.whatsapp) && (
            <button
              onClick={() => {
                const waUrl = formatWhatsAppUrl(
                  listing.gp?.whatsapp || listing.profiles?.whatsapp,
                  `Bonjour, je viens d'envoyer une demande de colis sur Dabari. ${form.weight_kg}kg — ${form.content_desc}`
                );
                if (waUrl) window.open(waUrl, "_blank");
              }}
              className="w-full bg-[#25D366] text-white py-3 rounded-2xl font-semibold text-sm hover:bg-[#1da851] transition-colors flex items-center justify-center gap-2 mb-4 cursor-pointer"
            >
              <MessageSquare size={16} className="inline mr-2" /> Contacter le
              GP sur WhatsApp
            </button>
          )}
          <Link
            href="/commandes"
            className="text-[#1D6B45] font-medium hover:underline text-sm block mb-2"
          >
            Voir mes commandes →
          </Link>
          <Link href="/gp" className="text-gray-600 text-sm hover:underline">
            Retour aux annonces
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-32">
      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-8">
        <Link href="/gp" className="text-white/70 text-sm mb-4 inline-block">
          ← Retour
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              {getFlag(listing.departure_country)} {listing.departure_city} →{" "}
              {getFlag(listing.arrival_country)} {listing.arrival_city}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-white/80 text-xs">
              <span className="flex items-center">
                <PlaneTakeoff size={14} className="inline mr-1" /> Départ :{" "}
                {formatDate(listing.departure_date)}
              </span>
              {listing.arrival_date && (
                <span className="flex items-center">
                  <PlaneLanding size={14} className="inline mr-1" /> Arrivée :{" "}
                  {formatDate(listing.arrival_date)}
                </span>
              )}
            </div>
          </div>
          {listing.flight_type && (
            <span
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                listing.flight_type === "direct"
                  ? "bg-white/20 text-white"
                  : "bg-[#D4870A]/30 text-yellow-200"
              }`}
            >
              {listing.flight_type === "direct" ? "Vol Direct" : "Avec Escale"}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {/* Alerte si le vol a été décalé */}
        {listing.is_delayed && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-[#D4870A] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-950">Arrivée retardée par le voyageur</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Nouvelle date d&apos;arrivée estimée :{" "}
                <strong>{listing.arrival_date ? formatDate(listing.arrival_date) : "Non précisée"}</strong>
              </p>
              {listing.delay_reason && (
                <p className="text-xs text-amber-700 mt-1 italic leading-relaxed">
                  Motif : {listing.delay_reason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Infos GP */}
        {(() => {
          const gpProfile = listing.gp || listing.profiles;
          return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-800 mb-4">
                <User size={16} className="inline mr-1 text-[#1D6B45]" /> À
                propos du GP
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#1D6B45] text-xl font-bold">
                  {gpProfile?.full_name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {gpProfile?.full_name || "GP Anonyme"}
                  </p>
                  {gpProfile?.phone && (
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center">
                      <Phone size={13} className="mr-1.5 text-[#1D6B45] shrink-0" />{" "}
                      {gpProfile.phone}
                    </p>
                  )}
                  {listing.review_count > 0 && (
                    <p className="text-sm text-yellow-500 mt-0.5">
                      ★ {listing.rating} ({listing.review_count} avis)
                    </p>
                  )}
                </div>
                {gpProfile?.whatsapp && (
                  <button
                    onClick={() => {
                      const waUrl = formatWhatsAppUrl(
                        gpProfile.whatsapp,
                        `Bonjour, j'ai vu votre annonce GP sur Dabari pour ${listing.departure_city} → ${listing.arrival_city}`
                      );
                      if (waUrl) window.open(waUrl, "_blank");
                    }}
                    className="bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1da851] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    💬 WhatsApp
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* Détails annonce */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center">
            <Package size={16} className="inline mr-1 text-[#1D6B45]" /> Détails de
            l&apos;annonce
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Kg disponibles</p>
              <p className="text-2xl font-bold text-[#1D6B45]">
                {listing.available_kg}
              </p>
              <p className="text-xs text-gray-600">kg</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Prix</p>
              <p className="text-2xl font-bold text-[#1D6B45]">
                {listing.price_per_kg}
              </p>
              <p className="text-xs text-gray-600">€/kg</p>
            </div>
          </div>

          {/* Dépôt & Récupération cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Dépôt */}
            <div className="p-3.5 bg-[#F9FAFB] rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1D6B45] uppercase tracking-wider mb-2">
                <PlaneTakeoff size={14} />
                <span>Départ & Dépôt</span>
              </div>
              <p className="text-xs text-gray-700 mb-1">
                <strong>Date de départ :</strong> {formatDate(listing.departure_date)}
              </p>
              {listing.pickup_city && (
                <p className="text-xs text-gray-600 mb-1 flex items-start gap-1">
                  <MapPin size={13} className="text-[#1D6B45] shrink-0 mt-0.5" />
                  <span><strong>Zone :</strong> {listing.pickup_city}</span>
                </p>
              )}
              {listing.pickup_address && (
                <p className="text-xs text-gray-500 flex items-start gap-1">
                  <Home size={13} className="text-gray-400 shrink-0 mt-0.5" />
                  <span><strong>Adresse :</strong> {listing.pickup_address}</span>
                </p>
              )}
            </div>

            {/* Récupération */}
            <div className="p-3.5 bg-[#F9FAFB] rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#D4870A] uppercase tracking-wider mb-2">
                <PlaneLanding size={14} />
                <span>Arrivée & Récupération</span>
              </div>
              <p className="text-xs text-gray-700 mb-1">
                <strong>Date d'arrivée :</strong> {listing.arrival_date ? formatDate(listing.arrival_date) : "Non précisée"}
              </p>
              {listing.dropoff_city && (
                <p className="text-xs text-gray-600 mb-1 flex items-start gap-1">
                  <MapPin size={13} className="text-[#D4870A] shrink-0 mt-0.5" />
                  <span><strong>Zone :</strong> {listing.dropoff_city}</span>
                </p>
              )}
              {listing.dropoff_address && (
                <p className="text-xs text-gray-500 flex items-start gap-1">
                  <Home size={13} className="text-gray-400 shrink-0 mt-0.5" />
                  <span><strong>Adresse :</strong> {listing.dropoff_address}</span>
                </p>
              )}
            </div>
          </div>

          {listing.description && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">{listing.description}</p>
            </div>
          )}
        </div>

        {/* Formulaire demande */}
        {isLoggedIn ? (
          !showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-semibold text-sm hover:bg-[#0F4A30] transition-colors"
            >
              Envoyer un colis avec ce GP
            </button>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Ma demande</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-600 hover:text-gray-600 text-xl leading-none"
                >
                  &#x2715;
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poids du colis (kg) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.weight_kg}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, weight_kg: e.target.value }))
                  }
                  placeholder={`Max ${listing.available_kg} kg`}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description du contenu *
                </label>
                <textarea
                  rows={2}
                  value={form.content_desc}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, content_desc: e.target.value }))
                  }
                  placeholder="Ex: vêtements, chaussures, médicaments..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur déclarée (€)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.declared_value}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, declared_value: e.target.value }))
                  }
                  placeholder="Ex: 100"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Instructions particulières, fragile..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
                />
              </div>

              {/* Total */}
              {form.weight_kg && (
                <div className="bg-[#E8F5E9] rounded-xl p-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-[#1D6B45]">
                    Total estimé
                  </span>
                  <span className="text-xl font-bold text-[#1D6B45]">
                    {total.toFixed(2)} €
                  </span>
                </div>
              )}

              <button
                onClick={handlePreSubmit}
                disabled={isSubmitDisabled}
                className="w-full bg-[#1D6B45] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#0F4A30] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Envoi..." : "Envoyer ma demande"}
              </button>
            </div>
          )
        ) : (
          <Link href="/login" className="block">
            <div className="w-full bg-gray-100 border-2 border-dashed border-[#1D6B45]/30 rounded-2xl py-5 px-4 text-center hover:bg-[#1D6B45]/5 hover:border-[#1D6B45]/60 transition-all group">
              <div className="flex justify-center mb-2">
                <Lock size={24} className="text-[#1D6B45]" />
              </div>
              <p className="font-semibold text-[#1D6B45] text-sm group-hover:underline">
                Se connecter pour envoyer un colis
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Connectez-vous pour passer votre demande
              </p>
            </div>
          </Link>
        )}
      </div>
      {/* Pop-up (Modale) de confirmation */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowConfirmModal(false);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Confirmer l&apos;envoi
            </h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Voulez-vous envoyer cette demande pour{" "}
              <span className="font-bold text-gray-900">{form.weight_kg} kg</span> d&apos;un
              montant estimé à{" "}
              <span className="font-bold text-[#1D6B45]">
                {total.toFixed(2)} €
              </span>{" "}
              ?
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmOrder}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-[#1D6B45] text-white font-bold text-sm hover:bg-[#0F4A30] transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {submitting ? "Envoi..." : "Oui, envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
