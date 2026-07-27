import Link from "next/link";
import {
  ChefHat,
  Plane,
  ShoppingCart,
  Scissors,
  ArrowRight,
  Clock,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Headphones,
  HeartHandshake,
} from "lucide-react";

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] relative overflow-hidden">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        <div className="-mx-4 -mt-6 pt-7 pb-7 px-6 bg-gradient-to-br from-[#1D6B45] via-[#165637] to-[#0F4A30] rounded-b-[32px] text-white shadow-lg relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-36 h-36 bg-[#D4870A]/25 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-white/95 text-[11px] font-bold px-3 py-1 rounded-full mb-2.5 border border-white/20">
              <Sparkles size={12} className="text-[#D4870A]" /> Hub & Services
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">Nos Services</h1>
            <p className="text-white/80 text-xs mt-1 font-medium leading-relaxed">
              Sélectionnez un service pour commencer votre commande ou envoi.
            </p>
          </div>
        </div>

        {/* Grille 2x2 Côte-à-Côte */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* 1. Traiteur (Disponible) */}
          <Link href="/traiteur" className="block group">
            <div className="h-full bg-white rounded-3xl p-4 border-2 border-[#1D6B45]/20 shadow-sm hover:shadow-md hover:border-[#1D6B45] transition-all duration-200 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-[#1D6B45]/5 to-transparent">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-[#1D6B45]/15 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ChefHat size={26} className="text-[#1D6B45]" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#1D6B45] border border-[#1D6B45]/20 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Actif
                  </span>
                </div>
                <h2 className="font-bold text-gray-900 text-sm group-hover:text-[#1D6B45] transition-colors">
                  Traiteur
                </h2>
                <p className="text-[11px] font-medium text-[#1D6B45] mt-0.5">
                  Plats & Devis
                </p>
                <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">
                  Plats africains faits maison & devis événements.
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#1D6B45]">
                  Commander
                </span>
                <div className="w-6 h-6 rounded-full bg-[#1D6B45] text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>
          </Link>

          {/* 2. GP Colis (Disponible) */}
          <Link href="/gp" className="block group">
            <div className="h-full bg-white rounded-3xl p-4 border-2 border-[#D4870A]/20 shadow-sm hover:shadow-md hover:border-[#D4870A] transition-all duration-200 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-[#D4870A]/5 to-transparent">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-[#D4870A]/15 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Plane size={26} className="text-[#D4870A]" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF8E7] text-[#D4870A] border border-[#D4870A]/20 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Actif
                  </span>
                </div>
                <h2 className="font-bold text-gray-900 text-sm group-hover:text-[#D4870A] transition-colors">
                  GP Colis
                </h2>
                <p className="text-[11px] font-medium text-[#D4870A] mt-0.5">
                  Transport de colis
                </p>
                <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">
                  Envoi de colis sécurisé entre l&apos;Europe et l&apos;Afrique.
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#D4870A]">
                  Envoyer
                </span>
                <div className="w-6 h-6 rounded-full bg-[#D4870A] text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>
          </Link>

          {/* 3. Épicerie (Bientôt) */}
          <div className="h-full bg-white/70 backdrop-blur-sm rounded-3xl p-4 border border-dashed border-gray-200 flex flex-col justify-between opacity-80">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <ShoppingCart size={24} className="text-gray-400" />
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#D4870A]/10 text-[#D4870A] border border-[#D4870A]/30 flex items-center gap-1">
                  <Clock size={9} /> Bientôt
                </span>
              </div>
              <h2 className="font-bold text-gray-700 text-sm">Épicerie</h2>
              <p className="text-[11px] font-medium text-gray-400 mt-0.5">
                Produits du pays
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
                Ingrédients et condiments exotiques authentiques.
              </p>
            </div>

            <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-semibold">Prochainement</span>
            </div>
          </div>

          {/* 4. Coiffure (Bientôt) */}
          <div className="h-full bg-white/70 backdrop-blur-sm rounded-3xl p-4 border border-dashed border-gray-200 flex flex-col justify-between opacity-80">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Scissors size={24} className="text-gray-400" />
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#1D6B45]/10 text-[#1D6B45] border border-[#1D6B45]/30 flex items-center gap-1">
                  <Clock size={9} /> Bientôt
                </span>
              </div>
              <h2 className="font-bold text-gray-700 text-sm">Coiffure</h2>
              <p className="text-[11px] font-medium text-gray-400 mt-0.5">
                Tresses & Soins
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
                Coiffeuses et tresseuses spécialisées à domicile.
              </p>
            </div>

            <div className="mt-4 pt-2.5 border-t border-gray-100 flex items-center justify-between text-gray-400">
              <span className="text-[10px] font-semibold">Prochainement</span>
            </div>
          </div>
        </div>

        {/* Badges de Confiance Compacts */}
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200/80 px-3 py-1.5 rounded-full text-[11px] font-semibold text-gray-700 shadow-2xs">
            <ShieldCheck size={13} className="text-[#1D6B45]" /> Paiement 100%
            sécurisé
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200/80 px-3 py-1.5 rounded-full text-[11px] font-semibold text-gray-700 shadow-2xs">
            <HeartHandshake size={13} className="text-[#D4870A]" /> Réseau de
            confiance
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200/80 px-3 py-1.5 rounded-full text-[11px] font-semibold text-gray-700 shadow-2xs">
            <Headphones size={13} className="text-[#1D6B45]" /> Support 7j/7
          </span>
        </div>
      </div>
    </div>
  );
}
