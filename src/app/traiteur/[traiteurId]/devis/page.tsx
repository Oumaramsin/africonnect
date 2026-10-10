"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Users,
  MapPin,
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
  ChefHat,
  MessageSquare,
  ArrowRight,
  LogIn,
  ShoppingBag,
} from "lucide-react";
import { type Traiteur, type Dish } from "@/lib/types/traiteur";
import { getValidToken, authFetch } from "@/lib/auth";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { verifyAddressExists } from "@/lib/addressValidation";

const EVENT_TYPES = [
  { id: "Mariage", label: "Mariage", icon: Heart },
  { id: "Anniversaire", label: "Anniversaire", icon: Cake },
  { id: "Baptême", label: "Baptême", icon: Baby },
  { id: "Réception", label: "Réception privée", icon: Wine },
  { id: "Entreprise", label: "Événement d'entreprise", icon: Building2 },
  { id: "Autre", label: "Autre fête", icon: PartyPopper },
];

export default function TraiteurDevisPage() {
  const { traiteurId } = useParams();
  const router = useRouter();

  const id = Array.isArray(traiteurId) ? traiteurId[0] : traiteurId;

  const [traiteur, setTraiteur] = useState<Traiteur | null>(null);
  const [loadingTraiteur, setLoadingTraiteur] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Form State
  const tomorrowStr = useMemo(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split("T")[0];
  }, []);

  const [typeEvenement, setTypeEvenement] = useState("Mariage");
  const [customType, setCustomType] = useState("");
  const [dateEvenement, setDateEvenement] = useState("");
  const [nbPersonnes, setNbPersonnes] = useState("50");
  const [adresse, setAdresse] = useState("");
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [regimes, setRegimes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Validation & Modal State
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getValidToken();
    setIsLoggedIn(Boolean(token));
  }, []);

  useEffect(() => {
    async function fetchTraiteur() {
      if (!id) return;
      setLoadingTraiteur(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
        const response = await fetch(`${apiUrl}/traiteur/${id}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          setTraiteur(data.data?.traiteur || null);
        }
      } catch (err) {
        console.error("Erreur récupération traiteur:", err);
      } finally {
        setLoadingTraiteur(false);
      }
    }
    fetchTraiteur();
  }, [id]);

  const parsedNb = parseInt(nbPersonnes, 10);
  const isFormValid = Boolean(
    dateEvenement &&
      !isNaN(parsedNb) &&
      parsedNb > 0 &&
      adresse.trim().length > 0 &&
      (typeEvenement !== "Autre" || customType.trim().length > 0)
  );

  const toggleDishSelection = (dishName: string) => {
    setSelectedDishes((prev) =>
      prev.includes(dishName) ? prev.filter((d) => d !== dishName) : [...prev, dishName]
    );
  };

  const toggleRegime = (regimeLabel: string) => {
    setRegimes((prev) =>
      prev.includes(regimeLabel) ? prev.filter((r) => r !== regimeLabel) : [...prev, regimeLabel]
    );
  };

  const setShortcutDate = (daysToAdd: number) => {
    const d = new Date(Date.now() + daysToAdd * 86400000);
    setDateEvenement(d.toISOString().split("T")[0]);
  };

  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting || validatingAddress) return;
    setError(null);

    const today = new Date().toISOString().split("T")[0];
    if (dateEvenement < today) {
      setError("La date de l'événement ne peut pas être dans le passé.");
      return;
    }

    setValidatingAddress(true);
    try {
      const check = await verifyAddressExists(adresse.trim());
      if (!check.isValid) {
        setError(
          check.error ||
            "L'adresse indiquée n'a pas été reconnue. Veuillez sélectionner une adresse suggérée."
        );
        setValidatingAddress(false);
        return;
      }
      if (check.normalizedAddress && check.normalizedAddress !== adresse.trim()) {
        setAdresse(check.normalizedAddress);
      }
      setShowConfirmModal(true);
    } catch (err) {
      console.warn("Erreur validation adresse:", err);
      setShowConfirmModal(true);
    } finally {
      setValidatingAddress(false);
    }
  };

  const confirmAndSubmit = async () => {
    setError(null);
    setSubmitting(true);

    const token = getValidToken();
    if (!token) {
      setError("Veuillez vous connecter pour envoyer votre demande de devis.");
      setIsLoggedIn(false);
      setSubmitting(false);
      return;
    }

    try {
      const resolvedEventType = typeEvenement === "Autre" && customType.trim() ? customType.trim() : typeEvenement;

      const fullNotesParts: string[] = [];
      if (selectedDishes.length > 0) {
        fullNotesParts.push(`Plats souhaités : ${selectedDishes.join(", ")}`);
      }
      if (regimes.length > 0) {
        fullNotesParts.push(`Spécificités : ${regimes.join(", ")}`);
      }
      if (notes.trim()) {
        fullNotesParts.push(`Précisions : ${notes.trim()}`);
      }
      const finalNotes = fullNotesParts.join("\n\n");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const response = await authFetch(`${apiUrl}/traiteur`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traiteur_id: id,
          date_evenement: dateEvenement,
          nb_personnes: parsedNb,
          adresse: adresse.trim(),
          type_evenement: resolvedEventType,
          notes: finalNotes || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Erreur lors de l'enregistrement de votre devis.");
      }

      setShowConfirmModal(false);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Une erreur est survenue lors de l'envoi de la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTraiteur) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#1D6B45] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 font-semibold text-sm">Chargement du profil traiteur...</p>
      </div>
    );
  }

  if (!traiteur) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <ChefHat size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Traiteur introuvable</h2>
        <p className="text-sm text-slate-500">
          Ce traiteur n&apos;est plus disponible ou l&apos;adresse demandée est incorrecte.
        </p>
        <Link
          href="/traiteur"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D6B45] text-white text-xs font-bold shadow-md hover:bg-[#154d31] transition-all"
        >
          <ArrowLeft size={14} /> Retour à l&apos;annuaire des traiteurs
        </Link>
      </div>
    );
  }

  const rawWhatsapp = traiteur.whatsapp || "";
  const waNumber = rawWhatsapp.replace(/\+/g, "").replace(/\s/g, "");
  const waUrl = waNumber
    ? `https://wa.me/${waNumber}?text=Bonjour%20Chef%20${encodeURIComponent(
        traiteur.name
      )}%2C%20je%20viens%20de%20vous%20transmettre%20une%20demande%20de%20devis%20sur%20Dabari.`
    : null;

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-emerald-100 shadow-xl p-8 sm:p-12 text-center animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-[#1D6B45] border-2 border-emerald-200 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle2 size={44} />
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#1D6B45] bg-emerald-50 px-3 py-1 rounded-full mb-3">
            Demande enregistrée
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
            Votre demande de devis est transmise !
          </h1>

          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed mb-8">
            Le chef <span className="font-bold text-slate-900">{traiteur.name}</span> a bien reçu votre demande pour{" "}
            <span className="font-bold text-slate-900">{nbPersonnes} convives</span> le{" "}
            <span className="font-bold text-slate-900">
              {new Date(dateEvenement).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            . Il vous recontactera rapidement avec une proposition tarifaire détaillée.
          </p>

          <div className="space-y-3 max-w-md mx-auto">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white py-3.5 px-6 rounded-2xl font-black text-sm shadow-md transition-all hover:scale-102"
              >
                <MessageSquare size={18} />
                <span>Prévenir le chef sur WhatsApp</span>
              </a>
            )}

            <Link
              href="/commandes"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#1D6B45] hover:bg-[#154d31] text-white py-3.5 px-6 rounded-2xl font-black text-sm shadow-md transition-all hover:scale-102"
            >
              <span>Suivre ma demande dans Mes Commandes</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              href={`/traiteur/${id}`}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-6 rounded-2xl font-bold text-xs transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Retour à la fiche du chef {traiteur.name}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24">
      {/* ── BREADCRUMB & HERO BANNER ── */}
      <div className="bg-gradient-to-r from-[#1D6B45] via-[#165637] to-[#0F4A30] text-white border-b border-emerald-900/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 text-xs font-medium text-white/75 mb-3 flex-wrap">
            <Link href="/traiteur" className="hover:text-white transition-colors">
              Tous les traiteurs
            </Link>
            <span>/</span>
            <Link href={`/traiteur/${id}`} className="hover:text-white transition-colors">
              {traiteur.name}
            </Link>
            <span>/</span>
            <span className="text-white font-bold">Demande de devis</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 border-2 border-white/25 overflow-hidden shrink-0 flex items-center justify-center shadow-lg">
                {traiteur.image_url ? (
                  <Image src={traiteur.image_url} alt={traiteur.name} fill sizes="80px" className="object-cover" />
                ) : (
                  <ChefHat size={32} className="text-white" />
                )}
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-emerald-200 bg-white/10 px-2.5 py-0.5 rounded-full mb-1">
                  Devis sur-mesure événement
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Demande de devis chez {traiteur.name}
                </h1>
                <p className="text-xs sm:text-sm text-white/85 mt-0.5 line-clamp-1">
                  Mariages, réceptions, baptêmes, buffets & grands repas de famille
                </p>
              </div>
            </div>

            <Link
              href={`/traiteur/${id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition-all shrink-0"
            >
              <ArrowLeft size={14} /> Voir le menu individuel
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        {/* Verification Auth Banner */}
        {!isLoggedIn && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <LogIn size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">Connexion requise pour envoyer un devis</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Vous pouvez remplir votre devis ci-dessous dès maintenant. Vous serez invité à vous connecter lors de la validation.
                </p>
              </div>
            </div>
            <Link
              href={`/login?redirect=/traiteur/${id}/devis`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1D6B45] hover:bg-[#154d31] text-white text-xs font-black shadow-md shrink-0 transition-all"
            >
              <span>Se connecter</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 mb-6 flex items-center gap-3 text-sm font-medium">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handlePreSubmit} className="space-y-6">
          {/* ── CARD 1 : TYPE D'ÉVÉNEMENT ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#1D6B45] flex items-center justify-center font-bold">
                <PartyPopper size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">1. Type d&apos;événement</h2>
                <p className="text-xs text-slate-500">Sélectionnez la nature de votre célébration</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {EVENT_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = typeEvenement === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTypeEvenement(t.id)}
                    className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-[#1D6B45] bg-emerald-50/60 shadow-xs scale-[1.01]"
                        : "border-slate-100 bg-slate-50/50 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "bg-[#1D6B45] text-white" : "bg-white text-slate-600 border border-slate-200"
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <span className={`text-xs sm:text-sm font-bold ${isSelected ? "text-[#1D6B45]" : "text-slate-800"}`}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {typeEvenement === "Autre" && (
              <div className="pt-2 animate-in fade-in duration-150">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Précisez votre type d&apos;événement *
                </label>
                <input
                  type="text"
                  required
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="Ex : Remise de diplôme, Dîner associatif, Fête de fin d'année..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6B45] bg-slate-50/50 focus:bg-white"
                />
              </div>
            )}
          </div>

          {/* ── CARD 2 : DATE & CONVIVES ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#D4870A] flex items-center justify-center font-bold">
                <Calendar size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">2. Date & Nombre d&apos;invités</h2>
                <p className="text-xs text-slate-500">Quand et pour combien de personnes prévoyez-vous le repas ?</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date de l&apos;événement *
                </label>
                <input
                  type="date"
                  required
                  min={tomorrowStr}
                  value={dateEvenement}
                  onChange={(e) => setDateEvenement(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6B45] bg-slate-50/50 focus:bg-white font-medium"
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                  <span className="text-slate-400">Raccourcis :</span>
                  <button
                    type="button"
                    onClick={() => setShortcutDate(14)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium transition-colors"
                  >
                    +2 semaines
                  </button>
                  <button
                    type="button"
                    onClick={() => setShortcutDate(30)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium transition-colors"
                  >
                    +1 mois
                  </button>
                  <button
                    type="button"
                    onClick={() => setShortcutDate(60)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium transition-colors"
                  >
                    +2 mois
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre de convives estimé *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    required
                    value={nbPersonnes}
                    onChange={(e) => setNbPersonnes(e.target.value)}
                    placeholder="Ex : 50"
                    className="w-full px-4 py-3 pl-11 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6B45] bg-slate-50/50 focus:bg-white font-bold text-slate-900"
                  />
                  <Users size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                  <span className="text-slate-400">Suggestions :</span>
                  {["20", "50", "100", "200", "350"].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNbPersonnes(n)}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                        nbPersonnes === n ? "bg-[#1D6B45] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {n} pers.
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── CARD 3 : LIEU DE L'ÉVÉNEMENT ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <MapPin size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">3. Adresse de l&apos;événement</h2>
                <p className="text-xs text-slate-500">Où la prestation ou la livraison doit-elle avoir lieu ?</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Adresse postale complète ou salle des fêtes *
              </label>
              <AddressAutocomplete
                value={adresse}
                onChange={setAdresse}
                placeholder="Ex : 12 Rue de la République, 93200 Saint-Denis"
                required
              />
              {traiteur.delivery_zones && traiteur.delivery_zones.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Zones habituelles du chef :</span>
                  {traiteur.delivery_zones.map((zone) => (
                    <span key={zone} className="bg-emerald-50 text-[#1D6B45] px-2.5 py-0.5 rounded-md font-bold text-[11px]">
                      {zone}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── CARD 4 : SPÉCIALITÉS DU CHEF & RÉGIMES ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">4. Plats & Préférences culinaires</h2>
                <p className="text-xs text-slate-500">Sélectionnez les plats emblématiques du chef que vous souhaitez intégrer</p>
              </div>
            </div>

            {traiteur.dishes && traiteur.dishes.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Spécialités disponibles chez {traiteur.name} (optionnel) :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {traiteur.dishes.map((dish) => {
                    const isSelected = selectedDishes.includes(dish.name);
                    return (
                      <button
                        key={dish.id}
                        type="button"
                        onClick={() => toggleDishSelection(dish.name)}
                        className={`flex items-center justify-between p-3 rounded-2xl border text-left text-xs transition-all ${
                          isSelected
                            ? "border-[#1D6B45] bg-emerald-50 text-[#1D6B45] font-bold"
                            : "border-slate-100 bg-slate-50/50 hover:border-slate-200 text-slate-700 font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${
                              isSelected ? "bg-[#1D6B45] text-white" : "border border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check size={12} />}
                          </div>
                          <span className="truncate">{dish.name}</span>
                        </div>
                        {dish.cuisine_type && (
                          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
                            {dish.cuisine_type}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Spécificités & Régimes */}
            <div className="pt-2 space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Exigences particulières :
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  "Viandes 100% Halal",
                  "Sauce pimentée à part",
                  "Option végétarienne incluse",
                  "Service & serveurs sur place",
                  "Vaisselle & chafing dishes inclus",
                  "Boissons locales (Bissap, Gingembre)",
                ].map((reg) => {
                  const active = regimes.includes(reg);
                  return (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => toggleRegime(reg)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        active
                          ? "bg-[#1D6B45] text-white shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {active ? `✓ ${reg}` : `+ ${reg}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes libres */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Précisions, horaires ou demandes spéciales pour le chef
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex : Heure de début du buffet vers 19h30, possibilité de goûter les plats au préalable..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6B45] bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          {/* ── SUBMIT CTA BAR ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-emerald-800">
                <ShieldCheck size={16} className="text-[#1D6B45]" />
                <span>Devis 100% gratuit & sans engagement</span>
              </div>
              <p className="text-xs text-slate-500">
                Le chef {traiteur.name} étudiera votre demande et vous répondra sous 24 à 48 heures.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link
                href={`/traiteur/${id}`}
                className="flex-1 sm:flex-none px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs text-center transition-colors"
              >
                Annuler
              </Link>

              <button
                type="submit"
                disabled={!isFormValid || submitting || validatingAddress}
                className="flex-1 sm:flex-none px-7 py-3.5 rounded-2xl bg-[#1D6B45] hover:bg-[#154d31] disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-[#1D6B45]/20 flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98"
              >
                {validatingAddress ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Validation de l&apos;adresse...</span>
                  </>
                ) : (
                  <>
                    <span>Envoyer ma demande de devis</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── MODAL DE CONFIRMATION ── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#1D6B45] flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">Confirmer l&apos;envoi du devis</h3>
                  <p className="text-xs text-slate-500">À l&apos;attention de {traiteur.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 text-xs text-slate-700 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Événement :</span>
                <span className="font-bold text-slate-900">{typeEvenement === "Autre" ? customType : typeEvenement}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date prévue :</span>
                <span className="font-bold text-slate-900">
                  {new Date(dateEvenement).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nombre de personnes :</span>
                <span className="font-bold text-slate-900">{nbPersonnes} convives</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500 shrink-0">Lieu :</span>
                <span className="font-bold text-slate-900 text-right truncate">{adresse}</span>
              </div>
              {selectedDishes.length > 0 && (
                <div className="flex items-start justify-between gap-4 pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 shrink-0">Plats cochés :</span>
                  <span className="font-bold text-[#1D6B45] text-right line-clamp-2">{selectedDishes.join(", ")}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 text-center leading-relaxed">
              Êtes-vous certain(e) de vouloir transmettre cette demande de devis au chef {traiteur.name} ?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Modifier
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={confirmAndSubmit}
                className="flex-1 py-3 rounded-xl bg-[#1D6B45] hover:bg-[#154d31] disabled:opacity-50 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all hover:scale-102"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <span>Confirmer et envoyer</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
