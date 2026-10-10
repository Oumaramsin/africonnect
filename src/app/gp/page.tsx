"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getFlag,
  getDistance,
  formatDistance,
  type GpListing,
} from "@/lib/types/gp";
import Link from "next/link";
import {
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  MapPin,
  Lock,
  Star,
  Plus,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Search,
  SlidersHorizontal,
  Weight,
  Luggage,
  Clock,
  ArrowUpDown,
  Compass,
  Check,
  ChevronRight,
  RefreshCw,
  Info,
  X,
} from "lucide-react";
import Image from "next/image";
import { getValidToken } from "@/lib/auth";
import { GP_DESTINATION_FILTERS as DESTINATIONS } from "@/lib/constants/locations";
import CountryFlag from "@/components/ui/CountryFlag";
import CountryFilterModal from "@/components/ui/CountryFilterModal";

type DirectionFilter = "all" | "to_africa" | "to_france";

export default function GpPage() {
  const [listings, setListings] = useState<GpListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [destination, setDestination] = useState("tout");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);

  // Géolocalisation
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { timeout: 5000 },
    );
  }, []);

  // Chargement des annonces
  useEffect(() => {
    let ignore = false;

    async function fetchListings() {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/gp`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        const data = await response.json();
        if (!response.ok) {
          console.error(data.message || "Erreur de chargement des GP");
          return;
        }
        if (!ignore) {
          setListings(data.data?.gp || []);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des GP:", error);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    fetchListings();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const token = getValidToken();
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "long",
    });
  };

  // Options de pays avec compteurs pour la modale de filtre
  const destinationOptions = useMemo(() => {
    return DESTINATIONS.map((d) => {
      let count = 0;
      if (d.value === "tout") {
        count = listings.length;
      } else {
        const val = d.value.toLowerCase();
        count = listings.filter((l) => {
          const arr = (l.arrival_country || "").toLowerCase();
          const dep = (l.departure_country || "").toLowerCase();
          return arr.includes(val) || dep.includes(val);
        }).length;
      }
      return {
        value: d.value,
        label: d.label,
        count,
      };
    });
  }, [listings]);

  // Filtrage multi-critères
  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      // 1. Filtre par pays de destination / départ sélectionné
      if (destination !== "tout") {
        const dest = destination.toLowerCase();
        const matchesArrival =
          l.arrival_country && l.arrival_country.toLowerCase().includes(dest);
        const matchesDeparture =
          l.departure_country &&
          l.departure_country.toLowerCase().includes(dest);
        if (!matchesArrival && !matchesDeparture) return false;
      }

      // 2. Filtre de direction
      if (direction === "to_africa") {
        const dep = (l.departure_country || "").toLowerCase();
        if (!dep.includes("france") && !dep.includes("belgique") && !dep.includes("europe")) {
          return false;
        }
      } else if (direction === "to_france") {
        const arr = (l.arrival_country || "").toLowerCase();
        if (!arr.includes("france") && !arr.includes("paris")) {
          return false;
        }
      }

      // 3. Filtre par prix maximum au kilo
      if (maxPrice !== null && l.price_per_kg > maxPrice) {
        return false;
      }

      // 4. Recherche libre (villes, pays, nom voyageur)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const depCity = (l.departure_city || "").toLowerCase();
        const arrCity = (l.arrival_city || "").toLowerCase();
        const depCountry = (l.departure_country || "").toLowerCase();
        const arrCountry = (l.arrival_country || "").toLowerCase();
        const name = (l.profiles?.full_name || "").toLowerCase();

        if (
          !depCity.includes(q) &&
          !arrCity.includes(q) &&
          !depCountry.includes(q) &&
          !arrCountry.includes(q) &&
          !name.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [listings, destination, direction, maxPrice, searchQuery]);

  // Tri par distance si activé
  const sortedListings = useMemo(() => {
    if (!sortByDistance || !userLocation) return filteredListings;
    return [...filteredListings].sort((a, b) => {
      const distA =
        a.latitude && a.longitude
          ? getDistance(
              userLocation.lat,
              userLocation.lon,
              a.latitude,
              a.longitude,
            )
          : 9999;
      const distB =
        b.latitude && b.longitude
          ? getDistance(
              userLocation.lat,
              userLocation.lon,
              b.latitude,
              b.longitude,
            )
          : 9999;
      return distA - distB;
    });
  }, [filteredListings, sortByDistance, userLocation]);

  const hasActiveFilters =
    destination !== "tout" ||
    direction !== "all" ||
    searchQuery.trim().length > 0 ||
    maxPrice !== null ||
    sortByDistance;

  const resetFilters = () => {
    setDestination("tout");
    setDirection("all");
    setSearchQuery("");
    setMaxPrice(null);
    setSortByDistance(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 pb-24">
      {/* ── 1. HERO GP DESKTOP & MOBILE ── */}
      <section className="relative overflow-hidden rounded-3xl md:rounded-[36px] bg-gradient-to-br from-[#123825] via-[#1D6B45] to-[#8C5806] text-white shadow-xl shadow-[#1D6B45]/10 p-6 sm:p-10 md:p-12">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-[#D4870A]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md text-white text-xs font-bold px-3.5 py-1.5 rounded-full border border-white/20 shadow-xs">
              <Plane size={14} className="text-amber-300" />
              <span>Acheminement Sécurisé de Kilos & Bagages</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Transport GP Colis & Valises Diaspora
            </h1>

            <p className="text-white/85 text-xs sm:text-sm md:text-base leading-relaxed max-w-xl">
              Faites voyager vos colis, denrées et documents en toute confiance
              avec des voyageurs vérifiés reliant l'Europe, l'Afrique et
              l'Amérique.
            </p>

            <div className="pt-2 flex items-center gap-2.5 sm:gap-3 flex-wrap text-xs font-semibold text-white/95">
              <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/10">
                <ShieldCheck size={15} className="text-emerald-300 shrink-0" />
                <span>Paiement sous séquestre</span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/10">
                <CheckCircle2 size={15} className="text-amber-300 shrink-0" />
                <span>Billets & identités contrôlés</span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/10">
                <Luggage size={15} className="text-sky-300 shrink-0" />
                <span>Inspection des colis conjointe</span>
              </div>
            </div>
          </div>

          {/* Carte CTA pour les voyageurs */}
          <div className="w-full lg:w-96 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 text-white space-y-4 shrink-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/20 text-[#D4870A] flex items-center justify-center shrink-0 border border-amber-300/30">
                <Sparkles size={22} className="text-amber-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">
                  Vous voyagez bientôt ?
                </h3>
                <p className="text-xs text-white/70">
                  Rentabilisez vos kilos disponibles
                </p>
              </div>
            </div>
            <p className="text-xs text-white/85 leading-relaxed">
              Publiez vos dates de vol et vos kilos libres. Recevez des demandes
              de réservation et touchez votre rémunération dès la remise du colis.
            </p>
            <Link
              href="/gp/nouvelle"
              className="w-full flex items-center justify-center gap-2 bg-[#D4870A] hover:bg-[#b87405] text-white text-xs sm:text-sm font-extrabold py-3.5 px-5 rounded-2xl shadow-md transition-all hover:scale-101 cursor-pointer"
            >
              <Plus size={16} /> Publier une annonce de vol
            </Link>
          </div>
        </div>
      </section>

      {/* ── 3 PILIERS DE RÉASSURANCE GP ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#1D6B45] flex items-center justify-center shrink-0">
            <Lock size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900">
              Fonds protégés sous séquestre
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Votre paiement est sécurisé par Dabari et remis au voyageur
              uniquement une fois le colis inspecté et réceptionné.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-[#D4870A] flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900">
              Voyageurs vérifiés par Dabari
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Pièce d'identité officielle et preuve de réservation de billet
              d'avion contrôlées avant publication.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <Luggage size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900">
              Inspection & Scellage transparent
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Expéditeur et voyageur vérifient ensemble le contenu lors de la
              remise pour une conformité aéroportuaire absolue.
            </p>
          </div>
        </div>
      </section>

      {/* ── 2. BARRE DE RECHERCHE & FILTRES ÉTENDUS ── */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        {/* Ligne 1 : Barre de recherche libre + Sélecteur de direction */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-center">
          {/* Champ recherche */}
          <div className="lg:col-span-5 relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une ville, aéroport ou voyageur (ex: Paris, Dakar, Abidjan)..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D4870A] text-xs sm:text-sm bg-slate-50/70 focus:bg-white text-slate-900 font-medium transition-all"
            />
          </div>

          {/* Toggle de direction */}
          <div className="lg:col-span-4 flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setDirection("all")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                direction === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tous les trajets
            </button>
            <button
              type="button"
              onClick={() => setDirection("to_africa")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center truncate ${
                direction === "to_africa"
                  ? "bg-[#1D6B45] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Vers l'Afrique
            </button>
            <button
              type="button"
              onClick={() => setDirection("to_france")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center truncate ${
                direction === "to_france"
                  ? "bg-[#D4870A] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Vers l'Europe
            </button>
          </div>

          {/* Filtres de prix & Proximité */}
          <div className="lg:col-span-3 flex items-center gap-2 justify-end">
            <button
              onClick={() => setSortByDistance(!sortByDistance)}
              disabled={!userLocation}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                sortByDistance
                  ? "bg-[#1D6B45] text-white border-[#1D6B45] shadow-xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-[#1D6B45] hover:text-[#1D6B45]"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Trier par distance depuis votre position"
            >
              <MapPin size={14} />
              <span className="hidden sm:inline">
                {locationLoading
                  ? "Géoloc..."
                  : sortByDistance
                    ? "Tri proximité"
                    : "Proximité"}
              </span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 font-bold px-2 py-2 rounded-xl transition-colors cursor-pointer"
                title="Réinitialiser les filtres"
              >
                <RefreshCw size={12} />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>
            )}

            <span className="text-xs font-extrabold text-[#1D6B45] bg-[#E8F5E9] px-3 py-2 rounded-xl whitespace-nowrap">
              {sortedListings.length} vol{sortedListings.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Ligne 2 : Filtre par pays de destination via CountryFilterModal */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <CountryFilterModal
              options={destinationOptions}
              selectedValue={destination}
              onSelect={(val) => setDestination(val)}
              title="Filtrer par pays de destination"
              subtitle="Sélectionnez le pays d'arrivée ou de transit de votre colis"
              buttonLabel="Filtrer par pays"
            />
            {destination !== "tout" && (
              <button
                type="button"
                onClick={() => setDestination("tout")}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <X size={13} /> Effacer pays
              </button>
            )}
          </div>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Sélectionnez un pays pour filtrer directement les vols
          </span>
        </div>
      </section>

      {/* ── 3. GRILLE DES ANNONCES GP (CARTES BOARDING PASS) ── */}
      <section>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs animate-pulse space-y-4"
              >
                <div className="h-6 bg-slate-200 rounded-md w-3/4" />
                <div className="h-4 bg-slate-100 rounded-md w-1/2" />
                <div className="h-24 bg-slate-50 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : sortedListings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-4 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-[#D4870A] flex items-center justify-center mx-auto shadow-xs">
              <Plane size={32} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg">
              Aucun vol GP correspondant aux critères
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Essayez d'élargir votre recherche ou soyez le premier à publier un
              vol pour cette destination.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Effacer les filtres
                </button>
              )}
              <Link
                href="/gp/nouvelle"
                className="inline-flex items-center gap-2 bg-[#D4870A] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs hover:bg-[#b87405] cursor-pointer"
              >
                <Plus size={15} /> Proposer un vol
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedListings.map((listing) => {
              const distance =
                userLocation && listing.latitude && listing.longitude
                  ? getDistance(
                      userLocation.lat,
                      userLocation.lon,
                      listing.latitude,
                      listing.longitude,
                    )
                  : null;

              const flightRef = `GP-${listing.id.slice(0, 6).toUpperCase()}`;

              return (
                <Link
                  key={listing.id}
                  href={`/gp/${listing.id}`}
                  className="group block h-full focus:outline-none"
                >
                  <div className="bg-white rounded-3xl border-2 border-slate-200/80 hover:border-[#D4870A] shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden">
                    {/* Header : Barre d'embarquement stylisée */}
                    <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-400">
                          {flightRef}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            listing.flight_type === "direct"
                              ? "bg-emerald-100/70 text-[#1D6B45]"
                              : "bg-amber-100/70 text-[#D4870A]"
                          }`}
                        >
                          {listing.flight_type === "direct"
                            ? "Vol Direct"
                            : "Avec Escale"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                        <ShieldCheck size={13} className="text-[#1D6B45]" />
                        <span>Séquestre Actif</span>
                      </div>
                    </div>

                    {/* Corps de la carte d'embarquement */}
                    <div className="p-5 sm:p-6 space-y-4 flex-1">
                      {/* Trajet Aérien avec drapeaux vectoriels */}
                      <div className="flex items-center justify-between gap-3">
                        {/* Départ */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {listing.departure_country && (
                              <CountryFlag
                                country={listing.departure_country}
                                size={18}
                              />
                            )}
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                              {listing.departure_country || "Départ"}
                            </span>
                          </div>
                          <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                            {listing.departure_city}
                          </p>
                        </div>

                        {/* Vecteur de vol avec icône avion */}
                        <div className="flex flex-col items-center justify-center px-2 shrink-0">
                          <div className="w-8 h-8 rounded-full bg-amber-100/80 text-[#D4870A] flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
                            <Plane size={16} />
                          </div>
                          <div className="w-14 border-t-2 border-dotted border-slate-300 mt-1" />
                        </div>

                        {/* Arrivée */}
                        <div className="min-w-0 text-right">
                          <div className="flex items-center justify-end gap-1.5 mb-1">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                              {listing.arrival_country || "Arrivée"}
                            </span>
                            {listing.arrival_country && (
                              <CountryFlag
                                country={listing.arrival_country}
                                size={18}
                              />
                            )}
                          </div>
                          <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                            {listing.arrival_city}
                          </p>
                        </div>
                      </div>

                      {/* Alerte si vol décalé / retardé */}
                      {listing.is_delayed && (
                        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs font-semibold text-amber-900 flex items-start gap-2.5">
                          <AlertTriangle
                            size={16}
                            className="text-[#D4870A] shrink-0 mt-0.5"
                          />
                          <div className="min-w-0">
                            <p className="font-extrabold text-amber-950">
                              Arrivée décalée signalée
                            </p>
                            {listing.arrival_date && (
                              <p className="text-[11px] text-amber-800 mt-0.5">
                                Nouvelle date : {formatDate(listing.arrival_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Grille dates & points de collecte */}
                      <div className="bg-[#FAF7F2] rounded-2xl p-3.5 grid grid-cols-2 gap-3 text-xs border border-amber-100/80">
                        <div className="border-r border-slate-200/80 pr-2 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <PlaneTakeoff
                              size={12}
                              className="text-[#1D6B45]"
                            />{" "}
                            Départ
                          </span>
                          <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            {formatDate(listing.departure_date)}
                          </p>
                          {listing.pickup_city && (
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              <MapPin size={11} className="text-slate-400 shrink-0" />
                              {listing.pickup_city}
                            </p>
                          )}
                        </div>

                        <div className="pl-1 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <PlaneLanding
                              size={12}
                              className="text-[#D4870A]"
                            />{" "}
                            Arrivée
                          </span>
                          <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            {listing.arrival_date
                              ? formatDate(listing.arrival_date)
                              : "À confirmer"}
                          </p>
                          {listing.dropoff_city && (
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              <MapPin size={11} className="text-slate-400 shrink-0" />
                              {listing.dropoff_city}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Voyageur certifié & Distance */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1D6B45] to-[#155234] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {listing.profiles?.full_name
                              ?.charAt(0)
                              .toUpperCase() || "V"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {listing.profiles?.full_name ||
                                "Voyageur Partenaire"}
                            </p>
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 size={10} /> Identité Vérifiée
                            </span>
                          </div>
                        </div>

                        {distance !== null && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                            {formatDistance(distance)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── TALON PERFORÉ CARTE D'EMBARQUEMENT (FOOTER) ── */}
                    <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t-2 border-dashed border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
                          <Weight size={11} /> Kilos disponibles
                        </span>
                        <span className="text-xs sm:text-sm font-black text-slate-900">
                          {listing.available_kg} kg libres
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Tarif au kilo
                        </span>
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-base sm:text-lg font-black text-[#1D6B45]">
                            {Number(listing.price_per_kg).toFixed(2)} €
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            / kg
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating Action Button Mobile pour publier un vol */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 z-40 lg:hidden shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">
              Voyageurs GP
            </span>
            <span className="text-sm font-black text-slate-900">
              {sortedListings.length} vol{sortedListings.length > 1 ? "s" : ""} actif{sortedListings.length > 1 ? "s" : ""}
            </span>
          </div>
          <Link
            href="/gp/nouvelle"
            className="flex-1 max-w-[200px] bg-[#D4870A] text-white py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm hover:bg-[#b87405] transition-all shadow-md text-center cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus size={16} />
            <span>Publier un vol</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
