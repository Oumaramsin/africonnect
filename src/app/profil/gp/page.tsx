"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Calendar,
  MapPin,
  Package,
  Scale,
  ArrowRight,
  X,
  PenLine,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  Check,
  Clock,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getValidToken, removeToken, authFetch } from "@/lib/auth";
import AddressAutocomplete, {
  getQuarterOrCityFromAddress,
} from "@/components/AddressAutocomplete";
import { GP_COUNTRIES, getFlag } from "@/lib/types/gp";
import { COMMON_CITIES } from "@/lib/constants/locations";

interface Gp {
  id: string;
  departure_city: string;
  departure_country?: string;
  arrival_city: string;
  arrival_country?: string;
  departure_date: Date | string;
  arrival_date?: Date | string | null;
  available_kg: number;
  price_per_kg: number;
  flight_type?: "direct" | "escale";
  pickup_address?: string;
  pickup_city?: string;
  dropoff_address?: string;
  dropoff_city?: string;
  description?: string;
  is_delayed?: boolean;
  delay_reason?: string | null;
  is_active: boolean;
}

export default function GpEspacePage() {
  const router = useRouter();
  const [view, setView] = useState<"annonces" | "edit">("annonces");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [gp, setGP] = useState<Gp[] | null>([]);
  const [loading, setLoading] = useState(true);
  const [editGpId, setEditGpId] = useState<string | null>(null);
  const [deleteGpId, setDeleteGpId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const defaultDepartureDate = useMemo(() => {
    return new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
  }, []);

  const [formData, setFormData] = useState({
    departure_city: "",
    departure_country: "France",
    arrival_city: "",
    arrival_country: "Sénégal",
    departure_date: defaultDepartureDate,
    arrival_date: "",
    available_kg: "",
    price_per_kg: "",
    flight_type: "direct" as "direct" | "escale",
    pickup_address: "",
    pickup_city: "",
    dropoff_address: "",
    dropoff_city: "",
    description: "",
    is_active: true,
  });

  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(
    null,
  );

  useEffect(() => {
    if (!deleteGpId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDeleteGpId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteGpId]);

  function startEdit(annonce: Gp) {
    setEditGpId(annonce.id);
    const initial = {
      departure_city: annonce.departure_city || "",
      departure_country: annonce.departure_country || "France",
      arrival_city: annonce.arrival_city || "",
      arrival_country: annonce.arrival_country || "Sénégal",
      departure_date: annonce.departure_date
        ? new Date(annonce.departure_date).toISOString().split("T")[0]
        : "",
      arrival_date: annonce.arrival_date
        ? new Date(annonce.arrival_date).toISOString().split("T")[0]
        : "",
      available_kg: (annonce.available_kg ?? "").toString(),
      price_per_kg: (annonce.price_per_kg ?? "").toString(),
      flight_type: (annonce.flight_type as "direct" | "escale") || "direct",
      pickup_address: annonce.pickup_address || "",
      pickup_city: annonce.pickup_city || "",
      dropoff_address: annonce.dropoff_address || "",
      dropoff_city: annonce.dropoff_city || "",
      description: annonce.description || "",
      is_active: annonce.is_active ?? true,
    };
    setFormData(initial);
    setInitialFormData(initial);
    setView("edit");
  }

  async function handleDeleteGp() {
    if (!deleteGpId) return;
    setIsDeleting(true);
    try {
      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/gp/${deleteGpId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        const res = await response.json();
        throw new Error(res.error || "Erreur lors de la suppression");
      }

      setGP((prev) =>
        prev ? prev.filter((item) => item.id !== deleteGpId) : [],
      );
      setDeleteGpId(null);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Erreur lors de la suppression :", err);
      alert("Une erreur est survenue : " + (err.message || "Erreur"));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleEditGp() {
    if (!editGpId) return;
    setIsSaving(true);
    try {
      if (formData.departure_country === formData.arrival_country) {
        alert("Le pays de départ et le pays d'arrivée doivent être différents.");
        setIsSaving(false);
        return;
      }
      if (
        formData.arrival_date &&
        formData.departure_date &&
        new Date(formData.departure_date) > new Date(formData.arrival_date)
      ) {
        alert(
          "La date de départ ne peut pas être postérieure à la date d'arrivée.",
        );
        setIsSaving(false);
        return;
      }
      if (!formData.pickup_address || !formData.pickup_address.trim()) {
        alert("L'adresse précise de dépôt est obligatoire.");
        setIsSaving(false);
        return;
      }
      if (!formData.dropoff_address || !formData.dropoff_address.trim()) {
        alert("L'adresse précise de récupération est obligatoire.");
        setIsSaving(false);
        return;
      }

      const payload = {
        departure_city: formData.departure_city,
        departure_country: formData.departure_country,
        arrival_city: formData.arrival_city,
        arrival_country: formData.arrival_country,
        departure_date: formData.departure_date,
        arrival_date: formData.arrival_date || null,
        available_kg: parseFloat(formData.available_kg),
        price_per_kg: parseFloat(formData.price_per_kg),
        flight_type: formData.flight_type,
        pickup_address: formData.pickup_address,
        pickup_city: formData.pickup_city,
        dropoff_address: formData.dropoff_address,
        dropoff_city: formData.dropoff_city,
        description: formData.description,
        is_active: formData.is_active,
      };

      const response = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/gp/${editGpId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.error || "Erreur lors de la mise à jour");
      }

      const updatedGp = res.data?.gp || res.data;
      setGP((prev) =>
        prev
          ? prev.map((item) =>
              item.id === editGpId ? { ...item, ...updatedGp } : item,
            )
          : [],
      );

      setView("annonces");
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("Erreur lors de la mise à jour :", err);
      alert("Une erreur est survenue : " + (err.message || "Erreur"));
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    async function loadGP() {
      const token = getValidToken();
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await authFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/gp/me`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        if (response.status === 401) {
          removeToken();
          router.push("/login");
          return;
        }
        const res = await response.json();
        if (!response.ok) {
          console.error(res.error || "Erreur de chargement des trajets");
          return;
        }
        setGP(res.data.gp || []);
      } catch (err) {
        console.error("Erreur récupération GP me:", err);
      } finally {
        setLoading(false);
      }
    }
    loadGP();
  }, [router]);

  // Statistiques calculées
  const activeCount = useMemo(
    () => gp?.filter((item) => item.is_active).length || 0,
    [gp],
  );
  const totalKg = useMemo(
    () =>
      gp?.reduce((acc, item) => acc + (Number(item.available_kg) || 0), 0) || 0,
    [gp],
  );
  const potentialRevenue = useMemo(
    () =>
      gp?.reduce(
        (acc, item) =>
          acc +
          (Number(item.available_kg) || 0) * (Number(item.price_per_kg) || 0),
        0,
      ) || 0,
    [gp],
  );

  const filteredGps = useMemo(() => {
    if (!gp) return [];
    if (filter === "active") return gp.filter((item) => item.is_active);
    if (filter === "inactive") return gp.filter((item) => !item.is_active);
    return gp;
  }, [gp, filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-[#1D6B45] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-700">
          Chargement de votre espace GP...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-24">
      {/* Header Hero Vert Desktop & Mobile */}
      <div className="bg-gradient-to-r from-[#1D6B45] via-[#165637] to-[#0F4A30] text-white border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Breadcrumb / Nav Retour */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <Link
              href="/profil"
              className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-semibold bg-white/10 px-3.5 py-1.5 rounded-xl backdrop-blur-xs transition-colors"
            >
              <ArrowLeft size={14} /> Espace Mon Compte
            </Link>

            <Link
              href="/gp/nouvelle"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#D4870A] hover:bg-[#b87408] text-white px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              <Plus size={15} />
              <span>Publier un vol</span>
            </Link>
          </div>

          {/* Identity & KPI Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pt-2">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/10 border-2 border-white/20 flex items-center justify-center shrink-0 shadow-xs">
                <Plane className="w-9 h-9 sm:w-10 sm:h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Espace Transporteur GP
                </h1>
                <p className="text-white/80 text-xs sm:text-sm mt-1">
                  Gestion de vos trajets, suivi de vos capacités de bagages et
                  délais
                </p>
              </div>
            </div>

            {/* Barre de métriques rapides */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-3 rounded-2xl text-center">
                <span className="block text-xl font-extrabold text-white">
                  {gp?.length || 0}
                </span>
                <span className="text-[11px] text-white/70">Vols créés</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-3 rounded-2xl text-center">
                <span className="block text-xl font-extrabold text-emerald-300">
                  {activeCount}
                </span>
                <span className="text-[11px] text-white/70">En cours</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-3 rounded-2xl text-center">
                <span className="block text-xl font-extrabold text-amber-300">
                  {totalKg.toFixed(1)} kg
                </span>
                <span className="text-[11px] text-white/70">Capacité totale</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-3 rounded-2xl text-center">
                <span className="block text-xl font-extrabold text-white">
                  {potentialRevenue.toFixed(0)} €
                </span>
                <span className="text-[11px] text-white/70">Potentiel brut</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => setView("annonces")}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                view === "annonces"
                  ? "bg-white text-[#1D6B45] shadow-sm"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <Package size={15} />
              <span>Mes annonces ({gp?.length || 0})</span>
            </button>
            <Link
              href="/gp/nouvelle"
              className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all bg-white/15 text-white hover:bg-white/25 flex items-center gap-2"
            >
              <PlaneTakeoff size={15} />
              <span>+ Nouveau trajet</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6">
        {/* --- VUE LISTE DES ANNONCES --- */}
        {view === "annonces" && (
          <div className="space-y-6">
            {/* Barre de filtre et total */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Vos trajets de transport de bagages
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consultez vos annonces publiées et gérez leur statut.
                </p>
              </div>

              {/* Filtres de statut */}
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filter === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tous ({gp?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("active")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filter === "active"
                      ? "bg-white text-[#1D6B45] shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Actifs ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("inactive")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filter === "inactive"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Terminés ({((gp?.length || 0) - activeCount)})
                </button>
              </div>
            </div>

            {/* Grille responsive des trajets GP (3 colonnes desktop) */}
            {filteredGps.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto shadow-xs">
                <div className="w-16 h-16 bg-[#E8F5E9] text-[#1D6B45] rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Plane size={32} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  Aucun vol dans cette catégorie
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Publiez vos kilos disponibles sur votre prochain vol et
                  rentabilisez vos bagages en aidant la communauté.
                </p>
                <Link
                  href="/gp/nouvelle"
                  className="bg-[#1D6B45] text-white px-6 py-3 rounded-2xl font-bold text-xs hover:bg-[#155235] transition-colors shadow-xs inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>Publier mon premier trajet</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGps.map((annonce) => {
                  const depFlag = getFlag(annonce.departure_country || "France");
                  const arrFlag = getFlag(annonce.arrival_country || "Sénégal");
                  const totalTripRevenue =
                    (Number(annonce.available_kg) || 0) *
                    (Number(annonce.price_per_kg) || 0);

                  return (
                    <div
                      key={annonce.id}
                      className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      {/* En-tête vol façon Boarding Pass */}
                      <div>
                        <div className="p-5 bg-gradient-to-r from-slate-50 to-emerald-50/30 border-b border-slate-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Plane size={13} className="text-[#1D6B45]" />
                              {annonce.flight_type === "escale"
                                ? "Vol avec escale"
                                : "Vol direct"}
                            </span>

                            <div className="flex items-center gap-2">
                              {annonce.is_delayed && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                  <AlertTriangle size={11} className="text-amber-800" />
                                  <span>Retardé</span>
                                </span>
                              )}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  annonce.is_active
                                    ? "bg-[#E8F5E9] text-[#1D6B45]"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {annonce.is_active ? "● Actif" : "Terminé"}
                              </span>
                            </div>
                          </div>

                          {/* Itinéraire avec drapeaux */}
                          <div className="flex items-center justify-between gap-3 pt-1">
                            <div className="text-left">
                              <div className="text-xl font-black text-slate-900 flex items-center gap-1.5">
                                <span>{depFlag}</span>
                                <span className="truncate max-w-[110px]">
                                  {annonce.departure_city}
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold text-slate-400">
                                {annonce.departure_country || "France"}
                              </p>
                            </div>

                            <div className="flex flex-col items-center px-2">
                              <Plane
                                size={18}
                                className="text-[#1D6B45] rotate-90 my-0.5"
                              />
                              <span className="text-[10px] text-slate-400">
                                Vers
                              </span>
                            </div>

                            <div className="text-right">
                              <div className="text-xl font-black text-[#1D6B45] flex items-center justify-end gap-1.5">
                                <span className="truncate max-w-[110px]">
                                  {annonce.arrival_city}
                                </span>
                                <span>{arrFlag}</span>
                              </div>
                              <p className="text-[11px] font-semibold text-emerald-800/60">
                                {annonce.arrival_country || "Afrique"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Alerte retard si activée */}
                        {annonce.is_delayed && (
                          <div className="m-4 mb-0 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                            <AlertTriangle
                              size={16}
                              className="text-amber-700 shrink-0 mt-0.5"
                            />
                            <div>
                              <p className="font-bold text-amber-950">
                                Vol signalé comme retardé
                              </p>
                              {annonce.delay_reason && (
                                <p className="text-amber-800 text-[11px] mt-0.5">
                                  {annonce.delay_reason}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Dates et Adresses */}
                        <div className="p-5 space-y-3">
                          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                Date départ
                              </span>
                              <span className="font-extrabold text-slate-900 block">
                                {new Date(
                                  annonce.departure_date,
                                ).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              {annonce.pickup_city && (
                                <span
                                  className="text-[11px] text-slate-500 truncate mt-0.5 inline-flex items-center gap-1"
                                  title={annonce.pickup_city}
                                >
                                  <MapPin size={11} className="text-[#1D6B45] shrink-0" />
                                  <span>{annonce.pickup_city}</span>
                                </span>
                              )}
                            </div>

                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                Date arrivée
                              </span>
                              <span className="font-extrabold text-slate-900 block">
                                {annonce.arrival_date
                                  ? new Date(
                                      annonce.arrival_date,
                                    ).toLocaleDateString("fr-FR", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "Non précisée"}
                              </span>
                              {annonce.dropoff_city && (
                                <span
                                  className="text-[11px] text-slate-500 truncate mt-0.5 inline-flex items-center gap-1"
                                  title={annonce.dropoff_city}
                                >
                                  <MapPin size={11} className="text-[#1D6B45] shrink-0" />
                                  <span>{annonce.dropoff_city}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Capacité et Tarif */}
                          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF7F2] border border-amber-200/60">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Capacité bagages
                              </span>
                              <span className="text-base font-black text-slate-900">
                                {annonce.available_kg} kg
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Tarif au kilo
                              </span>
                              <span className="text-base font-black text-[#1D6B45]">
                                {Number(annonce.price_per_kg).toFixed(2)} €/kg
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Barre d'actions */}
                      <div className="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between gap-2">
                        <Link
                          href={`/gp/${annonce.id}`}
                          target="_blank"
                          className="text-xs font-bold text-slate-600 hover:text-[#1D6B45] hover:bg-emerald-50 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                        >
                          <Eye size={14} />
                          <span>Voir la fiche</span>
                        </Link>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(annonce)}
                            className="p-2 text-slate-600 hover:text-[#1D6B45] hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteGpId(annonce.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- VUE MODIFICATION DU TRAJET (2 Colonnes Desktop) --- */}
        {view === "edit" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Formulaire (8 colonnes) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Modifier votre annonce de vol
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Itinéraire : {formData.departure_city} →{" "}
                    {formData.arrival_city}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setView("annonces")}
                  className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
              </div>

              {/* 1. Itinéraire */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <PlaneTakeoff size={20} className="text-[#1D6B45]" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Itinéraire du voyage
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Ville de départ *
                    </label>
                    <input
                      type="text"
                      list="edit-departure-cities"
                      value={formData.departure_city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          departure_city: e.target.value,
                        })
                      }
                      placeholder="Ex: Paris, Lyon, Marseille..."
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                      required
                    />
                    <datalist id="edit-departure-cities">
                      {COMMON_CITIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Pays de départ *
                    </label>
                    <select
                      value={formData.departure_country}
                      onChange={(e) => {
                        const newDep = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          departure_country: newDep,
                          arrival_country:
                            prev.arrival_country === newDep
                              ? newDep === "France"
                                ? "Sénégal"
                                : "France"
                              : prev.arrival_country,
                        }));
                      }}
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                    >
                      {GP_COUNTRIES.filter(
                        (c) => c !== formData.arrival_country,
                      ).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Ville d'arrivée *
                    </label>
                    <input
                      type="text"
                      list="edit-arrival-cities"
                      value={formData.arrival_city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          arrival_city: e.target.value,
                        })
                      }
                      placeholder="Ex: Dakar, Abidjan, Douala..."
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                      required
                    />
                    <datalist id="edit-arrival-cities">
                      {COMMON_CITIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Pays d'arrivée *
                    </label>
                    <select
                      value={formData.arrival_country}
                      onChange={(e) => {
                        const newArr = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          arrival_country: newArr,
                          departure_country:
                            prev.departure_country === newArr
                              ? newArr === "France"
                                ? "Sénégal"
                                : "France"
                              : prev.departure_country,
                        }));
                      }}
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                    >
                      {GP_COUNTRIES.filter(
                        (c) => c !== formData.departure_country,
                      ).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Départ & Dépôt */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <Calendar size={20} className="text-[#1D6B45]" />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Départ & Dépôt du colis
                    </h3>
                    <p className="text-xs text-slate-500">
                      Où et quand l'expéditeur doit déposer les bagages
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Date de départ *
                    </label>
                    <input
                      type="date"
                      min={defaultDepartureDate}
                      value={formData.departure_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          departure_date: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Zone / Quartier de dépôt
                    </label>
                    <input
                      type="text"
                      value={formData.pickup_city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pickup_city: e.target.value,
                        })
                      }
                      placeholder="Ex: Paris 18e, Gare du Nord, Bobigny..."
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Adresse précise de dépôt *
                    <span className="text-slate-400 font-normal lowercase ml-1">
                      (partagée après accord)
                    </span>
                  </label>
                  {formData.departure_country === "France" ? (
                    <AddressAutocomplete
                      value={formData.pickup_address}
                      onChange={(val) =>
                        setFormData({
                          ...formData,
                          pickup_address: val,
                        })
                      }
                      onSelectAddress={(item) =>
                        setFormData({
                          ...formData,
                          pickup_address: item.label,
                          pickup_city: getQuarterOrCityFromAddress(item),
                        })
                      }
                      placeholder="Ex: 18 Rue de Dunkerque, 75010 Paris..."
                      required
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.pickup_address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pickup_address: e.target.value,
                        })
                      }
                      placeholder="Ex: Rue 10 angle Boulevard Dial Diop..."
                      required
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                    />
                  )}
                </div>
              </div>

              {/* 3. Arrivée & Récupération */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <PlaneLanding size={20} className="text-[#D4870A]" />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Arrivée & Récupération à destination
                    </h3>
                    <p className="text-xs text-slate-500">
                      Lieu et date de remise en main propre
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Date d'arrivée estimée
                    </label>
                    <input
                      type="date"
                      min={formData.departure_date}
                      value={formData.arrival_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          arrival_date: e.target.value,
                        })
                      }
                      className={`w-full px-4 py-3.5 rounded-2xl border ${
                        formData.departure_date &&
                        formData.arrival_date &&
                        new Date(formData.departure_date) >
                          new Date(formData.arrival_date)
                          ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20"
                          : "border-slate-200 focus:ring-[#1D6B45] bg-white"
                      } focus:outline-none focus:ring-2 text-sm font-medium text-slate-800`}
                    />
                    {Boolean(
                      formData.departure_date &&
                        formData.arrival_date &&
                        new Date(formData.departure_date) >
                          new Date(formData.arrival_date),
                    ) && (
                      <p className="text-rose-500 text-xs mt-1.5 font-semibold flex items-center gap-1">
                        <AlertTriangle size={13} />
                        La date de départ ne peut pas être postérieure à la date d'arrivée.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Zone / Quartier de récupération
                    </label>
                    <input
                      type="text"
                      value={formData.dropoff_city}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dropoff_city: e.target.value,
                        })
                      }
                      placeholder="Ex: Dakar Yoff, Abidjan Cocody..."
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Adresse précise de récupération *
                    <span className="text-slate-400 font-normal lowercase ml-1">
                      (partagée après accord)
                    </span>
                  </label>
                  {formData.arrival_country === "France" ? (
                    <AddressAutocomplete
                      value={formData.dropoff_address}
                      onChange={(val) =>
                        setFormData({
                          ...formData,
                          dropoff_address: val,
                        })
                      }
                      onSelectAddress={(item) =>
                        setFormData({
                          ...formData,
                          dropoff_address: item.label,
                          dropoff_city: getQuarterOrCityFromAddress(item),
                        })
                      }
                      placeholder="Ex: 18 Rue de Dunkerque, 75010 Paris..."
                      required
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.dropoff_address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dropoff_address: e.target.value,
                        })
                      }
                      placeholder="Ex: Aéroport Blaise Diagne, Rue 12 Médina..."
                      required
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                    />
                  )}
                </div>
              </div>

              {/* 4. Capacité, Tarif & Statut */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <Scale size={20} className="text-[#1D6B45]" />
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Capacité, Tarif & Statut
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Kilos dispo *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="50"
                      value={formData.available_kg}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          available_kg: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-bold text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Prix au kilo (€) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={formData.price_per_kg}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_per_kg: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-bold text-[#1D6B45]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Type de vol
                    </label>
                    <select
                      value={formData.flight_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          flight_type: e.target.value as "direct" | "escale",
                        })
                      }
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                    >
                      <option value="direct">Direct</option>
                      <option value="escale">Avec escale</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Statut de l'annonce
                    </label>
                    <select
                      value={formData.is_active ? "actif" : "termine"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.value === "actif",
                        })
                      }
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm bg-white font-medium text-slate-800"
                    >
                      <option value="actif">Actif (En ligne)</option>
                      <option value="termine">Terminé / Clos</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 5. Présentation & Consignes */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <PenLine size={20} className="text-[#1D6B45]" />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Consignes & Présentation
                    </h3>
                    <p className="text-xs text-slate-500">
                      Rassurez les expéditeurs sur le sérieux et la ponctualité de
                      votre voyage
                    </p>
                  </div>
                </div>

                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Ex: Voyageur sérieux et régulier. Remise en main propre dès l'arrivée. Vérification conjointe des colis avant scellage. Pas de liquides ni produits interdits."
                  rows={4}
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] text-sm resize-none bg-white font-medium text-slate-800 leading-relaxed"
                />
              </div>
            </div>

            {/* Sidebar Live Ticket Preview (4 colonnes) */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#D4870A]" />
                    Aperçu de la carte vol
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      formData.is_active
                        ? "bg-[#E8F5E9] text-[#1D6B45]"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {formData.is_active ? "En ligne" : "Masqué"}
                  </span>
                </div>

                {/* Ticket Visuel */}
                <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">
                      {formData.departure_city || "Départ"}
                    </span>
                    <Plane size={15} className="text-[#1D6B45] rotate-90" />
                    <span className="text-sm font-black text-[#1D6B45]">
                      {formData.arrival_city || "Arrivée"}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Date départ :</span>
                      <span className="font-bold text-slate-900">
                        {formData.departure_date}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Capacité :</span>
                      <span className="font-bold text-slate-900">
                        {formData.available_kg || "0"} kg
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tarif :</span>
                      <span className="font-black text-[#1D6B45]">
                        {formData.price_per_kg || "0"} €/kg
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bouton de mise à jour */}
                <div className="pt-2">
                  {(() => {
                    const isFormModified =
                      !initialFormData ||
                      JSON.stringify(formData) !==
                        JSON.stringify(initialFormData);
                    const isDateRangeInvalid = Boolean(
                      formData.departure_date &&
                        formData.arrival_date &&
                        new Date(formData.departure_date) >
                          new Date(formData.arrival_date),
                    );

                    return (
                      <button
                        type="button"
                        disabled={
                          !isFormModified || isSaving || isDateRangeInvalid
                        }
                        onClick={handleEditGp}
                        className={`w-full py-4 rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
                          isFormModified && !isSaving && !isDateRangeInvalid
                            ? "bg-[#1D6B45] text-white hover:bg-[#155235] shadow-md cursor-pointer"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                        }`}
                      >
                        {isSaving ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Mise à jour en cours...</span>
                          </div>
                        ) : isDateRangeInvalid ? (
                          "Dates de vol invalides"
                        ) : isFormModified ? (
                          "Mettre à jour le trajet"
                        ) : (
                          "Aucune modification"
                        )}
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Charte de sécurité GP */}
              <div className="bg-[#FAF7F2] rounded-3xl border border-amber-200/70 p-6 sm:p-7 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#1D6B45]" />
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Rappels de sécurité transporteur
                  </h4>
                </div>
                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    • Vérifiez toujours le contenu physique des colis en présence
                    de l'expéditeur avant d'embarquer.
                  </p>
                  <p>
                    • Refusez tout liquide non scellé, médicament sans ordonnance
                    ou denrée périssable.
                  </p>
                  <p>
                    • En cas de retard de vol, signalez-le directement via votre
                    fiche vol pour prévenir les destinataires.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de suppression de trajet */}
      {deleteGpId && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setDeleteGpId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={26} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              Supprimer ce trajet ?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Cette action est irréversible. L'annonce de vol sera
              définitivement effacée de la plateforme Dabari.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteGpId(null)}
                disabled={isDeleting}
                className="flex-1 py-3.5 rounded-2xl font-bold text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteGp}
                disabled={isDeleting}
                className="flex-1 py-3.5 rounded-2xl font-bold text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {isDeleting ? "Suppression..." : "Oui, supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
