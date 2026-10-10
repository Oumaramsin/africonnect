"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { SlidersHorizontal, X, Check, Search, ChevronDown, RotateCcw } from "lucide-react";
import CountryFlag from "./CountryFlag";

export interface CountryFilterOption {
  value: string;
  label: string;
  count?: number;
}

interface CountryFilterModalProps {
  options: CountryFilterOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  className?: string;
}

export default function CountryFilterModal({
  options,
  selectedValue,
  onSelect,
  title = "Filtrer par pays",
  subtitle = "Sélectionnez une origine pour affiner les résultats",
  buttonLabel = "Filtrer par pays",
  className = "",
}: CountryFilterModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Trouver l'option sélectionnée actuelle
  const currentOption = useMemo(() => {
    return options.find((opt) => opt.value.toLowerCase() === selectedValue.toLowerCase());
  }, [options, selectedValue]);

  const isFiltered = Boolean(
    selectedValue &&
    selectedValue !== "all" &&
    selectedValue !== "tout" &&
    selectedValue !== ""
  );

  // Filtrer les options par recherche
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  // Fermeture avec Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Empêcher le scroll du body quand la modale mobile est ouverte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onSelect(val);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onSelect(options[0]?.value || "all");
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* ── BOUTON TRIGGER ── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs ${
          isFiltered
            ? "bg-emerald-50 text-[#1D6B45] border-2 border-[#1D6B45] shadow-emerald-700/10"
            : "bg-white text-slate-700 border border-slate-200 hover:border-[#1D6B45] hover:bg-slate-50"
        }`}
        aria-label={title}
      >
        {isFiltered && currentOption?.value ? (
          <CountryFlag country={currentOption.value} size={17} />
        ) : (
          <SlidersHorizontal size={15} className="text-[#1D6B45]" />
        )}

        <span className="truncate max-w-[150px] sm:max-w-none">
          {isFiltered && currentOption ? currentOption.label : buttonLabel}
        </span>

        {isFiltered && currentOption?.count !== undefined && (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1D6B45] text-white font-extrabold">
            {currentOption.count}
          </span>
        )}

        {isFiltered ? (
          <span
            onClick={handleReset}
            className="p-0.5 rounded-full hover:bg-emerald-200/60 text-[#1D6B45] ml-0.5 transition-colors cursor-pointer"
            title="Effacer le filtre"
          >
            <X size={13} />
          </span>
        ) : (
          <ChevronDown size={14} className="text-slate-400" />
        )}
      </button>

      {/* ── MODALE / BOTTOM SHEET DE FILTRES ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] sm:max-h-[80vh] flex flex-col border border-slate-100 animate-in slide-in-from-bottom duration-250"
          >
            {/* Header de la modale */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#1D6B45] flex items-center justify-center">
                    <SlidersHorizontal size={16} />
                  </div>
                  <h3 className="font-black text-slate-900 text-lg tracking-tight">
                    {title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Champ de recherche rapide */}
            {options.length > 5 && (
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un pays..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#1D6B45] text-xs sm:text-sm pl-9 pr-8 py-2.5 rounded-xl outline-none"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Liste scrollable des pays */}
            <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 max-h-[50vh]">
              {filteredOptions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">
                  Aucun pays ne correspond à « {searchQuery} »
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected =
                    opt.value.toLowerCase() === selectedValue.toLowerCase() ||
                    (!isFiltered && (opt.value === "all" || opt.value === "tout"));

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs sm:text-sm font-bold transition-all text-left cursor-pointer border ${
                        isSelected
                          ? "bg-emerald-50 border-[#1D6B45] text-[#1D6B45] shadow-xs"
                          : "bg-white border-slate-100 hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {opt.value !== "all" && opt.value !== "tout" ? (
                          <div className="shrink-0 drop-shadow-xs">
                            <CountryFlag country={opt.value} size={22} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center shrink-0">
                            *
                          </div>
                        )}
                        <span className="font-extrabold">{opt.label}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {opt.count !== undefined && (
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              isSelected
                                ? "bg-emerald-200/60 text-[#1D6B45]"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {opt.count}
                          </span>
                        )}

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#1D6B45] text-white flex items-center justify-center shrink-0">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Pied de la modale */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              {isFiltered ? (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors py-2 px-3 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Réinitialiser</span>
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-medium">
                  {options.length - 1} pays disponibles
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="bg-[#1D6B45] text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-[#154d31] transition-all ml-auto shadow-xs cursor-pointer"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
