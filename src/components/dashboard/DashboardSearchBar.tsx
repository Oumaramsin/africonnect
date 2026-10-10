"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChefHat, Plane, ArrowRight } from "lucide-react";

export default function DashboardSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [service, setService] = useState<"all" | "traiteur" | "gp">("all");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      if (service === "gp") router.push("/gp");
      else router.push("/traiteur");
      return;
    }

    if (service === "gp") {
      router.push(`/gp?destination=${encodeURIComponent(trimmed)}`);
    } else {
      router.push(`/traiteur?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/12 backdrop-blur-xl border border-white/25 rounded-2xl md:rounded-3xl p-2 sm:p-2.5 shadow-xl w-full max-w-2xl transition-all"
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Toggle de service */}
        <div className="flex items-center gap-1 bg-black/20 backdrop-blur-md p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setService("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              service === "all"
                ? "bg-white text-[#1D6B45] shadow-xs"
                : "text-white/80 hover:text-white"
            }`}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setService("traiteur")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              service === "traiteur"
                ? "bg-white text-[#1D6B45] shadow-xs"
                : "text-white/80 hover:text-white"
            }`}
          >
            <ChefHat size={13} />
            <span>Traiteur</span>
          </button>
          <button
            type="button"
            onClick={() => setService("gp")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              service === "gp"
                ? "bg-[#D4870A] text-white shadow-xs"
                : "text-white/80 hover:text-white"
            }`}
          >
            <Plane size={13} />
            <span>Vol GP</span>
          </button>
        </div>

        {/* Input de recherche */}
        <div className="relative flex-1 flex items-center min-w-0">
          <Search size={16} className="absolute left-3 text-white/60 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              service === "gp"
                ? "Destination (Sénégal, Abidjan, Paris...)"
                : service === "traiteur"
                ? "Plat, spécialité (Tiep, Mafé, Alloco, Ndolé...)"
                : "Rechercher un plat, traiteur ou trajet de vol..."
            }
            className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-white/60 text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl border border-white/15 focus:border-white/40 outline-none transition-all"
          />
        </div>

        {/* Bouton de validation */}
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 bg-[#D4870A] hover:bg-[#b87405] text-white px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm shrink-0 transition-all hover:scale-102 shadow-md cursor-pointer"
        >
          <span>Rechercher</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
}
