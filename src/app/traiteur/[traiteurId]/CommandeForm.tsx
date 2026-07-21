"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { CheckCircle2, MessageSquare, Lock } from "lucide-react";
import cookies from "js-cookie";

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
  const supabase = createClient();
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
    type_evenement: "",
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

    if (parseInt(form.nb_personnes) < 1) {
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
          nb_personnes: parseInt(form.nb_personnes),
          adresse: form.adresse,
          type_evenement: form.type_evenement,
          notes: form.notes,
        }),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.message || "Erreur lors de la commande du traiteur");
      setLoading(false);
      return;
    }
    console.log(data);

    setSuccess(true);
    setLoading(false);
  };
  if (isLoggedIn) {
    if (!open) {
      return (
        <button
          onClick={() => setOpen(true)}
          className="w-full bg-[#2563EB] text-white py-4 rounded-2xl font-semibold text-sm hover:bg-[#1D4ED8] transition-colors"
        >
          Commander ce traiteur
        </button>
      );
    }

    if (success) {
      const waNumber = whatsapp
        ? whatsapp.replace(/\+/g, "").replace(/\s/g, "")
        : "";
      const waUrl = `https://wa.me/${waNumber}?text=Bonjour%2C%20je%20viens%20de%20passer%20une%20commande%20sur%20AfriConnect.`;

      return (
        <div className="bg-[#E8F5E9] border border-[#1D6B45]/20 rounded-2xl p-6 text-center">
          <div className="flex justify-center mb-3">
            <CheckCircle2 size={48} className="text-[#1D6B45]" />
          </div>
          <h3 className="font-bold text-[#1D6B45] mb-1">Commande envoyée !</h3>
          <p className="text-sm text-gray-600 mb-4">
            {traiteurName} a bien reçu ta demande et te contactera rapidement.
          </p>
          {whatsapp && (
            <button
              onClick={() => window.open(waUrl, "_blank")}
              className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-xl font-medium text-sm hover:bg-[#1da851] transition-colors"
            >
              <MessageSquare size={16} className="inline mr-2" /> Contacter sur
              WhatsApp
            </button>
          )}
        </div>
      );
    }

    return (
      <>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Passer une commande</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-600 hover:text-gray-600 text-xl leading-none"
            >
              &#x2715;
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {"Date de l'événement *"}
              </label>
              <input
                type="date"
                value={form.date_evenement}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => updateField("date_evenement", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de personnes *
              </label>
              <input
                type="number"
                min="1"
                value={form.nb_personnes}
                onChange={(e) => updateField("nb_personnes", e.target.value)}
                placeholder="Ex: 50"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {"Adresse de l'événement *"}
              </label>
              <input
                type="text"
                value={form.adresse}
                onChange={(e) => updateField("adresse", e.target.value)}
                placeholder="Ex: 12 rue des Lilas, Paris 75010"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {"Type d'événement"}
              </label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t: string) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateField("type_evenement", t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      form.type_evenement === t
                        ? "bg-[#1D6B45] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes supplémentaires
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Régimes alimentaires, allergies, plats souhaités..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
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
              className="w-full bg-[#1D6B45] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#0F4A30] transition-colors disabled:opacity-60"
            >
              {loading ? "Envoi en cours..." : "Envoyer ma demande"}
            </button>

            {whatsapp && (
              <p className="text-xs text-center text-gray-600">
                Le traiteur sera notifié sur WhatsApp
              </p>
            )}
          </div>
        </div>

        {/* Pop-up (Modale) de confirmation */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-auto shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                Envoyer la demande
              </h3>
              <p className="text-gray-600 mb-6 text-sm">
                Es-tu sûr(e) de vouloir envoyer cette demande de prestation pour{" "}
                <span className="font-bold">{form.nb_personnes} personnes</span>{" "}
                le{" "}
                <span className="font-bold">
                  {new Date(form.date_evenement).toLocaleDateString("fr-FR")}
                </span>{" "}
                ?
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmOrder}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-[#1D6B45] text-white font-medium text-sm hover:bg-[#0F4A30] transition-colors flex items-center justify-center"
                >
                  {loading ? "Envoi..." : "Oui, envoyer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  } else {
    return (
      <Link href="/login" className="block">
        <div className="w-full bg-gray-100 border-2 border-dashed border-[#1D6B45]/30 rounded-2xl py-5 px-4 text-center hover:bg-[#1D6B45]/5 hover:border-[#1D6B45]/60 transition-all group">
          <div className="flex justify-center mb-2">
            <Lock size={24} className="text-[#1D6B45]" />
          </div>
          <p className="font-semibold text-[#1D6B45] text-sm group-hover:underline">
            Se connecter pour commander
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Connectez-vous pour passer votre commande
          </p>
        </div>
      </Link>
    );
  }
}
