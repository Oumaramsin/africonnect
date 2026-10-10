"use client";

import { useEffect, useState, useMemo } from "react";
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
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Coins,
  ChevronRight,
  AlertTriangle,
  FileCheck2,
  Luggage,
  Clock,
  Info,
} from "lucide-react";
import { getValidToken, authFetch } from "@/lib/auth";
import AddressAutocomplete, {
  getQuarterOrCityFromAddress,
} from "@/components/AddressAutocomplete";
import { GP_COUNTRIES } from "@/lib/types/gp";
import { verifyAddressExists } from "@/lib/addressValidation";
import { COMMON_CITIES } from "@/lib/constants/locations";
import CountryFlag from "@/components/ui/CountryFlag";

const schema = z
  .object({
    departure_city: z.string().min(2, "Ville de départ requise"),
    departure_country: z.string().min(2, "Pays requis"),
    arrival_city: z.string().min(2, "Ville d'arrivée requise"),
    arrival_country: z.string().min(2, "Pays requis"),
    departure_date: z.string().min(1, "Date de départ requise"),
    arrival_date: z.string().optional(),
    available_kg: z
      .number()
      .min(0.5, "Minimum 0.5 kg")
      .max(50, "Maximum 50 kg"),
    price_per_kg: z.number().min(1, "Tarif requis (minimum 1 €/kg)"),
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

export default function NouvelleAnnoncePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState<FormData>();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [success, setSuccess] = useState(false);
  const [acceptCharter, setAcceptCharter] = useState(true);

  useEffect(() => {
    const token = getValidToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setIsLoggedIn(true);
  }, [router]);

  const defaultDepartureDate = useMemo(() => {
    return new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      departure_country: "France",
      arrival_country: "Sénégal",
      flight_type: "direct",
      available_kg: 15,
      price_per_kg: 12,
      departure_date: defaultDepartureDate,
      pickup_address: "",
      dropoff_address: "",
      pickup_city: "",
      dropoff_city: "",
      description: "",
    },
  });

  const departureCountryWatch = watch("departure_country");
  const arrivalCountryWatch = watch("arrival_country");
  const departureCityWatch = watch("departure_city");
  const arrivalCityWatch = watch("arrival_city");
  const departureDateWatch = watch("departure_date");
  const pickupAddressWatch = watch("pickup_address");
  const dropoffAddressWatch = watch("dropoff_address");
  const descriptionWatch = watch("description");
  const availableKgWatch = watch("available_kg") || 0;
  const pricePerKgWatch = watch("price_per_kg") || 0;

  // Calcul du revenu potentiel estimé
  const estimatedRevenue = availableKgWatch * pricePerKgWatch;

  const isFormValid =
    Boolean(departureCityWatch) &&
    departureCityWatch.trim().length >= 2 &&
    Boolean(arrivalCityWatch) &&
    arrivalCityWatch.trim().length >= 2 &&
    Boolean(departureDateWatch) &&
    Boolean(pickupAddressWatch) &&
    pickupAddressWatch.trim().length >= 3 &&
    Boolean(dropoffAddressWatch) &&
    dropoffAddressWatch.trim().length >= 3 &&
    Boolean(descriptionWatch) &&
    descriptionWatch.trim().length >= 10 &&
    departureCountryWatch.trim().toLowerCase() !==
      arrivalCountryWatch.trim().toLowerCase() &&
    acceptCharter;

  const handlePreSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);

    try {
      // Si le pays de départ est la France, vérifier que l'adresse de dépôt existe bien
      if (data.departure_country === "France") {
        const checkPickup = await verifyAddressExists(
          data.pickup_address,
          "France",
        );
        if (!checkPickup.isValid) {
          setError(
            checkPickup.error ||
              "L'adresse de dépôt n'est pas reconnue en France. Veuillez sélectionner une adresse existante dans les suggestions BAN.",
          );
          setLoading(false);
          return;
        }
      }

      // Si le pays d'arrivée est la France, vérifier que l'adresse de récupération existe bien
      if (data.arrival_country === "France") {
        const checkDropoff = await verifyAddressExists(
          data.dropoff_address,
          "France",
        );
        if (!checkDropoff.isValid) {
          setError(
            checkDropoff.error ||
              "L'adresse de récupération n'est pas reconnue en France. Veuillez sélectionner une adresse existante dans les suggestions BAN.",
          );
          setLoading(false);
          return;
        }
      }

      setPendingData(data);
      setShowConfirmModal(true);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || "Erreur de validation");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/gp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            departure_city: data.departure_city,
            departure_country: data.departure_country,
            arrival_city: data.arrival_city,
            arrival_country: data.arrival_country,
            departure_date: data.departure_date,
            arrival_date: data.arrival_date || null,
            available_kg: data.available_kg,
            price_per_kg: data.price_per_kg,
            flight_type: data.flight_type,
            pickup_address: data.pickup_address,
            pickup_city: data.pickup_city || null,
            dropoff_address: data.dropoff_address,
            dropoff_city: data.dropoff_city || null,
            description: data.description,
          }),
        },
      );

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(
          resData.message || "Erreur lors de la création de l'annonce",
        );
      }

      setShowConfirmModal(false);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Une erreur est survenue");
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 text-[#1D6B45] rounded-3xl flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 size={44} />
        </div>
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#1D6B45]">
            Annonce en ligne
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Votre annonce de vol est publiée !
          </h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
            Votre trajet est visible par les expéditeurs de la communauté. Vous
            recevrez une notification instantanée à chaque nouvelle demande de
            réservation.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/gp"
            className="px-6 py-3.5 bg-[#1D6B45] hover:bg-[#154d31] text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md"
          >
            Voir les annonces GP
          </Link>
          <Link
            href="/commandes"
            className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs sm:text-sm transition-colors"
          >
            Mes annonces & réservations
          </Link>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-10 h-10 border-4 border-[#1D6B45] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 text-sm mt-4 font-semibold">
          Connexion en cours...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 pb-28">
      {/* ── BREADCRUMB NAVIGATION ── */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link
          href="/gp"
          className="hover:text-[#1D6B45] transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={13} /> Tous les trajets GP
        </Link>
        <ChevronRight size={12} className="text-slate-300" />
        <span className="text-slate-900 font-bold">Publier un vol</span>
      </div>

      {/* ── HERO BANNER PUBLICATION ── */}
      <section className="relative overflow-hidden rounded-3xl md:rounded-[36px] bg-gradient-to-br from-[#123825] via-[#1D6B45] to-[#8C5806] text-white shadow-xl shadow-[#1D6B45]/10 p-6 sm:p-10">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-[#D4870A]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3.5 py-1 rounded-full border border-white/25 inline-block">
              Espace Voyageurs Certifiés
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Rentabilisez vos kilos disponibles
            </h1>
            <p className="text-white/85 text-xs sm:text-sm leading-relaxed">
              Transportez des colis en toute légalité et sécurité. Votre paiement
              est consigné sous séquestre par Dabari et débloqué à la remise.
            </p>
          </div>

          {/* Simulateur de gains instantané */}
          <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-3xl p-5 text-center shrink-0 self-stretch md:self-auto space-y-1">
            <span className="text-[11px] font-bold text-white/75 uppercase tracking-wider block flex items-center justify-center gap-1">
              <Coins size={14} className="text-amber-300" /> Gains estimés
            </span>
            <div className="text-3xl font-black text-amber-300">
              {estimatedRevenue.toFixed(0)} €
            </div>
            <span className="text-[11px] text-white/80 block">
              {availableKgWatch} kg × {pricePerKgWatch} €/kg
            </span>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── FORMULAIRE ADAPTÉ PC & MOBILE ── */}
      <form
        id="publish-gp-form"
        onSubmit={handleSubmit(handlePreSubmit)}
        className="space-y-6"
      >
        {/* 1. ITINÉRAIRE */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#1D6B45] flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">
                Itinéraire du vol
              </h2>
              <p className="text-xs text-slate-500">
                Pays et villes reliés lors de votre voyage
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Départ */}
            <div className="space-y-3.5 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <PlaneTakeoff size={16} className="text-[#1D6B45]" />
                <span>Point de départ</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pays de départ *
                </label>
                <div className="relative">
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
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm bg-white font-medium text-slate-800 cursor-pointer"
                  >
                    {GP_COUNTRIES.filter((c) => c !== arrivalCountryWatch).map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ville de départ *
                </label>
                <input
                  {...register("departure_city")}
                  type="text"
                  list="departure-cities"
                  placeholder="Ex: Paris, Lyon, Dakar..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm bg-white font-medium"
                />
                <datalist id="departure-cities">
                  {COMMON_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {errors.departure_city && (
                  <p className="text-rose-500 text-xs mt-1">
                    {errors.departure_city.message}
                  </p>
                )}
              </div>
            </div>

            {/* Arrivée */}
            <div className="space-y-3.5 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <PlaneLanding size={16} className="text-[#D4870A]" />
                <span>Destination finale</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm bg-white font-medium text-slate-800 cursor-pointer"
                >
                  {GP_COUNTRIES.filter((c) => c !== departureCountryWatch).map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ville d'arrivée *
                </label>
                <input
                  {...register("arrival_city")}
                  type="text"
                  list="arrival-cities"
                  placeholder="Ex: Dakar, Abidjan, Douala..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm bg-white font-medium"
                />
                <datalist id="arrival-cities">
                  {COMMON_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {errors.arrival_city && (
                  <p className="text-rose-500 text-xs mt-1">
                    {errors.arrival_city.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. DÉPÔT ET RÉCUPÉRATION AVEC BASE ADRESSE NATIONALE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Départ & Dépôt */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#1D6B45] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h2 className="font-extrabold text-slate-900 text-base">
                Collecte & Dépôt
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date de départ de votre vol *
              </label>
              <input
                {...register("departure_date")}
                type="date"
                min={defaultDepartureDate}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm bg-white font-medium"
              />
              {errors.departure_date && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.departure_date.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quartier / Zone indicative
              </label>
              <input
                {...register("pickup_city")}
                type="text"
                placeholder="Ex: Paris 10e Gare du Nord, Dakar Plateau..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Adresse précise de rendez-vous *
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
                  placeholder="Ex: Rue, repère ou quartier de dépôt..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm"
                />
              )}
              {errors.pickup_address && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.pickup_address.message}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <MapPin size={11} /> Lieu où l'expéditeur vous remettra le colis
              </p>
            </div>
          </div>

          {/* Arrivée & Retrait */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-[#D4870A] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h2 className="font-extrabold text-slate-900 text-base">
                Arrivée & Remise au destinataire
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date d'arrivée estimée
              </label>
              <input
                {...register("arrival_date")}
                type="date"
                min={departureDateWatch || defaultDepartureDate}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm bg-white font-medium"
              />
              {errors.arrival_date && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.arrival_date.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quartier / Zone de remise
              </label>
              <input
                {...register("dropoff_city")}
                type="text"
                placeholder="Ex: Dakar Yoff, Abidjan Cocody..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Adresse ou aéroport de retrait *
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
                  placeholder="Ex: Aéroport CDG Terminal 2, Paris..."
                  required
                />
              ) : (
                <input
                  {...register("dropoff_address")}
                  type="text"
                  placeholder="Ex: Aéroport AIBD, ou quartier de retrait..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm"
                />
              )}
              {errors.dropoff_address && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.dropoff_address.message}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <MapPin size={11} /> Lieu de remise en mains propres
              </p>
            </div>
          </div>
        </div>

        {/* 3. CAPACITÉ, TARIF & TYPE DE VOL */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#1D6B45] flex items-center justify-center font-bold text-xs">
              4
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">
                Capacité en kilos & Tarification
              </h2>
              <p className="text-xs text-slate-500">
                Fixez le nombre de kilos et votre prix unitaire
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Kilos */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kilos disponibles (max 50 kg) *
              </label>
              <input
                {...register("available_kg", { valueAsNumber: true })}
                type="number"
                step="0.5"
                min="0.5"
                max="50"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm font-black text-slate-900"
              />
              {errors.available_kg && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.available_kg.message}
                </p>
              )}
            </div>

            {/* Prix / kg */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tarif au kilo (€ TTC) *
              </label>
              <input
                {...register("price_per_kg", { valueAsNumber: true })}
                type="number"
                step="0.5"
                min="1"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-sm font-black text-[#1D6B45]"
              />
              {errors.price_per_kg && (
                <p className="text-rose-500 text-xs mt-1">
                  {errors.price_per_kg.message}
                </p>
              )}
            </div>

            {/* Type de vol */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Type de vol *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["direct", "escale"] as const).map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-1.5 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:border-[#1D6B45] transition-colors bg-slate-50/50 text-xs font-bold text-slate-800"
                  >
                    <input
                      {...register("flight_type")}
                      type="radio"
                      value={type}
                      className="accent-[#1D6B45]"
                    />
                    <span className="capitalize">
                      {type === "direct" ? "Direct" : "Escale"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4. CONSIGNES & CONDITIONS POUR LES EXPÉDITEURS */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <PenLine size={18} className="text-[#1D6B45]" />
            <h2 className="font-extrabold text-slate-900 text-base">
              Consignes & Conditions pour vos expéditeurs
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Précisez vos disponibilités, les types de colis acceptés ou refusés
            (ex: uniquement denrées sèches scellées, pas de liquides...).
          </p>
          <textarea
            {...register("description")}
            placeholder="Ex: Voyageur sérieux régulier. Colis inspectés ensemble au dépôt pour conformité aérienne IATA. Remise possible à l'aéroport ou à domicile."
            rows={4}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-[#1D6B45] focus:outline-hidden text-xs leading-relaxed font-medium"
          />
          {errors.description && (
            <p className="text-rose-500 text-xs">{errors.description.message}</p>
          )}

          {/* Charte sur l'honneur */}
          <label className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptCharter}
              onChange={(e) => setAcceptCharter(e.target.checked)}
              className="accent-[#1D6B45] mt-1 shrink-0 cursor-pointer"
            />
            <span className="text-xs text-slate-700 leading-relaxed font-medium">
              <strong className="text-slate-900 block mb-0.5">
                Engagement de conformité douanière & IATA :
              </strong>
              Je certifie que j'inspecterai le contenu de chaque colis avec
              l'expéditeur avant d'embarquer et que je refuserai toute marchandise
              illicite, liquide non autorisé ou produit dangereux.
            </span>
          </label>
        </div>

        {/* 5. SÉCURITÉ & SUBMIT */}
        <div className="bg-emerald-50 rounded-2xl p-4 sm:p-5 border border-emerald-100 flex items-center gap-3.5">
          <ShieldCheck size={24} className="text-[#1D6B45] shrink-0" />
          <p className="text-xs sm:text-sm text-emerald-900/90 leading-relaxed">
            <strong>Garantie Séquestre Dabari :</strong> Vos gains vous sont
            transférés dès que le destinataire confirme la remise de son colis.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !isFormValid}
          className="w-full bg-[#1D6B45] hover:bg-[#154d31] disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 px-6 rounded-2xl font-black text-sm sm:text-base shadow-md transition-all hover:scale-101 cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Plane size={18} />
              <span>Publier mon vol GP ({estimatedRevenue.toFixed(0)} € potentiels)</span>
            </>
          )}
        </button>
      </form>

      {/* ── BARRE MOBILE STICKY ── */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 z-40 lg:hidden shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">
              Gains estimés ({availableKgWatch} kg)
            </span>
            <span className="text-xl font-black text-[#1D6B45]">
              {estimatedRevenue.toFixed(0)} €
            </span>
          </div>
          <button
            type="submit"
            form="publish-gp-form"
            disabled={loading || !isFormValid}
            className="flex-1 max-w-[220px] bg-[#1D6B45] text-white py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm hover:bg-[#155235] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-center cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Publier mon vol</span>
            )}
          </button>
        </div>
      </div>

      {/* ── MODALE DE CONFIRMATION AVANT PUBLICATION ── */}
      {showConfirmModal && pendingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-emerald-100 text-[#1D6B45] rounded-2xl flex items-center justify-center shadow-xs">
              <Plane size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 text-xl">
                Confirmer la publication du vol
              </h3>
              <p className="text-xs text-slate-500">
                Votre annonce sera visible dès validation
              </p>
            </div>

            <div className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-slate-200/80 text-xs space-y-2.5 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Trajet :</span>
                <strong className="text-slate-900">
                  {pendingData.departure_city} ➔ {pendingData.arrival_city}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Départ :</span>
                <strong className="text-slate-900">
                  {new Date(pendingData.departure_date).toLocaleDateString(
                    "fr-FR",
                  )}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Capacité :</span>
                <strong className="text-slate-900">
                  {pendingData.available_kg} kg à {pendingData.price_per_kg} €/kg
                </strong>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-sm">
                <span className="text-slate-800">Revenu potentiel :</span>
                <span className="text-[#1D6B45]">
                  {(
                    pendingData.available_kg * pendingData.price_per_kg
                  ).toFixed(0)}{" "}
                  €
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3.5 rounded-2xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => onSubmit(pendingData)}
                disabled={loading}
                className="flex-1 py-3.5 rounded-2xl text-xs font-bold bg-[#1D6B45] text-white hover:bg-[#154d31] transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {loading ? "Publication..." : "Confirmer la publication"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
