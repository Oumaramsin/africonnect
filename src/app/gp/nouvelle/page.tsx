"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Package,
  MapPin,
  Lock,
  PenLine,
  Calendar,
} from "lucide-react";
import { getValidToken, authFetch } from "@/lib/auth";
import AddressAutocomplete, {
  getQuarterOrCityFromAddress,
} from "@/components/AddressAutocomplete";
import { GP_COUNTRIES } from "@/lib/types/gp";
import { verifyAddressExists } from "@/lib/addressValidation";

const schema = z
  .object({
    departure_city: z.string().min(2, "Ville de départ requise"),
    departure_country: z.string().min(2, "Pays requis"),
    arrival_city: z.string().min(2, "Ville d'arrivée requise"),
    arrival_country: z.string().min(2, "Pays requis"),
    departure_date: z.string().min(1, "Date de départ requise"),
    arrival_date: z.string().optional(),
    available_kg: z.number().min(0.5, "Minimum 0.5 kg").max(50, "Maximum 50 kg"),
    price_per_kg: z.number().min(1, "Tarif requis"),
    flight_type: z.enum(["direct", "escale"]),
    pickup_address: z
      .string()
      .min(3, "L'adresse précise de dépôt est obligatoire"),
    pickup_city: z.string().optional(),
    dropoff_address: z
      .string()
      .min(3, "L'adresse précise de récupération est obligatoire"),
    dropoff_city: z.string().optional(),
    description: z
      .string()
      .min(10, "Description requise (minimum 10 caractères)"),
  })
  .refine(
    (data) =>
      data.departure_country.trim().toLowerCase() !==
      data.arrival_country.trim().toLowerCase(),
    {
      message: "Le pays de départ et le pays d'arrivée doivent être différents",
      path: ["arrival_country"],
    },
  );

type FormData = z.infer<typeof schema>;

import { COMMON_CITIES } from "@/lib/constants/locations";

export default function NouvelleAnnoncePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState<FormData>();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = getValidToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setIsLoggedIn(true);
  }, [router]);

  const handlePreSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);

    try {
      // Si le pays de départ est la France, vérifier que l'adresse de dépôt existe bien
      if (data.departure_country === "France") {
        const checkPickup = await verifyAddressExists(data.pickup_address, "France");
        if (!checkPickup.isValid) {
          setError(
            checkPickup.error ||
              "L'adresse de dépôt n'est pas reconnue en France. Veuillez sélectionner une adresse existante dans les suggestions."
          );
          setLoading(false);
          return;
        }
      }

      // Si le pays d'arrivée est la France, vérifier que l'adresse de récupération existe bien
      if (data.arrival_country === "France") {
        const checkDropoff = await verifyAddressExists(data.dropoff_address, "France");
        if (!checkDropoff.isValid) {
          setError(
            checkDropoff.error ||
              "L'adresse de récupération n'est pas reconnue en France. Veuillez sélectionner une adresse existante dans les suggestions."
          );
          setLoading(false);
          return;
        }
      }

      setPendingData(data);
      setShowConfirmModal(true);
    } catch (err: any) {
      console.warn("Erreur vérification adresse:", err);
      setPendingData(data);
      setShowConfirmModal(true);
    } finally {
      setLoading(false);
    }
  };

  const defaultDepartureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      departure_city: "",
      departure_country: "France",
      arrival_city: "",
      arrival_country: "Sénégal",
      departure_date: defaultDepartureDate,
      flight_type: "direct",
      available_kg: 5,
      price_per_kg: 8,
      pickup_address: "",
      dropoff_address: "",
      description: "",
    },
  });

  const formValues = watch();
  const departureDateWatch = formValues.departure_date;
  const departureCountryWatch = formValues.departure_country;
  const arrivalCountryWatch = formValues.arrival_country;

  const isFormValid = Boolean(
    formValues.departure_city?.trim() &&
      formValues.departure_country?.trim() &&
      formValues.arrival_city?.trim() &&
      formValues.arrival_country?.trim() &&
      formValues.departure_country?.trim().toLowerCase() !==
        formValues.arrival_country?.trim().toLowerCase() &&
      formValues.departure_date &&
      formValues.available_kg &&
      formValues.available_kg > 0 &&
      formValues.price_per_kg &&
      formValues.price_per_kg > 0 &&
      formValues.pickup_address?.trim() &&
      formValues.dropoff_address?.trim() &&
      formValues.description?.trim() &&
      formValues.description.trim().length >= 10,
  );

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/gp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          is_active: true,
        }),
      });
      const dataR = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(dataR.message || dataR.error || "Erreur lors de la création de l'annonce");
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  if (success)
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="flex justify-center mb-4">
            <Plane size={64} className="text-[#1D6B45]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1D6B45] mb-2">
            Annonce publiée !
          </h2>
          <p className="text-gray-500 mb-8">
            Ton annonce est en ligne. Les expéditeurs peuvent maintenant te
            contacter.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/gp"
              className="bg-[#1D6B45] text-white px-8 py-3 rounded-xl font-medium hover:bg-[#0F4A30] transition-colors"
            >
              Voir les annonces
            </Link>
            <Link
              href="/dashboard"
              className="text-[#1D6B45] font-medium text-sm hover:underline"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-[#1D6B45] text-lg font-medium">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] pb-36">
      {/* Header */}
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <Link href="/gp" className="text-white/70 text-sm mb-4 inline-block">
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold text-white">Publier une annonce</h1>
        <p className="text-white/70 text-sm mt-1">
          Tu voyages ? Propose tes kilos disponibles
        </p>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(handlePreSubmit)} className="space-y-4">
          {/* Route */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center">
              <PlaneTakeoff size={18} className="inline mr-2 text-[#1D6B45]" /> Itinéraire
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ville de départ *
                </label>
                <input
                  {...register("departure_city")}
                  type="text"
                  list="departure-cities"
                  placeholder="Ex: Paris, Dakar..."
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                />
                <datalist id="departure-cities">
                  {COMMON_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {errors.departure_city && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.departure_city.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Pays de départ *
                </label>
                <select
                  {...register("departure_country", {
                    onChange: (e) => {
                      if (e.target.value === arrivalCountryWatch) {
                        const fallback = GP_COUNTRIES.find(
                          (c) => c !== e.target.value,
                        );
                        if (fallback) setValue("arrival_country", fallback);
                      }
                    },
                  })}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                >
                  {GP_COUNTRIES.filter((c) => c !== arrivalCountryWatch).map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ),
                  )}
                </select>
                {errors.departure_country && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.departure_country.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center my-2">
              <span className="text-[#1D6B45] text-xl font-bold">↓</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Ville d'arrivée *
                </label>
                <input
                  {...register("arrival_city")}
                  type="text"
                  list="arrival-cities"
                  placeholder="Ex: Dakar, Abidjan, Paris..."
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                />
                <datalist id="arrival-cities">
                  {COMMON_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {errors.arrival_city && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.arrival_city.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Pays d'arrivée *
                </label>
                <select
                  {...register("arrival_country", {
                    onChange: (e) => {
                      if (e.target.value === departureCountryWatch) {
                        const fallback = GP_COUNTRIES.find(
                          (c) => c !== e.target.value,
                        );
                        if (fallback) setValue("departure_country", fallback);
                      }
                    },
                  })}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                >
                  {GP_COUNTRIES.filter((c) => c !== departureCountryWatch).map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ),
                  )}
                </select>
                {errors.arrival_country && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.arrival_country.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Départ & Dépôt du colis */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
            <h2 className="font-semibold text-gray-800 mb-1 flex items-center">
              <PlaneTakeoff size={18} className="inline mr-2 text-[#1D6B45]" />
              Départ & Dépôt du colis
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Date du départ et lieu où les expéditeurs déposeront le colis
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date de départ *
                </label>
                <input
                  {...register("departure_date")}
                  type="date"
                  min={defaultDepartureDate}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                />
                {errors.departure_date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.departure_date.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Zone / quartier de dépôt du colis
                </label>
                <input
                  {...register("pickup_city")}
                  type="text"
                  placeholder="Ex: Paris 10e, Dakar Plateau, Gare du Nord..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Adresse précise de dépôt <span className="text-red-500">*</span>
                </label>
                {departureCountryWatch === "France" ? (
                  <AddressAutocomplete
                    value={watch("pickup_address") || ""}
                    onChange={(val) =>
                      setValue("pickup_address", val, { shouldValidate: true })
                    }
                    onSelectAddress={(item) => {
                      setValue("pickup_address", item.label, {
                        shouldValidate: true,
                      });
                      setValue("pickup_city", getQuarterOrCityFromAddress(item), {
                        shouldValidate: true,
                      });
                    }}
                    placeholder="Ex: 18 Rue de Dunkerque, 75010 Paris..."
                    required
                  />
                ) : (
                  <input
                    {...register("pickup_address")}
                    type="text"
                    placeholder="Ex: Rue, quartier ou repère précis de dépôt..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                  />
                )}
                {errors.pickup_address && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.pickup_address.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Arrivée & Récupération du colis */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
            <h2 className="font-semibold text-gray-800 mb-1 flex items-center">
              <PlaneLanding size={18} className="inline mr-2 text-[#D4870A]" />
              Arrivée & Récupération du colis
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Date d'arrivée et lieu où le colis sera récupéré à destination
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date d'arrivée
                </label>
                <input
                  {...register("arrival_date")}
                  type="date"
                  min={
                    departureDateWatch ||
                    new Date(Date.now() + 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                />
                {errors.arrival_date && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.arrival_date.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Zone / quartier de récupération du colis
                </label>
                <input
                  {...register("dropoff_city")}
                  type="text"
                  placeholder="Ex: Dakar Yoff, Abidjan Cocody, Douala Akwa..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Adresse précise de récupération <span className="text-red-500">*</span>
                </label>
                {arrivalCountryWatch === "France" ? (
                  <AddressAutocomplete
                    value={watch("dropoff_address") || ""}
                    onChange={(val) =>
                      setValue("dropoff_address", val, { shouldValidate: true })
                    }
                    onSelectAddress={(item) => {
                      setValue("dropoff_address", item.label, {
                        shouldValidate: true,
                      });
                      setValue("dropoff_city", getQuarterOrCityFromAddress(item), {
                        shouldValidate: true,
                      });
                    }}
                    placeholder="Ex: 18 Rue de Dunkerque, 75010 Paris..."
                    required
                  />
                ) : (
                  <input
                    {...register("dropoff_address")}
                    type="text"
                    placeholder="Ex: Aéroport, quartier, repère ou rue de retrait..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                  />
                )}
                {errors.dropoff_address && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.dropoff_address.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Vol & Type */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Plane size={18} className="inline mr-2 text-[#1D6B45]" /> Type de vol
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {(["direct", "escale"] as const).map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-[#1D6B45] transition-colors bg-white"
                >
                  <input
                    {...register("flight_type")}
                    type="radio"
                    value={type}
                    className="accent-[#1D6B45]"
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {type === "direct" ? "Vol direct" : "Avec escale"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Colis */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center">
              <Package size={18} className="inline mr-2 text-[#1D6B45]" /> Capacité & tarif
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Kilos disponibles *
                </label>
                <input
                  {...register("available_kg", { valueAsNumber: true })}
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="30"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                />
                {errors.available_kg && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.available_kg.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Prix par kg (€) *
                </label>
                <input
                  {...register("price_per_kg", { valueAsNumber: true })}
                  type="number"
                  step="0.5"
                  min="1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white"
                />
                {errors.price_per_kg && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.price_per_kg.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
            <h2 className="font-semibold text-gray-800 mb-1 flex items-center">
              <PenLine size={18} className="inline mr-2 text-[#1D6B45]" /> Présentation & Conditions
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Décris-toi et tes consignes pour rassurer les expéditeurs
            </p>
            <textarea
              {...register("description")}
              placeholder="Ex: Voyageur régulier depuis 3 ans. Sérieux et ponctuel. Colis remis en main propre à destination. Pas de liquides ni produits interdits."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none bg-white"
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Info sécurité */}
          <div className="bg-[#FFF8E1] border border-[#D4870A]/20 rounded-2xl p-4">
            <p className="text-sm font-semibold text-[#D4870A] mb-1">
              <Lock size={16} className="inline mr-2" /> Paiement sécurisé
            </p>
            <p className="text-xs text-gray-600">
              Le paiement des expéditeurs est bloqué jusqu'à confirmation de
              livraison. Tu es protégé à chaque trajet.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full bg-[#1D6B45] text-white py-4 rounded-2xl font-semibold text-base hover:bg-[#0F4A30] transition-all disabled:bg-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none shadow-sm cursor-pointer"
          >
            {loading ? "Publication..." : "Publier mon annonce"}
          </button>
        </form>
      </div>

      {/* Pop-up (Modale) de confirmation */}
      {showConfirmModal && pendingData && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !loading) setShowConfirmModal(false);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full mx-auto shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Publier l&apos;annonce
            </h3>
            <div className="text-gray-600 mb-6 text-sm space-y-2">
              <p>
                Trajet de{" "}
                <span className="font-bold text-gray-900">{pendingData.departure_city}</span> ({pendingData.departure_country}) vers{" "}
                <span className="font-bold text-gray-900">{pendingData.arrival_city}</span> ({pendingData.arrival_country}).
              </p>
              <div className="p-3 bg-gray-50 rounded-2xl text-xs space-y-1">
                <p className="flex items-center gap-1.5">
                  <PlaneTakeoff size={14} className="text-[#1D6B45] shrink-0" />
                  <span>
                    <strong>Départ :</strong>{" "}
                    {new Date(pendingData.departure_date).toLocaleDateString("fr-FR")}
                    {pendingData.pickup_city && ` (Dépôt : ${pendingData.pickup_city})`}
                  </span>
                </p>
                {pendingData.arrival_date && (
                  <p className="flex items-center gap-1.5">
                    <PlaneLanding size={14} className="text-[#D4870A] shrink-0" />
                    <span>
                      <strong>Arrivée :</strong>{" "}
                      {new Date(pendingData.arrival_date).toLocaleDateString("fr-FR")}
                      {pendingData.dropoff_city && ` (Récupération : ${pendingData.dropoff_city})`}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => onSubmit(pendingData)}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-[#1D6B45] text-white font-bold text-sm hover:bg-[#0F4A30] transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {loading ? "En cours..." : "Oui, publier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
