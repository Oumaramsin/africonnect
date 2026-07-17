"use client";

import { useEffect, useState } from "react";
import { getTraiteurs, type Traiteur } from "@/lib/api/traiteur";
import Link from "next/link";
import { ChefHat, Star } from "lucide-react";

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
        if (!ignore){
          setTraiteurs(data.data.activeTraiteur)
        } 
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchTraiteurs();
    return () => {
      ignore = true;
    };
  }, [cuisine]);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="bg-[#1D6B45] px-4 pt-12 pb-6">
        <Link
          href="/dashboard"
          className="text-white/70 text-sm mb-4 inline-block"
        >
          ← Accueil
        </Link>
        <h1 className="text-2xl font-bold text-white">Traiteurs africains</h1>
        <p className="text-white/70 text-sm mt-1">
          Commande un plat fait maison
        </p>

        <div className="relative mt-4 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pr-8">
            {CUISINES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCuisine(c.value)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                  cuisine === c.value
                    ? "bg-white text-[#1D6B45] font-medium"
                    : "bg-white/20 text-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#1D6B45] to-transparent pointer-events-none"></div>
        </div>
      </div>

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
        ) : traiteurs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="flex justify-center mb-3">
              <ChefHat size={48} className="text-gray-300" />
            </div>
            <p>Aucun traiteur disponible pour cette cuisine</p>
          </div>
        ) : (
          <div className="space-y-4">
            {traiteurs.map((traiteur) => (
              <Link key={traiteur.id} href={`/traiteur/${traiteur.id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
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
                            Pas d'avis
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                      {traiteur.bio}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 flex-wrap">
                        {traiteur.cuisine_type?.map((c) => (
                          <span
                            key={c}
                            className="bg-[#E8F5E9] text-[#1D6B45] text-xs px-2 py-1 rounded-full capitalize"
                          >
                            {CUISINE_EMOJI[c]} {c}
                          </span>
                        ))}
                      </div>
                      <span className="text-[#1D6B45] text-sm font-medium shrink-0 whitespace-nowrap ml-2">
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
