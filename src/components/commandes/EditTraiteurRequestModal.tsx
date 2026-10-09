"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Users,
  X,
  MapPin,
  Utensils,
  Banknote,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { authFetch } from "@/lib/auth";
import { TraiteurRequest, TRAITEUR_EVENT_TYPES } from "@/lib/types/traiteur";
import { verifyAddressExists } from "@/lib/addressValidation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: TraiteurRequest | null;
};

export default function EditTraiteurRequestModal({
  isOpen,
  onClose,
  onSuccess,
  request,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventType, setEventType] = useState("Mariage");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [location, setLocation] = useState("");
  const [foodPreferences, setFoodPreferences] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);

  // Liste exhaustive des types d'événements (placé avant les retours conditionnels selon les règles React)
  const availableEventTypes = useMemo(() => {
    const defaultLabels = TRAITEUR_EVENT_TYPES.map((t) => t.label);
    if (request?.event_type && !defaultLabels.includes(request.event_type as any)) {
      return [...defaultLabels, request.event_type];
    }
    return defaultLabels;
  }, [request?.event_type]);

  useEffect(() => {
    if (request && isOpen) {
      const rawDate = request.event_date;
      const initDate = rawDate
        ? typeof rawDate === "string"
          ? rawDate.split("T")[0]
          : new Date(rawDate).toISOString().split("T")[0]
        : "";
      setEventType(request.event_type || "Mariage");
      setEventDate(initDate);
      setGuestCount(
        request.guest_count !== null && request.guest_count !== undefined
          ? String(request.guest_count)
          : "",
      );
      setLocation(request.location || "");
      setFoodPreferences(request.food_preferences || "");
      setBudget(
        request.budget !== null && request.budget !== undefined
          ? String(request.budget)
          : "",
      );
      setDescription(request.description || "");
      setError(null);
      setShowConfirmSave(false);
    }
  }, [request, isOpen]);

  // Si modal fermée ou request nulle, pas de rendu UI (les hooks au-dessus restent constants)
  if (!isOpen || !request) return null;

  const minDateStr = new Date().toISOString().split("T")[0];

  const isGuestCountInvalid =
    guestCount.trim() !== "" &&
    (Number(guestCount) <= 0 || isNaN(Number(guestCount)));
  const isBudgetInvalid =
    budget.trim() !== "" &&
    (Number(budget.replace(",", ".")) <= 0 || isNaN(Number(budget.replace(",", "."))));

  // Détection robuste des modifications réelles pour ne jamais afficher de confirmation inutile
  const norm = (v: unknown) =>
    v === null || v === undefined ? "" : String(v).trim();
  const normNum = (v: unknown) => {
    const s = norm(v);
    return s === "" ? "" : String(Number(s.replace(",", ".")));
  };

  const currentInitDate = request.event_date
    ? typeof request.event_date === "string"
      ? request.event_date.split("T")[0]
      : new Date(request.event_date).toISOString().split("T")[0]
    : "";

  const hasChanges =
    norm(eventType) !== norm(request.event_type) ||
    norm(eventDate) !== norm(currentInitDate) ||
    normNum(guestCount) !== normNum(request.guest_count) ||
    norm(location) !== norm(request.location) ||
    norm(foodPreferences) !== norm(request.food_preferences) ||
    normNum(budget) !== normNum(request.budget) ||
    norm(description) !== norm(request.description);

  const handleOpenConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;
    if (!eventDate || !location.trim() || !foodPreferences.trim()) {
      setError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }
    if (isGuestCountInvalid || isBudgetInvalid) {
      setError("Veuillez corriger les valeurs numériques négatives ou nulles.");
      return;
    }

    setValidatingAddress(true);
    setError(null);

    try {
      const addressCheck = await verifyAddressExists(location.trim());
      if (!addressCheck.isValid) {
        setError(
          addressCheck.error ||
            "L'adresse ou ville indiquée n'a pas été trouvée. Veuillez indiquer un lieu réel ou sélectionner une suggestion."
        );
        setValidatingAddress(false);
        return;
      }
      if (addressCheck.normalizedAddress && addressCheck.normalizedAddress !== location.trim()) {
        setLocation(addressCheck.normalizedAddress);
      }
      setShowConfirmSave(true);
    } catch (err: any) {
      console.warn("Erreur vérification adresse:", err);
      setShowConfirmSave(true);
    } finally {
      setValidatingAddress(false);
    }
  };

  const handleConfirmSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const parsedGuest = guestCount.trim() ? parseInt(guestCount.trim(), 10) : null;
      const parsedBudget = budget.trim() ? parseFloat(budget.trim().replace(",", ".")) : null;

      const payload = {
        title: `Recherche traiteur - ${eventType}`,
        event_type: eventType,
        event_date: eventDate,
        guest_count: parsedGuest,
        location: location.trim(),
        food_preferences: foodPreferences.trim(),
        budget: parsedBudget,
        description: description.trim() || null,
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const response = await authFetch(
        `${apiUrl}/traiteur/requests/${request.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.error || "Erreur lors de la modification de l'annonce");
      }

      setShowConfirmSave(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            Modifier ma recherche de traiteur
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Mettez à jour les détails de votre événement pour les traiteurs intéressés.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-200 font-medium">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleOpenConfirm} className="space-y-4">
          {/* Type d'événement */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Type d'événement *
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
            >
              {availableEventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Date de l'événement */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-[#1D6B45]" />
              Date de l'événement *
            </label>
            <input
              type="date"
              min={minDateStr}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
              required
            />
          </div>

          {/* Nombre d'invités */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Users size={14} className="text-[#1D6B45]" />
              Nombre d'invités estimés <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                placeholder="Ex: 50"
                value={guestCount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (!val.includes("-") && Number(val) >= 0)) {
                    setGuestCount(val);
                  }
                }}
                className={`w-full pl-3.5 pr-20 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  isGuestCountInvalid ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-[#1D6B45]"
                }`}
              />
              <span className="absolute right-3.5 top-3 text-xs text-gray-400 font-medium pointer-events-none">
                personnes
              </span>
            </div>
            {isGuestCountInvalid && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> Le nombre d'invités doit être supérieur à 0.
              </p>
            )}
          </div>

          {/* Lieu ou Ville */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <MapPin size={14} className="text-[#1D6B45]" />
                Lieu ou Ville de l'événement *
              </label>
              <button
                type="button"
                onClick={() => setUseManualLocation(!useManualLocation)}
                className="text-[11px] text-[#1D6B45] hover:underline font-semibold"
              >
                {useManualLocation ? "Recherche auto" : "Saisie libre"}
              </button>
            </div>

            {useManualLocation ? (
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Paris 15e, Dakar, Lyon..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                required
              />
            ) : (
              <AddressAutocomplete
                value={location}
                onChange={setLocation}
                onSelectAddress={(item) => setLocation(item.label)}
                placeholder="Ex: 14 Rue de la République, Lyon..."
                required
              />
            )}
          </div>

          {/* Nourriture & Plats souhaités */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Utensils size={14} className="text-[#1D6B45]" />
              Nourriture & plats souhaités *
            </label>
            <textarea
              rows={3}
              value={foodPreferences}
              onChange={(e) => setFoodPreferences(e.target.value)}
              placeholder="Ex: Thiéboudienne, Alloco, Pastels, options végétariennes..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white resize-none"
              required
            />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Banknote size={14} className="text-[#1D6B45]" />
              Budget estimé en € <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Ex: 800"
                value={budget}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (!val.includes("-") && Number(val) >= 0)) {
                    setBudget(val);
                  }
                }}
                className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl border focus:outline-none focus:ring-2 text-sm bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  isBudgetInvalid ? "border-red-300 focus:ring-red-400" : "border-gray-200 focus:ring-[#1D6B45]"
                }`}
              />
              <span className="absolute right-3.5 top-3 text-xs text-gray-400 font-medium pointer-events-none">
                €
              </span>
            </div>
            {isBudgetInvalid && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> Le budget estimé doit être supérieur à 0 €.
              </p>
            )}
          </div>

          {/* Précisions supplémentaires */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-[#1D6B45]" />
              Remarques / précisions <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Horaires, contraintes de service, matériel..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white resize-none"
            />
          </div>

          {/* Boutons d'action */}
          <div className="pt-3 border-t border-gray-100 space-y-2">
            {!hasChanges && (
              <p className="text-[11px] text-gray-400 text-right font-medium">
                Aucune modification à enregistrer.
              </p>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {hasChanges ? "Annuler" : "Fermer"}
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  validatingAddress ||
                  !hasChanges ||
                  isGuestCountInvalid ||
                  isBudgetInvalid
                }
                className="px-5 py-2.5 rounded-xl bg-[#1D6B45] hover:bg-[#165637] text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {validatingAddress ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Vérification de l'adresse...
                  </>
                ) : loading ? (
                  "Enregistrement..."
                ) : (
                  "Enregistrer les modifications"
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Pop-up modal de confirmation avant enregistrement */}
        {showConfirmSave && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm p-6 bg-white rounded-3xl shadow-2xl text-center">
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                disabled={loading}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="w-14 h-14 mx-auto mb-4 bg-emerald-50 text-[#1D6B45] rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={30} />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Enregistrer les modifications ?
              </h3>

              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Voulez-vous enregistrer ces changements pour votre événement <strong className="text-gray-800">{eventType}</strong> ?
              </p>

              <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 text-left text-xs space-y-1.5 mb-5">
                <div>
                  <span className="text-gray-400 font-medium">Date :</span>{" "}
                  <strong className="text-gray-800">{eventDate}</strong>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Lieu :</span>{" "}
                  <strong className="text-gray-800">{location}</strong>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Invités :</span>{" "}
                  <strong className="text-gray-800">{guestCount ? `${guestCount} pers.` : "Non précisé"}</strong>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Budget :</span>{" "}
                  <strong className="text-[#1D6B45]">{budget ? `${budget} €` : "Non précisé"}</strong>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmSave(false)}
                  disabled={loading}
                  className="flex-1 py-3 text-xs font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={loading}
                  className="flex-1 py-3 text-xs font-bold text-white bg-[#1D6B45] hover:bg-[#165637] rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  {loading ? "Enregistrement..." : "Oui, enregistrer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
