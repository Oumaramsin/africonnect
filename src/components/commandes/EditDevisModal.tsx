"use client";

import { useEffect, useState, useMemo } from "react";
import { Calendar, Users, X, MapPin, StickyNote, AlertCircle, Loader2 } from "lucide-react";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { authFetch } from "@/lib/auth";
import { verifyAddressExists } from "@/lib/addressValidation";
import { useEscapeKey } from "@/hooks/useEscapeKey";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  commande: any;
};

const TYPES = [
  "Mariage",
  "Anniversaire",
  "Baptême",
  "Entreprise",
  "Soirée privée",
  "Autre",
];

export default function EditDevisModal({
  isOpen,
  onClose,
  onSuccess,
  commande,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Valeurs initiales
  const [initialData, setInitialData] = useState<{
    dateEvenement: string;
    nbPersonnes: string;
    typeEvenement: string;
    adresse: string;
    notes: string;
  } | null>(null);

  const [dateEvenement, setDateEvenement] = useState("");
  const [nbPersonnes, setNbPersonnes] = useState("1");
  const [typeEvenement, setTypeEvenement] = useState("Mariage");
  const [adresse, setAdresse] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (commande && isOpen) {
      const initDate = commande.date_evenement
        ? commande.date_evenement.split("T")[0]
        : "";
      const initNb = commande.nb_personnes ? String(commande.nb_personnes) : "1";
      const initType = commande.type_evenement || "Mariage";
      const initAdr = commande.adresse || "";
      const initNotes = commande.notes || "";

      setDateEvenement(initDate);
      setNbPersonnes(initNb);
      setTypeEvenement(initType);
      setAdresse(initAdr);
      setNotes(initNotes);
      setError(null);
      setShowConfirmModal(false);
      setValidatingAddress(false);

      setInitialData({
        dateEvenement: initDate,
        nbPersonnes: initNb,
        typeEvenement: initType,
        adresse: initAdr,
        notes: initNotes,
      });
    }
  }, [commande, isOpen]);

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
    if (dateEvenement !== initialData.dateEvenement) return true;
    if (nbPersonnes.trim() !== initialData.nbPersonnes.trim()) return true;
    if (typeEvenement !== initialData.typeEvenement) return true;
    if (adresse.trim() !== initialData.adresse.trim()) return true;
    if (notes.trim() !== initialData.notes.trim()) return true;
    return false;
  }, [initialData, dateEvenement, nbPersonnes, typeEvenement, adresse, notes]);

  if (!isOpen || !commande) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges || validatingAddress || loading) return;

    if (!dateEvenement || !nbPersonnes || !adresse.trim()) {
      setError("Veuillez renseigner tous les champs obligatoires (*)");
      return;
    }

    if (parseInt(nbPersonnes, 10) < 1) {
      setError("Le nombre de personnes doit être d'au moins 1");
      return;
    }

    if (dateEvenement < todayStr) {
      setError("La date de l'événement ne peut pas être dans le passé");
      return;
    }

    setValidatingAddress(true);
    setError(null);

    try {
      const check = await verifyAddressExists(adresse.trim());
      if (!check.isValid) {
        setError(
          check.error ||
            "L'adresse indiquée n'a pas été reconnue. Veuillez sélectionner une adresse existante dans les suggestions."
        );
        setValidatingAddress(false);
        return;
      }
      if (check.normalizedAddress && check.normalizedAddress !== adresse.trim()) {
        setAdresse(check.normalizedAddress);
      }
      setShowConfirmModal(true);
    } catch (err: any) {
      console.warn("Erreur validation adresse:", err);
      setShowConfirmModal(true);
    } finally {
      setValidatingAddress(false);
    }
  };

  const performSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        date_evenement: dateEvenement,
        nb_personnes: parseInt(nbPersonnes, 10),
        type_evenement: typeEvenement,
        adresse,
        notes,
      };

      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/commande/traiteur/${commande.id}`,
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

  const traiteurName =
    commande.traiteur?.name || commande.traiteurs?.name || "Traiteur";

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-devis-title"
        onClick={onClose}
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg my-8 bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        >
          {/* En-tête */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F5E9] text-[#1D6B45] flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <h3 id="edit-devis-title" className="font-extrabold text-gray-900 text-base">
                  Modifier le devis
                </h3>
                <p className="text-xs text-gray-500">Chez {traiteurName}</p>
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

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Date de l&apos;événement *
              </label>
              <input
                type="date"
                min={todayStr}
                value={dateEvenement}
                onChange={(e) => setDateEvenement(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Nombre de personnes *
              </label>
              <input
                type="number"
                min="1"
                value={nbPersonnes}
                onChange={(e) => setNbPersonnes(e.target.value)}
                placeholder="Ex: 50"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Type d&apos;événement
              </label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeEvenement(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      typeEvenement === t
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
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Lieu ou Adresse de l&apos;événement *
              </label>
              <AddressAutocomplete
                value={adresse}
                onChange={(val) => setAdresse(val)}
                onSelectAddress={(item) => setAdresse(item.label)}
                placeholder="Ex: 12 rue des Lilas, Paris 75010..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Notes & Précisions
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Régimes alimentaires, allergies, plats souhaités..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none"
              />
            </div>

            <div className="pt-3 flex gap-3">
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
                disabled={loading || validatingAddress || !hasChanges}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  !hasChanges || loading || validatingAddress
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border border-gray-200"
                    : "bg-[#1D6B45] hover:bg-[#0F4A30] text-white active:scale-[0.98]"
                }`}
              >
                {validatingAddress ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Vérification...
                  </>
                ) : loading ? (
                  "Enregistrement..."
                ) : !hasChanges ? (
                  "Aucune modification"
                ) : (
                  "Enregistrer"
                )}
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
          aria-labelledby="confirm-devis-title"
          onClick={() => setShowConfirmModal(false)}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in zoom-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl text-center"
          >
            <div className="w-14 h-14 bg-emerald-50 text-[#1D6B45] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Calendar size={28} />
            </div>
            <h3 id="confirm-devis-title" className="text-lg font-extrabold text-gray-900 mb-2">
              Confirmer les modifications
            </h3>
            <p className="text-gray-600 mb-6 text-xs sm:text-sm leading-relaxed">
              Voulez-vous enregistrer cette demande de devis modifiée pour{" "}
              <span className="font-bold text-gray-900">{nbPersonnes} personne(s)</span> ({typeEvenement}) le{" "}
              <span className="font-bold text-gray-900">
                {new Date(dateEvenement).toLocaleDateString("fr-FR", {
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
                onClick={performSave}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#1D6B45] text-white font-bold text-xs sm:text-sm hover:bg-[#0F4A30] transition-colors shadow-md flex items-center justify-center"
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
