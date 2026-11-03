"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

// Erreur inattendue dans une page : affichée à l'intérieur du layout racine (menu et pied de page)
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-amber-50 text-[#D4870A] flex items-center justify-center mx-auto shadow-xs">
        <AlertTriangle size={40} />
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Une erreur est survenue
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          La page n&apos;a pas pu s&apos;afficher. Vérifiez votre connexion internet puis réessayez
          dans un instant.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex items-center gap-2 bg-[#1D6B45] hover:bg-[#154d31] text-white text-sm font-bold px-5 py-3 rounded-xl shadow-md transition-colors cursor-pointer"
        >
          <RotateCcw size={16} /> Réessayer
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#1D6B45] px-4 py-3 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <Home size={16} /> Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
