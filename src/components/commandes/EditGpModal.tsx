"use client";

import { useEffect, useState, useMemo } from "react";
import { Plane, Scale, Package, X, Minus, Plus, Banknote, AlertCircle } from "lucide-react";
import { authFetch } from "@/lib/auth";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: any;
};

export default function EditGpModal({
  isOpen,
  onClose,
  onSuccess,
  request,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Valeurs initiales
  const [initialData, setInitialData] = useState<{
    weightKg: string;
    contentDesc: string;
    declaredValue: string;
    notes: string;
  } | null>(null);

  const [weightKg, setWeightKg] = useState("1");
  const [contentDesc, setContentDesc] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (request && isOpen) {
      const initWeight = request.weight_kg ? String(request.weight_kg) : "1";
      const initDesc = request.content_desc || "";
      const initVal = request.declared_value ? String(request.declared_value) : "";
      const initNotes = request.notes || "";

      setWeightKg(initWeight);
      setContentDesc(initDesc);
      setDeclaredValue(initVal);
      setNotes(initNotes);
      setError(null);
      setShowConfirmModal(false);

      setInitialData({
        weightKg: initWeight,
        contentDesc: initDesc,
        declaredValue: initVal,
        notes: initNotes,
      });
    }
  }, [request, isOpen]);

  // Détection si l'utilisateur a modifié quelque chose
  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    if (weightKg.trim() !== initialData.weightKg.trim()) return true;
    if (contentDesc.trim() !== initialData.contentDesc.trim()) return true;
    if (declaredValue.trim() !== initialData.declaredValue.trim()) return true;
    if (notes.trim() !== initialData.notes.trim()) return true;
    return false;
  }, [initialData, weightKg, contentDesc, declaredValue, notes]);

  if (!isOpen || !request) return null;

  const listing = request.listing || request.gp_listings;
  const depCity = request.departure_city || listing?.departure_city || "Départ";
  const arrCity = request.arrival_city || listing?.arrival_city || "Arrivée";
  const pricePerKg = Number(listing?.price_per_kg || 0);

  const parsedWeight = parseFloat(weightKg) || 0;
  const estimatedTotal = (parsedWeight * pricePerKg).toFixed(2);

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weightKg) || 0;
    const next = Math.max(0.5, current + delta);
    setWeightKg(String(Math.round(next * 10) / 10));
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges) return;

    const w = parseFloat(weightKg);
    if (!w || w <= 0) {
      setError("Le poids du colis doit être supérieur à 0 kg.");
      return;
    }

    if (!contentDesc.trim()) {
      setError("Veuillez décrire le contenu du colis.");
      return;
    }

    setError(null);
    setShowConfirmModal(true);
  };

  const performSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        weight_kg: parseFloat(weightKg),
        content_desc: contentDesc.trim(),
        declared_value: parseFloat(declaredValue) || undefined,
        notes: notes.trim(),
      };

      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande/gp/${request.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors de la modification");
      }

      setShowConfirmModal(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Impossible d'enregistrer les modifications");
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-lg my-8 bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* En-tête */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-amber-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#D4870A] flex items-center justify-center">
                <Plane size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Modifier la réservation GP
                </h3>
                <p className="text-xs text-gray-500 font-semibold">
                  {depCity} ➔ {arrCity}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handlePreSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Stepper Poids */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Poids du colis (kg) *
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => adjustWeight(-0.5)}
                  className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-center font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D4870A] text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => adjustWeight(0.5)}
                  className="w-10 h-10 rounded-xl bg-[#D4870A] text-white font-bold flex items-center justify-center hover:bg-[#b57207] transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              {pricePerKg > 0 && (
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2 px-1">
                  <span>Tarif unitaire : {pricePerKg.toFixed(2)} € / kg</span>
                  <span className="font-extrabold text-[#D4870A]">
                    Total estimé : {estimatedTotal} €
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Description du contenu *
              </label>
              <input
                type="text"
                value={contentDesc}
                onChange={(e) => setContentDesc(e.target.value)}
                placeholder="Ex: Vêtements, documents, cosmétiques..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#D4870A] text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Valeur déclarée (€ - facultatif)
              </label>
              <input
                type="number"
                min="0"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(e.target.value)}
                placeholder="Ex: 50"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#D4870A] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Notes supplémentaires
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions particulières de remise..."
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#D4870A] text-sm resize-none"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !hasChanges}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  !hasChanges || loading
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border border-gray-200"
                    : "bg-[#D4870A] hover:bg-[#b57207] text-white active:scale-[0.98]"
                }`}
              >
                {loading
                  ? "Enregistrement..."
                  : !hasChanges
                  ? "Aucune modification"
                  : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Pop-up (Modale) de confirmation avant enregistrement */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in zoom-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl text-center">
            <div className="w-14 h-14 bg-amber-50 text-[#D4870A] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Plane size={28} />
            </div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">
              Confirmer les modifications
            </h3>
            <p className="text-gray-600 mb-6 text-xs sm:text-sm leading-relaxed">
              Voulez-vous enregistrer cette réservation de transport pour un colis de{" "}
              <span className="font-bold text-gray-900">{weightKg} kg</span> ({contentDesc}) vers{" "}
              <span className="font-bold text-gray-900">{arrCity}</span> pour un total estimé de{" "}
              <span className="font-bold text-[#D4870A]">{estimatedTotal} €</span> ?
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
                onClick={performSave}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#D4870A] text-white font-bold text-xs sm:text-sm hover:bg-[#b57207] transition-colors shadow-md flex items-center justify-center"
              >
                {loading ? "Enregistrement..." : "Oui, confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
