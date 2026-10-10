"use client";

import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";

export default function DescriptionBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem("dabari_hide_description");
      if (isDismissed !== "true") {
        setShow(true);
      }
    } catch {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    try {
      localStorage.setItem("dabari_hide_description", "true");
    } catch {
      // Ignorer
    }
  };

  if (!show) return null;

  return (
    <div className="bg-white rounded-[22px] p-4 sm:p-5 border border-slate-200/90 shadow-xs relative transition-all">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/60 text-[#D4870A] text-[11px] font-bold">
          <Sparkles size={13} className="text-[#D4870A]" />
          <span>Services de Confiance</span>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          aria-label="Fermer la description"
        >
          <X size={15} />
        </button>
      </div>

      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mb-1">
        Bienvenue sur <span className="text-[#1D6B45]">Dabari</span>
      </h2>

      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
        <strong className="font-extrabold text-slate-900">Dabari</strong> est une plateforme de mise en relation de la diaspora africaine. Elle vous permet de commander des{" "}
        <strong className="font-bold text-[#1D6B45]">plats faits maison & devis traiteur</strong>, et d'envoyer vos{" "}
        <strong className="font-bold text-[#D4870A]">colis (GP)</strong> en toute sécurité entre l'Europe et l'Afrique.
      </p>
    </div>
  );
}
