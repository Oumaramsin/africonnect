import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChefHat, Home, Plane, SearchX } from "lucide-react";

// Next.js ajoute lui-même <meta name="robots" content="noindex"> et le statut 404
export const metadata: Metadata = {
  title: "Page introuvable",
  description: "La page demandée n'existe pas ou n'est plus disponible sur Dabari.",
};

export default function NotFound() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center space-y-8">
      <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-[#1D6B45] flex items-center justify-center mx-auto shadow-xs">
        <SearchX size={40} />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#D4870A]">Erreur 404</p>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900">
          Page introuvable
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
          Cette page n&apos;existe pas ou n&apos;est plus disponible : l&apos;annonce a peut-être été retirée
          ou le lien est incomplet. Poursuivez votre visite depuis l&apos;un de nos services.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
        <Link
          href="/traiteur"
          className="group bg-white rounded-3xl p-5 border-2 border-emerald-100 hover:border-[#1D6B45] shadow-xs hover:shadow-md transition-all flex items-center gap-4"
        >
          <span className="w-12 h-12 rounded-2xl bg-[#E8F5E9] text-[#1D6B45] flex items-center justify-center shrink-0">
            <ChefHat size={24} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-extrabold text-slate-900">Traiteurs africains</span>
            <span className="block text-xs text-slate-500">Plats faits maison et devis événements</span>
          </span>
          <ArrowRight size={16} className="text-[#1D6B45] group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/gp"
          className="group bg-white rounded-3xl p-5 border-2 border-amber-100 hover:border-[#D4870A] shadow-xs hover:shadow-md transition-all flex items-center gap-4"
        >
          <span className="w-12 h-12 rounded-2xl bg-[#FFF8E7] text-[#D4870A] flex items-center justify-center shrink-0">
            <Plane size={24} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-extrabold text-slate-900">Vols GP</span>
            <span className="block text-xs text-slate-500">Envoi de colis entre l&apos;Europe et l&apos;Afrique</span>
          </span>
          <ArrowRight size={16} className="text-[#D4870A] group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#1D6B45] hover:underline"
      >
        <Home size={16} /> Retour à l&apos;accueil
      </Link>
    </div>
  );
}
