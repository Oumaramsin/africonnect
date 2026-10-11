"use client";

import { useEffect, useState, useMemo } from "react";
import { Plane, PlaneTakeoff, PlaneLanding, Scale, Package, X, Minus, Plus, Banknote, AlertCircle, ArrowRight } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useEscapeKey } from "@/hooks/useEscapeKey";

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

  useEscapeKey(() => {
    if (showConfirmModal) {
      setShowConfirmModal(false);
    } else {
      onClose();
    }
  }, isOpen);

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
  const depDate = request.departure_date || listing?.departure_date;
  const arrDate = request.arrival_date || listing?.arrival_date;
  const pickupCity = listing?.pickup_city;
  const dropoffCity = listing?.dropoff_city;
  const pricePerKg = Number(listing?.price_per_kg || 0);

  const currentReqWeight = Number(initialData?.weightKg || request.weight_kg || 0);
  const listingAvailableKg = Number(listing?.available_kg || 0);
  // Capacité max autorisée = poids initialement pris par cette demande + capacité restante libre
  const maxAllowedKg = Number((currentReqWeight + listingAvailableKg).toFixed(1));

  const parsedWeight = parseFloat(weightKg);
  const parsedDeclaredValue = parseFloat(declaredValue);

  const isWeightValid = !isNaN(parsedWeight) && parsedWeight > 0 && parsedWeight <= maxAllowedKg;
  const isWeightExceeded = !isNaN(parsedWeight) && parsedWeight > maxAllowedKg;
  const isContentValid = contentDesc.trim().length > 0;
  const isDeclaredValueValid =
    declaredValue.trim().length > 0 &&
    !isNaN(parsedDeclaredValue) &&
    parsedDeclaredValue >= 0;

  const isFormValid = isWeightValid && isContentValid && isDeclaredValueValid;
  const estimatedTotal = (parsedWeight * pricePerKg).toFixed(2);

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weightKg) || 0;
    const next = Math.max(0.5, current + delta);
    const rounded = Math.round(next * 10) / 10;
    if (delta > 0 && maxAllowedKg > 0 && rounded > maxAllowedKg) {
      setWeightKg(String(maxAllowedKg));
    } else {
      setWeightKg(String(rounded));
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges) return;

    if (!isWeightValid) {
      if (isWeightExceeded) {
        setError(
          `Le poids saisi (${parsedWeight} kg) dépasse la capacité restante du GP (${listingAvailableKg} kg disponibles). Le poids max autorisé est de ${maxAllowedKg} kg.`
        );
      } else {
        setError("Le poids du colis doit être supérieur à 0 kg.");
      }
      return;
    }

    if (!isContentValid) {
      setError("Veuillez obligatoirement renseigner la description du contenu.");
      return;
    }

    if (!isDeclaredValueValid) {
      setError("La valeur déclarée est obligatoire (saisissez au minimum 0 €).");
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
        weight_kg: parsedWeight,
        content_desc: contentDesc.trim(),
        declared_value: parsedDeclaredValue,
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

  const getButtonText = () => {
    if (loading) return "Enregistrement...";
    if (!contentDesc.trim()) return "Description requise";
    if (!isDeclaredValueValid) return "Valeur déclarée requise";
    if (isWeightExceeded) return "Capacité dépassée";
    if (!isWeightValid) return "Poids invalide";
    if (!hasChanges) return "Aucune modification";
    return "Enregistrer";
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-gp-title"
        onClick={onClose}
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg my-8 bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        >
          {/* En-tête */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-amber-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-[#D4870A] flex items-center justify-center">
                <Plane size={20} />
              </div>
              <div>
                <h3 id="edit-gp-title" className="font-extrabold text-gray-900 text-base">
                  Modifier la réservation GP
                </h3>
                <p className="text-xs text-gray-500 font-semibold inline-flex items-center gap-1.5">
                  <span>{depCity}</span>
                  <ArrowRight size={11} className="text-gray-400" />
                  <span>{arrCity}</span>
                </p>
                {/* Dates de départ et d'arrivée chacune sur leur propre ligne */}
                {(depDate || arrDate) && (
                  <div className="mt-1.5 space-y-0.5 text-[11px]">
                    {depDate && (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <PlaneTakeoff size={12} className="text-[#1D6B45] shrink-0" />
                        <span>
                          <strong className="font-semibold text-gray-700">Date de départ :</strong>{" "}
                          {new Date(depDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                          {pickupCity ? ` (Dépôt : ${pickupCity})` : ""}
                        </span>
                      </div>
                    )}
                    {arrDate && (
                      <div className="flex items-center gap-1.5 text-amber-800 font-medium">
                        <PlaneLanding size={12} className="text-[#D4870A] shrink-0" />
                        <span>
                          <strong className="font-semibold text-gray-700">Date d'arrivée :</strong>{" "}
                          {new Date(arrDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                          {dropoffCity ? ` (Récupération : ${dropoffCity})` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                )}
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

            {/* Stepper Poids avec visibilité de la capacité restante */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Poids du colis (kg)
                </label>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  * Obligatoire
                </span>
              </div>

              {/* Badge Capacité restante GP */}
              <div className="mb-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                <Scale size={16} className="text-[#D4870A] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p>
                    Kilos restants chez le GP :{" "}
                    <strong className="font-bold text-amber-800">{listingAvailableKg} kg</strong>
                  </p>
                  <p>
                    Poids max autorisé pour votre colis :{" "}
                    <strong className="font-bold text-[#1D6B45]">{maxAllowedKg} kg</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => adjustWeight(-0.5)}
                  disabled={!parsedWeight || parsedWeight <= 0.5}
                  className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max={maxAllowedKg}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-center font-extrabold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D4870A] text-base ${
                    isWeightExceeded ? "border-red-400 bg-red-50/40 text-red-700" : "border-gray-200"
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => adjustWeight(0.5)}
                  disabled={parsedWeight >= maxAllowedKg}
                  className="w-10 h-10 rounded-xl bg-[#D4870A] text-white font-bold flex items-center justify-center hover:bg-[#b57207] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Message en cas de dépassement de la capacité */}
              {isWeightExceeded && (
                <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>
                    Le poids saisi ({parsedWeight} kg) dépasse la capacité restante du GP ({listingAvailableKg} kg disponibles). Le poids max autorisé est de {maxAllowedKg} kg.
                  </span>
                </div>
              )}

              {pricePerKg > 0 && (
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2 px-1">
                  <span>Tarif unitaire : {pricePerKg.toFixed(2)} € / kg</span>
                  <span className="font-extrabold text-[#D4870A]">
                    Total estimé : {estimatedTotal} €
                  </span>
                </div>
              )}
            </div>

            {/* Description du contenu */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Description du contenu
                </label>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  * Obligatoire
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mb-1.5">
                Précisez la nature exacte des objets transportés (vêtements, documents, etc.).
              </p>
              <input
                type="text"
                value={contentDesc}
                onChange={(e) => setContentDesc(e.target.value)}
                placeholder="Ex: Vêtements, documents, cosmétiques..."
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#D4870A] ${
                  !contentDesc.trim() ? "border-amber-300 bg-amber-50/20" : "border-gray-200"
                }`}
                required
              />
              {!contentDesc.trim() && (
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  La description du contenu est obligatoire.
                </p>
              )}
            </div>

            {/* Valeur déclarée */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Valeur déclarée (€)
                </label>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  * Obligatoire
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mb-1.5">
                Indiquez la valeur estimée du colis (au minimum 0 €).
              </p>
              <input
                type="number"
                min="0"
                step="1"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(e.target.value)}
                placeholder="Ex: 50"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#D4870A] ${
                  !isDeclaredValueValid ? "border-amber-300 bg-amber-50/20" : "border-gray-200"
                }`}
                required
              />
              {!isDeclaredValueValid && (
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  La valeur déclarée est obligatoire (saisissez au minimum 0 €).
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Notes supplémentaires (optionnel)
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
                disabled={loading || !hasChanges || !isFormValid}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  !hasChanges || !isFormValid || loading
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border border-gray-200"
                    : "bg-[#D4870A] hover:bg-[#b57207] text-white active:scale-[0.98]"
                }`}
              >
                {getButtonText()}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Pop-up (Modale) de confirmation avant enregistrement */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-gp-title"
          onClick={() => setShowConfirmModal(false)}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in zoom-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl text-center"
          >
            <div className="w-14 h-14 bg-amber-50 text-[#D4870A] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Plane size={28} />
            </div>
            <h3 id="confirm-gp-title" className="text-lg font-extrabold text-gray-900 mb-2">
              Confirmer les modifications
            </h3>
            <p className="text-gray-600 mb-6 text-xs sm:text-sm leading-relaxed">
              Voulez-vous enregistrer cette réservation de transport pour un colis de{" "}
              <span className="font-bold text-gray-900">{weightKg} kg</span> ({contentDesc}) avec une valeur déclarée de{" "}
              <span className="font-bold text-gray-900">{declaredValue} €</span> vers{" "}
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
