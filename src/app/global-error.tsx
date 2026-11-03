"use client";

import { useEffect } from "react";
import "./globals.css";

// Erreur dans le layout racine lui-même : remplace tout le document (ni menu ni pied de page)
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 antialiased px-4">
        <title>Erreur | Dabari</title>
        <div className="max-w-xl w-full text-center space-y-6 py-16">
          <p className="text-2xl font-black tracking-tight text-[#1D6B45]">Dabari</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Une erreur est survenue</h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Le site n&apos;a pas pu s&apos;afficher. Vérifiez votre connexion internet puis réessayez.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => retry()}
              className="bg-[#1D6B45] hover:bg-[#154d31] text-white text-sm font-bold px-5 py-3 rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Réessayer
            </button>
            {/* Lien classique volontaire : rechargement complet du document après une erreur du layout */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="text-sm font-bold text-slate-600 hover:text-[#1D6B45] px-4 py-3">
              Retour à l&apos;accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
