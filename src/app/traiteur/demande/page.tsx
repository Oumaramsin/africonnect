"use client";

import { useState, useEffect, useMemo } from "react";
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
  Check,
  HelpCircle,
  ChevronRight,
  Info,
  Layers,
  Calculator,
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
  { id: "entreprise", label: "Événement pro", icon: Building2 },
  { id: "communion", label: "Fête religieuse", icon: Sparkles },
  { id: "autre", label: "Autre événement", icon: PartyPopper },
];

const SUGGESTION_CATEGORIES = [
  {
    category: "Plats emblématiques",
    items: [
      "Thieboudienne rouge au poisson",
      "Poulet Yassa aux oignons caramélisés",
      "Alloco & Dibi d'agneau braisé",
      "Maffé au bœuf fondant",
      "Ndolé aux crevettes & plantain",
      "Attiéké poisson braisé",
    ],
  },
  {
    category: "Entrées & Apéritifs",
    items: [
      "Pastels croustillants au thon",
      "Samoussas au bœuf épicé",
      "Beignets Koki & Plantains",
      "Brochettes d'escargots ou de gésiers",
    ],
  },
  {
    category: "Boissons & Desserts",
    items: [
      "Jus de Bissap menthe maison",
      "Jus de Gingembre pressé",
      "Jus de Bouye (fruit du baobab)",
      "Thiakry (Dégué) vanillé",
    ],
  },
  {
    category: "Régimes spécifiques",
    items: [
      "Viandes 100% certifiées Halal",
      "Option végétarienne complète",
      "Sauces pimentées servies à part",
    ],
  },
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
  const [validatingAddress, setValidatingAddress] = useState(false);

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
    budget !== "" &&
    (Number(budget.replace(",", ".")) <= 0 ||
      isNaN(Number(budget.replace(",", "."))));

  const isFormValid = Boolean(
    (eventType !== "autre" || customEventType.trim()) &&
      eventDate.trim() &&
      location.trim() &&
      foodPreferences.trim().length >= 5 &&
      !isGuestCountInvalid &&
      !isBudgetInvalid,
  );

  // Estimation budget par invité
  const budgetPerGuest = useMemo(() => {
    const g = Number(guestCount);
    const b = Number(budget.replace(",", "."));
    if (g > 0 && b > 0) {
      return Math.round(b / g);
    }
    return null;
  }, [guestCount, budget]);

  const addFoodSuggestion = (suggestion: string) => {
    if (!foodPreferences.includes(suggestion)) {
      setFoodPreferences((prev) =>
        prev.trim() ? `${prev.trim()}, ${suggestion}` : suggestion,
      );
    }
  };

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
            "L'adresse ou la ville indiquée n'a pas été trouvée. Veuillez sélectionner une adresse existante dans les suggestions.",
        );
        setValidatingAddress(false);
        return;
      }
      if (
        check.normalizedAddress &&
        check.normalizedAddress !== location.trim()
      ) {
        setLocation(check.normalizedAddress);
      }
      setShowConfirmModal(true);
    } catch (err: unknown) {
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
      const parsedGuest = guestCount.trim()
        ? parseInt(guestCount.trim(), 10)
        : null;
      const parsedBudget = budget.trim()
        ? parseFloat(budget.trim().replace(",", "."))
        : null;

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

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const response = await authFetch(`${apiUrl}/traiteur/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

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
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-28">
      {/* Top Banner Hero Desktop & Mobile */}
      <div className="bg-gradient-to-r from-[#1D6B45] via-[#165637] to-[#0F4A30] text-white border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-medium text-white/70 mb-3 sm:mb-4 flex-wrap">
            <Link
              href="/traiteur"
              className="hover:text-white transition-colors"
            >
              Traiteurs
            </Link>
            <ChevronRight size={12} className="text-white/40" />
            <span className="text-amber-300 font-semibold">
              Demande de devis événementiel
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-xs flex items-center justify-center text-white transition-all border border-white/10 shrink-0"
                aria-label="Retour"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Demande de devis traiteur sur-mesure
                </h1>
                <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                  Recevez gratuitement les propositions personnalisées de nos
                  chefs et artisans qualifiés
                </p>
              </div>
            </div>

            {/* Badges de confiance Desktop */}
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs text-white">
                <Sparkles size={15} className="text-amber-300" />
                <span>100% Gratuit & Sans engagement</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs text-white">
                <ShieldCheck size={15} className="text-emerald-300" />
                <span>Chefs certifiés Dabari</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {success ? (
          <div className="bg-white rounded-[36px] p-8 sm:p-12 border border-emerald-100 shadow-sm text-center max-w-xl mx-auto animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[#E8F5E9] text-[#1D6B45] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xs">
              <CheckCircle2 size={42} />
            </div>
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#1D6B45] mb-3">
              Demande enregistrée
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
              Votre recherche est en ligne !
            </h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto mb-8 leading-relaxed">
              Les traiteurs partenaires situés à proximité ont été alertés. Vous
              recevrez leurs devis et menus détaillés directement dans votre
              espace de suivi.
            </p>
            <div className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[#1D6B45] bg-[#E8F5E9] px-5 py-2.5 rounded-2xl">
              <Loader2 size={16} className="animate-spin" />
              <span>Redirection vers votre espace de suivi...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Colonne Gauche : Formulaire principal (8 cols) */}
            <div className="lg:col-span-8 space-y-5">
              <form
                id="demande-form"
                onSubmit={handleOpenConfirm}
                className="space-y-5"
              >
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm flex items-center gap-3">
                    <AlertCircle size={18} className="shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Étape 1 : Type d'événement */}
                <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#1D6B45] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Format de votre événement *
                      </h2>
                      <p className="text-xs text-slate-500">
                        Aide les chefs à adapter le dressage et les contenants.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {EVENT_TYPES.map((type) => {
                      const isSelected = eventType === type.id;
                      const Icon = type.icon;
                      return (
                        <button
                          type="button"
                          key={type.id}
                          onClick={() => setEventType(type.id)}
                          className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer min-h-[92px] ${
                            isSelected
                              ? "border-[#1D6B45] bg-[#E8F5E9]/60 shadow-xs ring-1 ring-[#1D6B45]"
                              : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                              isSelected
                                ? "bg-[#1D6B45] text-white shadow-xs"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <Icon size={20} />
                          </div>
                          <span
                            className={`text-xs font-bold leading-tight ${
                              isSelected ? "text-[#1D6B45]" : "text-slate-800"
                            }`}
                          >
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {eventType === "autre" && (
                    <div className="pt-2 animate-in fade-in duration-200">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Précisez la nature de l'événement *
                      </label>
                      <input
                        type="text"
                        value={customEventType}
                        onChange={(e) => setCustomEventType(e.target.value)}
                        placeholder="Ex: Fiançailles, Barbecue festif, Brunch de retrouvailles..."
                        className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Étape 2 : Date et Lieu */}
                <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#1D6B45] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Date & Secteur de réception *
                      </h2>
                      <p className="text-xs text-slate-500">
                        Permet de filtrer uniquement les traiteurs disponibles ce
                        jour-là.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Date */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Calendar size={14} className="text-[#1D6B45]" /> Date
                        prévue *
                      </label>
                      <input
                        type="date"
                        min={minDateStr}
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                        required
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Seuls les traiteurs disponibles seront notifiés
                      </p>
                    </div>

                    {/* Lieu */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin size={14} className="text-[#1D6B45]" /> Lieu ou
                          Ville *
                        </label>
                        <button
                          type="button"
                          onClick={() => setUseManualLocation(!useManualLocation)}
                          className="text-xs text-[#1D6B45] font-semibold hover:underline cursor-pointer"
                        >
                          {useManualLocation ? "Recherche auto" : "Saisie libre"}
                        </button>
                      </div>

                      {useManualLocation ? (
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="Ex: Paris 15e, Dakar, Lyon, Abidjan..."
                          className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
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
                      <p className="text-[11px] text-slate-400 mt-1">
                        Calcul du rayon logistique et frais de transport
                      </p>
                    </div>
                  </div>
                </div>

                {/* Étape 3 : Convives & Budget */}
                <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#1D6B45] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Dimensionnement & Estimation de budget
                      </h2>
                      <p className="text-xs text-slate-500">
                        Donnez un repère chiffré pour recevoir des propositions
                        réalistes.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Invités */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Users size={14} className="text-[#1D6B45]" /> Nombre
                        d'invités
                        <span className="text-slate-400 lowercase font-normal">
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
                            if (
                              val === "" ||
                              (!val.includes("-") && Number(val) >= 0)
                            ) {
                              setGuestCount(val);
                            }
                          }}
                          placeholder="Ex: 50"
                          className={`w-full pl-4 pr-24 py-3.5 rounded-2xl border focus:outline-none focus:ring-2 text-sm bg-white font-medium text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            isGuestCountInvalid
                              ? "border-red-300 focus:ring-red-400"
                              : "border-slate-200 focus:ring-[#1D6B45]"
                          }`}
                        />
                        <span className="absolute right-4 top-3.5 text-xs text-slate-400 pointer-events-none font-medium">
                          personnes
                        </span>
                      </div>
                      {isGuestCountInvalid && (
                        <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                          <AlertCircle size={13} className="shrink-0" /> Le nombre
                          doit être supérieur à 0.
                        </p>
                      )}
                    </div>

                    {/* Budget */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Euro size={14} className="text-[#1D6B45]" /> Budget total
                        indicatif
                        <span className="text-slate-400 lowercase font-normal">
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
                            if (
                              val === "" ||
                              (!val.includes("-") && Number(val) >= 0)
                            ) {
                              setBudget(val);
                            }
                          }}
                          placeholder="Ex: 1200"
                          className={`w-full pl-4 pr-12 py-3.5 rounded-2xl border focus:outline-none focus:ring-2 text-sm bg-white font-medium text-slate-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            isBudgetInvalid
                              ? "border-red-300 focus:ring-red-400"
                              : "border-slate-200 focus:ring-[#1D6B45]"
                          }`}
                        />
                        <span className="absolute right-4 top-3.5 text-xs text-slate-400 pointer-events-none font-bold">
                          € TTC
                        </span>
                      </div>
                      {isBudgetInvalid && (
                        <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1 font-medium">
                          <AlertCircle size={13} className="shrink-0" /> Le budget
                          doit être supérieur à 0 €.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ratio helper automatique */}
                  {budgetPerGuest && (
                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-emerald-900 animate-in fade-in duration-200">
                      <Calculator size={18} className="text-[#1D6B45] shrink-0" />
                      <div>
                        <span className="font-bold">
                          Estimation ratio : ~{budgetPerGuest} € par convive.
                        </span>
                        <span className="text-emerald-700 ml-1">
                          {budgetPerGuest < 15
                            ? "Idéal pour un cocktail ou apéritif dînatoire."
                            : budgetPerGuest <= 30
                              ? "Excellent budget pour un buffet complet plat chaud + entrées."
                              : "Très adapté pour un menu gastronomique avec service à table."}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Étape 4 : Plats & Menus souhaités */}
                <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#1D6B45] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Vos souhaits culinaires & Boissons *
                      </h2>
                      <p className="text-xs text-slate-500">
                        Indiquez les spécialités, entrées, accompagnements et
                        boissons que vous souhaitez faire figurer.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <textarea
                      value={foodPreferences}
                      onChange={(e) => setFoodPreferences(e.target.value)}
                      rows={4}
                      placeholder="Ex: Buffet africain complet pour notre mariage : Pastels au thon en apéritif, Thieboudienne rouge au mérou, Alloco avec agneau braisé façon Dibi. Carafes de Bissap frais et jus de bouye maison..."
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white resize-none font-medium text-slate-800 leading-relaxed"
                      required
                    />

                    {/* Suggestions thématiques par catégorie */}
                    <div className="space-y-3 pt-1">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Ajouter des suggestions populaires en 1 clic :
                      </p>
                      {SUGGESTION_CATEGORIES.map((cat) => (
                        <div key={cat.category} className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-500 block">
                            {cat.category}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {cat.items.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => addFoodSuggestion(item)}
                                className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-[#1D6B45] text-slate-700 px-3 py-1.5 rounded-full border border-slate-200/80 transition-colors cursor-pointer"
                              >
                                + {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Étape 5 : Précisions logistiques */}
                <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#1D6B45] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      5
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                          Précisions logistiques & Service
                        </h2>
                        <span className="text-xs text-slate-400 font-normal">
                          (optionnel)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Besoin de vaisselle, de chafing dishes, de serveurs ou d'un
                        horaire d'installation particulier ?
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Ex: Vaisselle fournie par le traiteur ? Chafing dishes chauffants souhaités pour maintenir les plats au chaud. Heure d'installation souhaitée : 18h30..."
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white resize-none font-medium text-slate-800 leading-relaxed"
                    />
                  </div>
                </div>

                {/* Reassurance Banner */}
                <div className="bg-[#E8F5E9]/60 border border-[#1D6B45]/20 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
                  <ShieldCheck
                    size={22}
                    className="text-[#1D6B45] shrink-0 mt-0.5"
                  />
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <span className="font-bold text-[#1D6B45] block mb-0.5">
                      Mise en relation directe & Protection de vos informations
                    </span>
                    Votre demande est diffusée uniquement aux traiteurs qualifiés
                    de votre secteur. Vos coordonnées directes ne sont partagées
                    qu'une fois votre accord donné sur une offre.
                  </div>
                </div>
              </form>
            </div>

            {/* Colonne Droite : Sticky Live Preview & Process (4 cols) */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
              {/* Carte Aperçu en direct */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-[#D4870A]" />
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Aperçu de votre annonce
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-[#1D6B45] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full">
                    En direct
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Titre et type */}
                  <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-slate-200/70 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Format :</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {selectedEventLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Date :</span>
                      <span className="font-semibold text-slate-800">
                        {eventDate
                          ? new Date(eventDate).toLocaleDateString("fr-FR", {
                              weekday: "short",
                              day: "numeric",
                              month: "long",
                            })
                          : "Non définie"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Lieu :</span>
                      <span className="font-semibold text-slate-800 text-right truncate max-w-[180px]">
                        {location || "À renseigner"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">
                        Convives :
                      </span>
                      <span className="font-semibold text-slate-800">
                        {guestCount ? `${guestCount} personnes` : "À préciser"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500 font-medium">
                        Budget total :
                      </span>
                      <span className="font-black text-[#1D6B45] text-sm">
                        {budget ? `${budget} € TTC` : "Sur devis"}
                      </span>
                    </div>
                  </div>

                  {/* Extrait nourriture */}
                  <div>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Menu souhaité :
                    </span>
                    <p className="text-xs text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-100 line-clamp-3 leading-relaxed">
                      {foodPreferences ||
                        "Renseignez vos envies culinaires pour donner un aperçu aux traiteurs..."}
                    </p>
                  </div>
                </div>

                {/* Bouton de soumission principal Desktop */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    form="demande-form"
                    disabled={loading || validatingAddress || !isFormValid}
                    className="w-full bg-[#1D6B45] text-white py-4 px-6 rounded-2xl font-bold text-sm sm:text-base hover:bg-[#155235] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    {validatingAddress ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Vérification de l'adresse...</span>
                      </>
                    ) : loading ? (
                      <>
                        <Clock size={18} className="animate-spin" />
                        <span>Publication en cours...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Publier ma recherche</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400 mt-2">
                    Devis gratuits • Sans engagement
                  </p>
                </div>
              </div>

              {/* Comment ça fonctionne ? */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-4">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <HelpCircle size={16} className="text-[#1D6B45]" />
                  Comment fonctionne la mise en relation ?
                </h4>
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#E8F5E9] text-[#1D6B45] font-bold text-[11px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <p className="leading-relaxed">
                      <strong>Diffusion locale</strong> : Votre demande est
                      partagée auprès des traiteurs qualifiés de votre secteur.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#E8F5E9] text-[#1D6B45] font-bold text-[11px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <p className="leading-relaxed">
                      <strong>Devis sur-mesure</strong> : Vous recevez leurs
                      menus personnalisés et tarifs sous 24 à 48h.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#E8F5E9] text-[#1D6B45] font-bold text-[11px] flex items-center justify-center shrink-0">
                      3
                    </span>
                    <p className="leading-relaxed">
                      <strong>Choix & Garantie</strong> : Vous validez votre
                      artisan favori avec la garantie satisfaction Dabari.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Bar Mobile */}
        {!success && (
          <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 z-40 lg:hidden shadow-lg">
            <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">
                  {selectedEventLabel}
                </span>
                <span className="text-base font-bold text-slate-900">
                  {budget ? `${budget} €` : "Devis gratuit"}
                </span>
              </div>
              <button
                type="submit"
                form="demande-form"
                disabled={loading || validatingAddress || !isFormValid}
                className="flex-1 max-w-[220px] bg-[#1D6B45] text-white py-3.5 px-4 rounded-2xl font-bold text-sm hover:bg-[#155235] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                {validatingAddress || loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Publier ma recherche</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Modal de confirmation avant publication */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg p-6 sm:p-8 bg-white rounded-[32px] shadow-2xl text-left">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="w-14 h-14 bg-[#E8F5E9] text-[#1D6B45] rounded-2xl flex items-center justify-center mb-4 shadow-xs">
                <Sparkles size={28} />
              </div>

              <h3 className="text-xl font-extrabold text-slate-900 mb-1">
                Confirmer la publication
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-5 leading-relaxed">
                Veuillez relire les détails de votre demande avant de la diffuser
                aux traiteurs partenaires Dabari :
              </p>

              <div className="bg-[#FAF7F2] rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-2.5 text-xs mb-6">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-slate-400 font-medium">Événement :</span>
                  <span className="text-slate-900 font-bold text-right">
                    {selectedEventLabel}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-slate-400 font-medium">Date :</span>
                  <span className="text-slate-900 font-semibold text-right">
                    {eventDate
                      ? new Date(eventDate).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Non précisée"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-slate-400 font-medium">Lieu :</span>
                  <span className="text-slate-900 font-semibold text-right truncate max-w-[240px]">
                    {location}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-slate-400 font-medium">Invités :</span>
                  <span className="text-slate-900 font-semibold text-right">
                    {guestCount ? `${guestCount} personnes` : "Non précisé"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-slate-400 font-medium">Budget :</span>
                  <span className="text-[#1D6B45] font-extrabold text-right">
                    {budget ? `${budget} € TTC` : "Non précisé"}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-slate-200/80">
                  <span className="text-slate-400 font-medium block mb-1">
                    Plats & Menus :
                  </span>
                  <p className="text-slate-800 italic line-clamp-3 leading-relaxed break-words bg-white/70 p-2.5 rounded-xl border border-slate-200/60">
                    {foodPreferences}
                  </p>
                </div>
                {description && (
                  <div className="pt-1">
                    <span className="text-slate-400 font-medium block mb-1">
                      Précisions :
                    </span>
                    <p className="text-slate-600 italic line-clamp-2 leading-relaxed break-words">
                      {description}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={loading}
                  className="flex-1 py-3.5 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={executePublish}
                  disabled={loading}
                  className="flex-1 py-3.5 text-xs sm:text-sm font-bold text-white bg-[#1D6B45] hover:bg-[#155235] rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Publication...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Confirmer & publier</span>
                    </>
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
