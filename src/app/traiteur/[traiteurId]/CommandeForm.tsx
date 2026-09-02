"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  MessageSquare,
  Lock,
  Calendar,
  ChevronRight,
  LogIn,
  X,
} from "lucide-react";
import cookies from "js-cookie";
import AddressAutocomplete from "@/components/AddressAutocomplete";

type Props = {
  traiteurId: string;
  traiteurName: string;
  whatsapp?: string | null;
};

type FormState = {
  date_evenement: string;
  nb_personnes: string;
  adresse: string;
  type_evenement: string;
  notes: string;
};

const TYPES = [
  "Mariage",
  "Anniversaire",
  "Baptême",
  "Séminaire",
  "Soirée privée",
  "Autre",
];

export default function CommandeForm({
  traiteurId,
  traiteurName,
  whatsapp,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    date_evenement: "",
    nb_personnes: "",
    adresse: "",
    type_evenement: "Mariage",
    notes: "",
  });

  useEffect(() => {
    const load = async () => {
      const token = cookies.get("token");
      if (token) {
        setIsLoggedIn(true);
      }
    };
    load();
  }, []);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreSubmit = async () => {
    if (!form.date_evenement || !form.nb_personnes || !form.adresse) {
      setError("Merci de remplir les champs obligatoires");
      return;
    }

    if (parseInt(form.nb_personnes, 10) < 1) {
      setError("Le nombre de personnes doit être d'au moins 1");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    if (form.date_evenement < today) {
      setError("La date de l'événement ne peut pas être dans le passé");
      return;
    }

    setError(null);
    setShowConfirmModal(true);
  };

  const confirmOrder = async () => {
    setLoading(true);
    setError(null);
    const token = cookies.get("token");
    if (!token) {
      return;
    }
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/traiteur`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            traiteur_id: traiteurId,
            date_evenement: form.date_evenement,
            nb_personnes: parseInt(form.nb_personnes, 10),
            adresse: form.adresse,
            type_evenement: form.type_evenement,
            notes: form.notes,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Erreur lors de la demande de devis");
        setLoading(false);
        return;
      }
      setShowConfirmModal(false);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn) {
    if (!open) {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full bg-white rounded-3xl p-4 sm:p-5 flex items-center gap-4 border border-[#1D6B45]/20 shadow-xs hover:shadow-md hover:border-[#1D6B45]/40 transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] flex items-center justify-center text-[#1D6B45] group-hover:scale-105 transition-transform shrink-0">
            <Calendar size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-gray-900 text-sm sm:text-base group-hover:text-[#1D6B45] transition-colors">
              Demander un devis sur-mesure
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate sm:whitespace-normal">
              Mariages, baptêmes, anniversaires & grands repas de famille.
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-[#1D6B45] group-hover:bg-[#E8F5E9] group-hover:translate-x-1 transition-all shrink-0">
            <ChevronRight size={18} />
          </div>
        </button>
      );
    }

    if (success) {
      const waNumber = whatsapp
        ? whatsapp.replace(/\+/g, "").replace(/\s/g, "")
        : "";
      const waUrl = `https://wa.me/${waNumber}?text=Bonjour%2C%20je%20viens%20de%20passer%20une%20demande%20de%20devis%20sur%20Dabari.`;

      return (
        <div className="bg-[#E8F5E9] border border-[#1D6B45]/20 rounded-3xl p-6 sm:p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-3 text-[#1D6B45] shadow-xs">
            <CheckCircle2 size={36} />
          </div>
          <h3 className="font-extrabold text-lg text-[#1D6B45] mb-1">
            Demande de devis envoyée !
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-5 max-w-sm mx-auto">
            {traiteurName} a bien reçu votre demande et vous contactera
            rapidement avec une proposition sur-mesure.
          </p>
          {whatsapp && (
            <button
              onClick={() => window.open(waUrl, "_blank")}
              className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-[#1da851] transition-colors shadow-sm"
            >
              <MessageSquare size={16} /> Contacter sur WhatsApp
            </button>
          )}
        </div>
      );
    }

    return (
      <>
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-[#1D6B45]">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Demande de devis sur-mesure
                </h3>
                <p className="text-xs text-gray-500">Chez {traiteurName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Date de l&apos;événement *
              </label>
              <input
                type="date"
                value={form.date_evenement}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => updateField("date_evenement", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Nombre de personnes *
              </label>
              <input
                type="number"
                min="1"
                value={form.nb_personnes}
                onChange={(e) => updateField("nb_personnes", e.target.value)}
                placeholder="Ex: 50"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Lieu ou Adresse de l&apos;événement *
              </label>
              <AddressAutocomplete
                value={form.adresse}
                onChange={(val) => updateField("adresse", val)}
                onSelectAddress={(item) => updateField("adresse", item.label)}
                placeholder="Ex: 12 rue des Lilas, Paris 75010..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Type d&apos;événement
              </label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t: string) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateField("type_evenement", t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      form.type_evenement === t
                        ? "bg-[#1D6B45] text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Notes & consignes particulières
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Précisez votre menu souhaité, vos contraintes d'horaires ou de matériel..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
              />
            </div>

            <button
              onClick={handlePreSubmit}
              disabled={
                loading ||
                !form.date_evenement ||
                !form.nb_personnes ||
                !form.adresse
              }
              className="w-full bg-[#1D6B45] text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-[#0F4A30] transition-colors shadow-sm disabled:opacity-60"
            >
              {loading ? "Envoi en cours..." : "Envoyer ma demande de devis"}
            </button>

            {whatsapp && (
              <p className="text-xs text-center text-gray-500 font-medium">
                Le traiteur sera également notifié directement sur WhatsApp
              </p>
            )}
          </div>
        </div>

        {/* Pop-up (Modale) de confirmation */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl text-center animate-in fade-in zoom-in duration-150">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-[#1D6B45]">
                <Calendar size={28} />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                Envoyer la demande de devis
              </h3>
              <p className="text-gray-600 mb-6 text-xs sm:text-sm leading-relaxed">
                Voulez-vous envoyer cette demande pour{" "}
                <span className="font-bold text-gray-900">
                  {form.nb_personnes} personne(s)
                </span>{" "}
                le{" "}
                <span className="font-bold text-gray-900">
                  {new Date(form.date_evenement).toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>{" "}
                ?
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-xs sm:text-sm hover:bg-gray-50 transition-colors"
                >
                  Continuer d&apos;éditer
                </button>
                <button
                  type="button"
                  onClick={confirmOrder}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-[#1D6B45] text-white font-bold text-xs sm:text-sm hover:bg-[#0F4A30] transition-colors shadow-md flex items-center justify-center"
                >
                  {loading ? "Envoi..." : "Confirmer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  } else {
    return (
      <Link
        href="/login"
        className="block w-full bg-[#F8FAFC] rounded-3xl p-4 sm:p-5 border border-gray-200/80 shadow-xs hover:bg-white hover:border-[#1D6B45]/30 hover:shadow-sm transition-all text-left group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-[#E8F5E9] group-hover:text-[#1D6B45] group-hover:scale-105 transition-all shrink-0">
            <Lock size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-gray-700 text-sm sm:text-base group-hover:text-[#1D6B45] transition-colors">
              Demander un devis sur-mesure
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate sm:whitespace-normal">
              Connectez-vous pour demander un devis au traiteur.
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-[#E8F5E9] group-hover:text-[#1D6B45] group-hover:translate-x-1 transition-all shrink-0">
            <LogIn size={18} />
          </div>
        </div>
      </Link>
    );
  }
}
