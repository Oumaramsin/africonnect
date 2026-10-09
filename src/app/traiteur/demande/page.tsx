"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChefHat,
  Calendar,
  Users,
  MapPin,
  Utensils,
  Euro,
  FileText,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Heart,
  Cake,
  Baby,
  Wine,
  Building2,
  PartyPopper,
  X,
  Loader2,
} from "lucide-react";
import { getValidToken, authFetch } from "@/lib/auth";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { verifyAddressExists } from "@/lib/addressValidation";

const EVENT_TYPES = [
  { id: "mariage", label: "Mariage", icon: Heart },
  { id: "anniversaire", label: "Anniversaire", icon: Cake },
  { id: "bapteme", label: "Baptême", icon: Baby },
  { id: "repas_famille", label: "Repas de famille", icon: Users },
  { id: "diner_prive", label: "Dîner privé", icon: Wine },
  { id: "entreprise", label: "Événement entreprise", icon: Building2 },
  { id: "communion", label: "Fête religieuse", icon: Sparkles },
  { id: "autre", label: "Autre événement", icon: PartyPopper },
];

export default function DemandeTraiteurPage() {
  const router = useRouter();

  const tomorrow = new Date(Date.now() + 86400000);
  const minDateStr = tomorrow.toISOString().split("T")[0];

  const [eventType, setEventType] = useState("mariage");
  const [customEventType, setCustomEventType] = useState("");
  const [guestCount, setGuestCount] = useState<string>("");
  const [eventDate, setEventDate] = useState<string>(minDateStr);
  const [location, setLocation] = useState<string>("");
  const [foodPreferences, setFoodPreferences] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const token = getValidToken();
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const selectedEventLabel =
    eventType === "autre" && customEventType.trim()
      ? customEventType.trim()
      : EVENT_TYPES.find((e) => e.id === eventType)?.label || "Événement";

  const isGuestCountInvalid =
    guestCount !== "" && (Number(guestCount) <= 0 || isNaN(Number(guestCount)));
  const isBudgetInvalid =
    budget !== "" && (Number(budget.replace(",", ".")) <= 0 || isNaN(Number(budget.replace(",", "."))));

  const isFormValid = Boolean(
    (eventType !== "autre" || customEventType.trim()) &&
      eventDate.trim() &&
      location.trim() &&
      foodPreferences.trim().length >= 5 &&
      !isGuestCountInvalid &&
      !isBudgetInvalid,
  );

  const [validatingAddress, setValidatingAddress] = useState(false);

  const handleOpenConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || loading || validatingAddress) return;
    setError(null);
    setValidatingAddress(true);

    try {
      const check = await verifyAddressExists(location.trim());
      if (!check.isValid) {
        setError(
          check.error ||
            "L'adresse ou la ville indiquée n'a pas été trouvée. Veuillez sélectionner une adresse existante dans les suggestions."
        );
        setValidatingAddress(false);
        return;
      }
      if (check.normalizedAddress && check.normalizedAddress !== location.trim()) {
        setLocation(check.normalizedAddress);
      }
      setShowConfirmModal(true);
    } catch (err: any) {
      console.warn("Erreur validation adresse:", err);
      setShowConfirmModal(true);
    } finally {
      setValidatingAddress(false);
    }
  };

  const executePublish = async () => {
    setError(null);
    setLoading(true);

    try {
      const parsedGuest = guestCount.trim() ? parseInt(guestCount.trim(), 10) : null;
      const parsedBudget = budget.trim() ? parseFloat(budget.trim().replace(",", ".")) : null;

      const payload = {
        event_type: selectedEventLabel,
        guest_count: parsedGuest,
        event_date: eventDate,
        location: location.trim(),
        food_preferences: foodPreferences.trim(),
        budget: parsedBudget,
        description: description.trim() || null,
        title: `Recherche traiteur - ${selectedEventLabel}`,
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const response = await authFetch(
        `${apiUrl}/traiteur/requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const res = await response.json();
      if (!response.ok) {
        throw new Error(
          res.error || "Une erreur est survenue lors de la publication.",
        );
      }

      setShowConfirmModal(false);
      setSuccess(true);
      setTimeout(() => {
        router.push("/commandes");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1D6B45] via-[#165637] to-[#0F4A30] text-white px-4 pt-10 pb-8 shadow-md">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/traiteur"
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Retour aux traiteurs
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <ChefHat size={26} className="text-[#D4870A]" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">
                Publier une recherche de traiteur
              </h1>
              <p className="text-white/80 text-xs mt-0.5">
                Décrivez votre événement et recevez des propositions sur-mesure de nos traiteurs partenaires
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        {success ? (
          <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-sm text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-[#E8F5E9] text-[#1D6B45] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Votre annonce a été publiée avec succès !
            </h2>
            <p className="text-gray-600 text-sm max-w-md mx-auto mb-6">
              Nos traiteurs partenaires ont été notifiés. Vous recevrez leurs propositions et devis directement dans votre espace réception.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#1D6B45] bg-[#E8F5E9] px-4 py-2 rounded-xl">
              <Clock size={14} /> Redirection vers vos réceptions...
            </div>
          </div>
        ) : (
          <form onSubmit={handleOpenConfirm} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Type d'événement - Affichage complet sans coupure */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <Sparkles size={16} className="text-[#1D6B45]" />
                Type d'événement *
              </div>
              <p className="text-xs text-gray-500">
                Sélectionnez le format qui correspond le mieux à votre occasion.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {EVENT_TYPES.map((type) => {
                  const isSelected = eventType === type.id;
                  const Icon = type.icon;
                  return (
                    <button
                      type="button"
                      key={type.id}
                      onClick={() => setEventType(type.id)}
                      className={`p-3 rounded-2xl border flex flex-row items-center gap-3 text-left transition-all cursor-pointer min-h-[64px] ${
                        isSelected
                          ? "border-[#1D6B45] bg-[#E8F5E9]/70 shadow-xs ring-1 ring-[#1D6B45]"
                          : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? "bg-[#1D6B45] text-white shadow-xs"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <span
                        className={`flex-1 text-xs sm:text-sm font-bold leading-normal break-words whitespace-normal text-left ${
                          isSelected ? "text-[#1D6B45]" : "text-gray-800"
                        }`}
                      >
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {eventType === "autre" && (
                <div className="pt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Précisez votre type d'événement *
                  </label>
                  <input
                    type="text"
                    value={customEventType}
                    onChange={(e) => setCustomEventType(e.target.value)}
                    placeholder="Ex: Fiançailles, Barbecue entre amis, Brunch..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                    required
                  />
                </div>
              )}
            </div>

            {/* Date de l'événement */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <Calendar size={16} className="text-[#1D6B45]" />
                Date prévue pour l'événement *
              </div>
              <div>
                <input
                  type="date"
                  min={minDateStr}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Les traiteurs disponibles à cette date pourront vous envoyer leurs devis.
                </p>
              </div>
            </div>

            {/* Lieu / Ville de l'événement */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                  <MapPin size={16} className="text-[#1D6B45]" />
                  Lieu ou Adresse de l'événement *
                </div>
                <button
                  type="button"
                  onClick={() => setUseManualLocation(!useManualLocation)}
                  className="text-xs text-[#1D6B45] font-semibold hover:underline"
                >
                  {useManualLocation ? "Recherche auto" : "Saisie libre"}
                </button>
              </div>

              <div>
                {useManualLocation ? (
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Paris 15e, Dakar, Lyon, Marseille..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                    required
                  />
                ) : (
                  <AddressAutocomplete
                    value={location}
                    onChange={setLocation}
                    onSelectAddress={(item) => setLocation(item.label)}
                    placeholder="Ex: 14 Rue de la République, 69002 Lyon..."
                    required
                  />
                )}
                <p className="text-[11px] text-gray-400 mt-1">
                  Permet aux traiteurs de votre secteur géographique de vous répondre rapidement.
                </p>
              </div>
            </div>

            {/* Nombre de personnes & Budget */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <Users size={16} className="text-[#1D6B45]" />
                Invités & Budget (optionnels)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nombre d'invités estimés
                    <span className="text-gray-400 font-normal ml-1">
                      (optionnel)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={guestCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || (!val.includes("-") && Number(val) >= 0)) {
                          setGuestCount(val);
                        }
                      }}
                      placeholder="Ex: 50"
                      className={`w-full pl-4 pr-24 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        isGuestCountInvalid
                          ? "border-red-300 focus:ring-red-400"
                          : "border-gray-200 focus:ring-[#1D6B45]"
                      }`}
                    />
                    <span className="absolute right-4 top-3.5 text-xs text-gray-400 pointer-events-none font-medium">
                      personnes
                    </span>
                  </div>
                  {isGuestCountInvalid && (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> Le nombre d'invités doit être supérieur à 0.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Budget indicatif total
                    <span className="text-gray-400 font-normal ml-1">
                      (optionnel)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={budget}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || (!val.includes("-") && Number(val) >= 0)) {
                          setBudget(val);
                        }
                      }}
                      placeholder="Ex: 800"
                      className={`w-full pl-4 pr-12 py-3 rounded-xl border focus:outline-none focus:ring-2 text-sm bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        isBudgetInvalid
                          ? "border-red-300 focus:ring-red-400"
                          : "border-gray-200 focus:ring-[#1D6B45]"
                      }`}
                    />
                    <span className="absolute right-4 top-3.5 text-xs text-gray-400 pointer-events-none font-medium">
                      €
                    </span>
                  </div>
                  {isBudgetInvalid && (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> Le budget indicatif doit être supérieur à 0 €.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Ce que vous souhaitez en nourriture */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <Utensils size={16} className="text-[#1D6B45]" />
                Ce que vous souhaitez en nourriture & boissons *
              </div>
              <p className="text-xs text-gray-500">
                Indiquez les plats, spécialités culinaires, entrées, boissons ou régimes spécifiques que vous désirez.
              </p>

              <textarea
                value={foodPreferences}
                onChange={(e) => setFoodPreferences(e.target.value)}
                rows={4}
                placeholder="Ex: Buffet africain composé de Tiep rouge au poisson, Pastels au thon et à la viande, Alloco, Dibi d'agneau grillé. Prévoir également du jus de bissap maison et du jus de gingembre. Option végétarienne pour 4 personnes..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white resize-none"
                required
              />
            </div>

            {/* Description / Précisions */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                <FileText size={16} className="text-[#1D6B45]" />
                Précisions supplémentaires
                <span className="text-gray-400 font-normal text-xs ml-1">
                  (optionnel)
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ex: Service à table ou buffet ? Besoin de serveurs ou de vaisselle ? Heure de service souhaitée : 19h30..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white resize-none"
              />
            </div>

            {/* Info sécurité & mise en relation */}
            <div className="bg-[#E8F5E9]/70 border border-[#1D6B45]/20 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck size={20} className="text-[#1D6B45] shrink-0 mt-0.5" />
              <div className="text-xs text-gray-700 leading-relaxed">
                <span className="font-bold text-[#1D6B45] block mb-0.5">
                  Mise en relation directe & Devis gratuits
                </span>
                Votre annonce sera consultée par nos traiteurs vérifiés. Vous recevrez leurs propositions détaillées avec devis et pourrez comparer librement avant d'accepter.
              </div>
            </div>

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={loading || validatingAddress || !isFormValid}
              className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#155235] transition-all disabled:bg-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {validatingAddress ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Vérification de l'adresse...
                </>
              ) : loading ? (
                <>
                  <Clock size={18} className="animate-spin" />
                  Publication en cours...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Publier ma recherche de traiteur
                </>
              )}
            </button>
          </form>
        )}

        {/* Pop-up modal de confirmation avant publication */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-md p-6 bg-white rounded-3xl shadow-2xl text-left">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="w-12 h-12 bg-[#E8F5E9] text-[#1D6B45] rounded-2xl flex items-center justify-center mb-3">
                <Sparkles size={24} />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Confirmer la publication
              </h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Vérifiez les détails de votre demande avant de la mettre en ligne pour les traiteurs.
              </p>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-400 font-medium w-24 shrink-0">Événement :</span>
                  <span className="text-gray-900 font-bold">{selectedEventLabel}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-400 font-medium w-24 shrink-0">Date :</span>
                  <span className="text-gray-900 font-semibold">
                    {eventDate
                      ? new Date(eventDate).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Non précisée"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-400 font-medium w-24 shrink-0">Lieu :</span>
                  <span className="text-gray-900 font-semibold">{location}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-400 font-medium w-24 shrink-0">Invités :</span>
                  <span className="text-gray-900 font-semibold">
                    {guestCount ? `${guestCount} personnes` : "Non précisé"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-400 font-medium w-24 shrink-0">Budget :</span>
                  <span className="text-[#1D6B45] font-bold">
                    {budget ? `${budget} €` : "Non précisé"}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-gray-400 font-medium block mb-0.5">Plats souhaités :</span>
                  <p className="text-gray-800 italic line-clamp-3 leading-relaxed break-words">{foodPreferences}</p>
                </div>
                {description && (
                  <div className="pt-1">
                    <span className="text-gray-400 font-medium block mb-0.5">Précisions :</span>
                    <p className="text-gray-600 italic line-clamp-2 leading-relaxed break-words">{description}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={loading}
                  className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={executePublish}
                  disabled={loading}
                  className="flex-1 py-3 text-sm font-bold text-white bg-[#1D6B45] hover:bg-[#155235] rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Clock size={16} className="animate-spin" />
                      Publication...
                    </>
                  ) : (
                    "Confirmer & publier"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
