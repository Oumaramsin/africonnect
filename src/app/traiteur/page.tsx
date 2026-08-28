"use client";

import { useEffect, useMemo, useState } from "react";
import { type Traiteur } from "@/lib/types/traiteur";
import Link from "next/link";
import { ChefHat, Star, MapPin, Search, X } from "lucide-react";

const CUISINES = [
  { label: "Tout", value: "tout" },
  { label: "🇸🇳 Sénégalais", value: "senegalais" },
  { label: "🇨🇮 Ivoirien", value: "ivoirien" },
  { label: "🇨🇲 Camerounais", value: "camerounais" },
  { label: "🇨🇬 Congolais", value: "congolais" },
];

const CUISINE_EMOJI: Record<string, string> = {
  senegalais: "🇸🇳",
  ivoirien: "🇨🇮",
  camerounais: "🇨🇲",
  congolais: "🇨🇬",
};

export default function TraiteurPage() {
  const [traiteurs, setTraiteurs] = useState<Traiteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [cuisine, setCuisine] = useState("tout");
  const [selectedZone, setSelectedZone] = useState("Toutes");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let ignore = false;

    async function fetchTraiteurs() {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/traiteur`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        if (!response.ok) {
          setLoading(false);
          return;
        }
        const data = await response.json();
        if (!ignore) {
          setTraiteurs(data.data.activeTraiteur || []);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchTraiteurs();
    return () => {
      ignore = true;
    };
  }, []);

  // Extraire zones de livraison uniques
  const availableZones = useMemo(() => {
    const set = new Set<string>();
    traiteurs.forEach((t) => {
      t.delivery_zones?.forEach((z) => {
        if (z && z.trim()) {
          set.add(z.trim());
        }
      });
    });
    return ["Toutes", ...Array.from(set).sort((a, b) => a.localeCompare(b, "fr"))];
  }, [traiteurs]);

  // Filtrage 
  const filteredTraiteurs = useMemo(() => {
    return traiteurs.filter((traiteur) => {
      // Filtre Cuisine
      const matchCuisine =
        cuisine === "tout" ||
        traiteur.cuisine_type?.some((c) =>
          c.toLowerCase().includes(cuisine.toLowerCase()),
        );

      // Filtre Zone
      const matchZone =
        selectedZone === "Toutes" ||
        traiteur.delivery_zones?.some((z) =>
          z.toLowerCase().includes(selectedZone.toLowerCase()),
        );

      // Filtre Recherche
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        traiteur.name.toLowerCase().includes(query) ||
        traiteur.bio?.toLowerCase().includes(query) ||
        traiteur.delivery_zones?.some((z) => z.toLowerCase().includes(query)) ||
        traiteur.cuisine_type?.some((c) => c.toLowerCase().includes(query));

      return matchCuisine && matchZone && matchSearch;
    });
  }, [traiteurs, cuisine, selectedZone, searchQuery]);

  const handleResetFilters = () => {
    setCuisine("tout");
    setSelectedZone("Toutes");
    setSearchQuery("");
  };

  const hasActiveFilters =
    cuisine !== "tout" ||
    selectedZone !== "Toutes" ||
    searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1D6B45] via-[#165637] to-[#0F4A30] px-4 pt-10 pb-6 text-white">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="text-white/70 text-sm mb-3 inline-block hover:text-white transition-colors"
          >
            ← Accueil
          </Link>
          <h1 className="text-2xl font-bold text-white">Traiteurs africains</h1>
          <p className="text-white/80 text-xs mt-1 mb-4">
            Commandez de délicieux plats faits maison pour vos événements ou repas.
          </p>

          {/* Search Bar */}
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-[#1D6B45]" />
            <input
              type="text"
              placeholder="Rechercher par zone, ville, nom de traiteur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-white text-gray-800 placeholder-gray-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barre de Filtres */}
      <div className="bg-white border-b border-gray-200/80 px-4 py-3 shadow-xs sticky top-0 z-30 space-y-2">
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Ligne 1: Filtres Cuisine */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
              Cuisine :
            </span>
            {CUISINES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCuisine(c.value)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  cuisine === c.value
                    ? "bg-[#1D6B45] text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Ligne 2: Filtres Zone de Livraison */}
          {availableZones.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-gray-50">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
                Zone :
              </span>
              {availableZones.map((zone) => (
                <button
                  key={zone}
                  onClick={() => setSelectedZone(zone)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shrink-0 flex items-center gap-1 border ${
                    selectedZone === zone
                      ? "bg-[#1D6B45] text-white border-[#1D6B45] shadow-xs"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <MapPin size={11} className={selectedZone === zone ? "text-white" : "text-[#1D6B45]"} />
                  {zone === "Toutes" ? "Toutes les zones" : zone}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results counter */}
      {hasActiveFilters && (
        <div className="bg-[#E8F5E9]/60 border-b border-[#1D6B45]/10 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center justify-between text-xs">
            <span className="font-semibold text-[#1D6B45]">
              {filteredTraiteurs.length} traiteur{filteredTraiteurs.length > 1 ? "s" : ""} trouvé{filteredTraiteurs.length > 1 ? "s" : ""}
            </span>
            <button
              onClick={handleResetFilters}
              className="text-red-600 font-semibold hover:underline"
            >
              Effacer les filtres
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filteredTraiteurs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-3xl border border-gray-100 p-8">
            <div className="flex justify-center mb-3">
              <ChefHat size={48} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">
              Aucun traiteur disponible
            </p>
            <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
              {selectedZone !== "Toutes"
                ? `Aucun traiteur ne dessert la zone "${selectedZone}".`
                : "Aucun traiteur ne correspond à vos critères de recherche."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-[#1D6B45] text-white rounded-xl text-xs font-bold hover:bg-[#155235] transition-colors"
              >
                Voir tous les traiteurs
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {filteredTraiteurs.map((traiteur) => (
              <Link
                key={traiteur.id}
                href={`/traiteur/${traiteur.id}`}
                className="block w-full mb-6 group"
              >
                <div className="bg-white rounded-3xl border border-gray-200/80 overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-200">
                  <div className="h-36 bg-gradient-to-r from-[#E8F5E9] to-[#C8E6C9] flex items-center justify-center overflow-hidden relative">
                    {traiteur.image_url ? (
                      <img
                        src={traiteur.image_url}
                        alt={traiteur.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl">
                        {CUISINE_EMOJI[traiteur.cuisine_type?.[0]] || (
                          <ChefHat size={48} className="text-[#1D6B45]" />
                        )}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h2 className="font-semibold text-gray-800 text-lg">
                        {traiteur.name}
                      </h2>
                      {traiteur.review_count && traiteur.review_count > 0 ? (
                        <div className="flex items-center gap-1 bg-[#E8F5E9] px-2 py-1 rounded-lg">
                          <Star
                            size={12}
                            className="text-yellow-500"
                            fill="currentColor"
                          />
                          <span className="text-[#1D6B45] text-xs font-medium">
                            {traiteur.rating}
                          </span>
                          <span className="text-gray-400 text-xs">
                            ({traiteur.review_count})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                          <span className="text-gray-500 text-xs font-medium">
                            Nouveau
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-500 text-sm mb-2.5 line-clamp-2">
                      {traiteur.bio}
                    </p>

                    {/* Delivery zones badges */}
                    {traiteur.delivery_zones && traiteur.delivery_zones.length > 0 && (
                      <div className="flex items-start gap-1.5 mb-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <MapPin size={13} className="text-[#1D6B45] shrink-0 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {traiteur.delivery_zones.map((zone) => {
                            const isMatch =
                              selectedZone !== "Toutes" &&
                              zone.toLowerCase().includes(selectedZone.toLowerCase());
                            return (
                              <span
                                key={zone}
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium border ${
                                  isMatch
                                    ? "bg-[#E8F5E9] text-[#1D6B45] border-[#1D6B45] font-bold"
                                    : "bg-white text-gray-600 border-gray-200"
                                }`}
                              >
                                {zone}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex gap-1 flex-wrap">
                        {traiteur.cuisine_type?.map((c) => (
                          <span
                            key={c}
                            className="bg-[#E8F5E9] text-[#1D6B45] text-xs px-2 py-1 rounded-full capitalize font-medium"
                          >
                            {CUISINE_EMOJI[c]} {c}
                          </span>
                        ))}
                      </div>
                      <span className="text-[#1D6B45] text-sm font-semibold shrink-0 whitespace-nowrap ml-2">
                        {traiteur.dishes?.filter((d) => d.is_available)
                          .length || 0}{" "}
                        plat
                        {(traiteur.dishes?.filter((d) => d.is_available)
                          .length || 0) > 1
                          ? "s"
                          : ""}{" "}
                        →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
