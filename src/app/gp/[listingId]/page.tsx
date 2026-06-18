"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { CheckCircle2, MessageSquare, User, MapPin, Lock, Plane, Smartphone, Package, Home } from "lucide-react";
import { getFlag } from "@/lib/api/gp";

type GpListing = {
  id: string;
  gp_id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  available_kg: number;
  price_per_kg: number;
  description: string | null;
  flight_type: string | null;
  pickup_city: string | null;
  pickup_address: string | null;
  is_active: boolean;
  rating: number;
  review_count: number;
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
  const supabase = createClient();

  const [listing, setListing] = useState<GpListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if(session){
        setIsLoggedIn(true);
      }
      const { data } = await supabase
        .from("gp_listings")
        .select("*, profiles(full_name, phone, whatsapp)")
        .eq("id", listingId as string)
        .single();
        setListing(data);
        setLoading(false);
    };
    load();
  }, [listingId]);

  const total = listing
    ? parseFloat(form.weight_kg || "0") * listing.price_per_kg
    : 0;

  const handleSubmit = async () => {
    if (!form.weight_kg || !form.content_desc) {
      setError("Poids et description requis");
      return;
    }

    if (parseFloat(form.weight_kg) <= 0) {
      setError("Le poids doit être supérieur à 0");
      return;
    }

    if (form.declared_value && parseFloat(form.declared_value) < 0) {
      setError("La valeur déclarée ne peut pas être négative");
      return;
    }
    setSubmitting(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const { error: insertError } = await supabase.from("gp_requests").insert({
      listing_id: listingId,
      sender_id: session.user.id,
      weight_kg: parseFloat(form.weight_kg),
      content_desc: form.content_desc,
      declared_value: parseFloat(form.declared_value || "0"),
      total_amount: total,
      notes: form.notes || null,
      status: "pending",
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Notifie le GP
    const { data: gpProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", listing!.gp_id)
      .single();

    if (gpProfile) {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: gpProfile.id,
          type: "nouvelle_demande_colis",
          titre: "📦 Nouvelle demande de colis !",
          message: `${form.weight_kg}kg — ${form.content_desc} — ${total.toFixed(2)}€`,
          data: { listing_id: listingId },
        }),
      });
    }

    setSuccess(true);
    setSubmitting(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  if (loading)
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-[#1D6B45]">Chargement...</div>
      </div>
    );

  if (!listing)
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-gray-500">Annonce introuvable</div>
      </div>
    );

  if (success)
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-4"><CheckCircle2 size={64} className="text-[#1D6B45]" /></div>
          <h2 className="text-2xl font-bold text-[#1D6B45] mb-2">
            Demande envoyée !
          </h2>
          <p className="text-gray-500 mb-6">
            {listing.profiles?.full_name || "Le GP"} a reçu ta demande et va te
            contacter rapidement.
          </p>
          {listing.profiles?.whatsapp && (
            <button
              onClick={() => {
                const num = listing
                  .profiles!.whatsapp!.replace(/\+/g, "")
                  .replace(/\s/g, "");
                const msg = encodeURIComponent(
                  `Bonjour, je viens d'envoyer une demande de colis sur AfriConnect. ${form.weight_kg}kg — ${form.content_desc}`,
                );
                window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
              }}
              className="w-full bg-[#25D366] text-white py-3 rounded-2xl font-semibold text-sm hover:bg-[#1da851] transition-colors flex items-center justify-center gap-2 mb-4"
            >
              <MessageSquare size={16} className="inline mr-2" /> Contacter le GP sur WhatsApp
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
    <div className="min-h-screen bg-[#FAF7F2] pb-32">
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
            <p className="text-white/70 text-sm mt-1 flex items-center">
              <Plane size={16} className="inline mr-1" /> Départ le {formatDate(listing.departure_date)}
            </p>
          </div>
          {listing.flight_type && (
            <span
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                listing.flight_type === "direct"
                  ? "bg-white/20 text-white"
                  : "bg-[#D4870A]/30 text-yellow-200"
              }`}
            >
              {listing.flight_type === "direct" ? "Direct" : "Escale"}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {/* Infos GP */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">
            <User size={16} className="inline mr-1 text-[#1D6B45]" /> À propos du GP
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#1D6B45] text-xl font-bold">
              {listing.profiles?.full_name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">
                {listing.profiles?.full_name || "GP Anonyme"}
              </p>
              {listing.profiles?.phone && (
                <p className="text-sm text-gray-500 mt-0.5 flex items-center">
                  <Smartphone size={16} className="inline mr-1" /> {listing.profiles.phone}
                </p>
              )}
              {listing.review_count > 0 && (
                <p className="text-sm text-yellow-500 mt-0.5">
                  ★ {listing.rating} ({listing.review_count} avis)
                </p>
              )}
            </div>
            {listing.profiles?.whatsapp && (
              <button
                onClick={() => {
                  const num = listing
                    .profiles!.whatsapp!.replace(/\+/g, "")
                    .replace(/\s/g, "");
                  const msg = encodeURIComponent(
                    `Bonjour, j'ai vu votre annonce GP sur AfriConnect pour ${listing.departure_city} → ${listing.arrival_city}`,
                  );
                  window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
                }}
                className="bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1da851] transition-colors flex items-center gap-2"
              >
                💬 WhatsApp
              </button>
            )}
          </div>
        </div>

        {/* Détails annonce */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center">
            <Package size={16} className="inline mr-1" /> Détails de l&apos;annonce
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

          {listing.pickup_city && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={16} className="text-[#1D6B45] inline mr-1" />
              <span>Remise des colis à {listing.pickup_city}</span>
            </div>
          )}
          {listing.pickup_address && (
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <Home size={16} className="text-[#1D6B45]" />
              <span>{listing.pickup_address}</span>
            </div>
          )}
          {listing.description && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
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
                type="number"
                step="0.1"
                min="0.1"
                max={listing.available_kg}
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
                type="number"
                min="0"
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
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#1D6B45] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#0F4A30] transition-colors disabled:opacity-60"
            >
              {submitting ? "Envoi..." : "Envoyer ma demande"}
            </button>
          </div>
          )
        ) : (
          <Link href="/login" className="block">
            <div className="w-full bg-gray-100 border-2 border-dashed border-[#1D6B45]/30 rounded-2xl py-5 px-4 text-center hover:bg-[#1D6B45]/5 hover:border-[#1D6B45]/60 transition-all group">
              <div className="flex justify-center mb-2"><Lock size={24} className="text-[#1D6B45]" /></div>
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
    </div>
  );
}
