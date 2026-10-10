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
  PlusCircle,
  FileText,
  BadgeCheck,
} from "lucide-react";

export default function ServicesPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12">
      {/* ── 1. EN-TÊTE HERO SERVICES ── */}
      <section className="relative overflow-hidden rounded-3xl md:rounded-[36px] bg-gradient-to-br from-[#0F4A30] via-[#1D6B45] to-[#155234] text-white shadow-xl shadow-[#1D6B45]/10 p-8 sm:p-12 md:p-16">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-[#D4870A]/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md text-white text-xs font-bold px-3.5 py-1.5 rounded-full border border-white/20 shadow-xs">
            <Sparkles size={14} className="text-[#D4870A]" />
            <span>Catalogue & Hub de Services</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Tous les services de la diaspora à portée de main
          </h1>

          <p className="text-white/85 text-sm sm:text-base leading-relaxed max-w-2xl">
            Retrouvez le goût du pays avec nos chefs traiteurs partenaires ou expédiez vos colis rapidement et en toute sécurité avec nos voyageurs certifiés (GP).
          </p>
        </div>
      </section>

      {/* ── 2. GRILLE PRINCIPALE DES SERVICES (4 COLONNES SUR DESKTOP) ── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Nos prestations disponibles
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Des solutions pensées pour simplifier le quotidien de la communauté africaine
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Traiteur (Actif) */}
          <div className="h-full bg-white rounded-3xl p-6 border-2 border-emerald-100 hover:border-[#1D6B45] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-emerald-50/50 to-transparent group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-emerald-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ChefHat size={30} className="text-[#1D6B45]" />
                </div>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-[#1D6B45] flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Actif
                </span>
              </div>

              <div>
                <h3 className="font-black text-slate-900 text-xl group-hover:text-[#1D6B45] transition-colors">
                  Traiteurs & Chefs
                </h3>
                <p className="text-xs font-bold text-[#1D6B45] mt-0.5">
                  Saveurs authentiques & Événements
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Plats traditionnels cuisinés sur commande (Tiep, Mafé, Yassa, Ndolé, Attiéké poisson) et prestation traiteur pour mariages, baptêmes et fêtes familiales.
              </p>

              <div className="pt-2 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <BadgeCheck size={14} className="text-[#1D6B45]" />
                  <span>Chefs vérifiés & notés</span>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck size={14} className="text-[#1D6B45]" />
                  <span>Devis sur-mesure gratuit</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/traiteur"
                className="w-full flex items-center justify-between bg-[#1D6B45] hover:bg-[#154d31] text-white text-xs font-extrabold py-3 px-4 rounded-xl shadow-xs transition-all"
              >
                <span>Commander un plat</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/traiteur/demande"
                className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition-all"
              >
                <FileText size={13} />
                <span>Demander un devis</span>
              </Link>
            </div>
          </div>

          {/* 2. Transport GP Colis (Actif) */}
          <div className="h-full bg-white rounded-3xl p-6 border-2 border-amber-100 hover:border-[#D4870A] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-amber-50/50 to-transparent group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-amber-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Plane size={30} className="text-[#D4870A]" />
                </div>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-100 text-[#D4870A] flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Actif
                </span>
              </div>

              <div>
                <h3 className="font-black text-slate-900 text-xl group-hover:text-[#D4870A] transition-colors">
                  Transport GP Colis
                </h3>
                <p className="text-xs font-bold text-[#D4870A] mt-0.5">
                  Acheminement sécurisé de valises
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Connectez-vous avec des voyageurs pour expédier documents, vêtements et produits en toute confiance entre l'Europe, l'Afrique et l'Amérique du Nord.
              </p>

              <div className="pt-2 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <BadgeCheck size={14} className="text-[#D4870A]" />
                  <span>Billets d'avion et identités vérifiés</span>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck size={14} className="text-[#D4870A]" />
                  <span>Suivi de vol & alertes de retard</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col gap-2">
              <Link
                href="/gp"
                className="w-full flex items-center justify-between bg-[#D4870A] hover:bg-[#b87405] text-white text-xs font-extrabold py-3 px-4 rounded-xl shadow-xs transition-all"
              >
                <span>Trouver un transporteur</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/gp/nouvelle"
                className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl transition-all"
              >
                <PlusCircle size={13} />
                <span>Publier une annonce de vol</span>
              </Link>
            </div>
          </div>

          {/* 3. Épicerie (Bientôt) */}
          <div className="h-full bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-dashed border-slate-200 flex flex-col justify-between opacity-85">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <ShoppingCart size={28} className="text-slate-400" />
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center gap-1.5">
                  <Clock size={12} /> Bientôt
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 text-xl">
                  Épicerie & Ingrédients
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  Produits africains authentiques
                </p>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Trouvez facilement du gombo frais, des piments antillais, de la farine de manioc, du poisson séché et toutes les épices du terroir.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Ouverture prochaine</span>
              <Clock size={15} />
            </div>
          </div>

          {/* 4. Coiffure (Bientôt) */}
          <div className="h-full bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-dashed border-slate-200 flex flex-col justify-between opacity-85">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Scissors size={28} className="text-slate-400" />
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center gap-1.5">
                  <Clock size={12} /> Bientôt
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 text-xl">
                  Coiffure & Beauté Afro
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  Tresses, vanilles & soins capillaires
                </p>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Répertoire de coiffeuses et tresseuses expérimentées pour vos coiffures protectrices à domicile ou en salon.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Ouverture prochaine</span>
              <Clock size={15} />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. COMMENT ÇA MARCHE (DESKTOP SECTION) ── */}
      <section className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xs space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#1D6B45]">
            Simplicité & Rapidité
          </span>
          <h3 className="text-2xl font-black text-slate-900">
            Comment fonctionne Dabari ?
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Une mise en relation directe, transparente et sécurisée pour la diaspora
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-3 p-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#1D6B45] font-black text-xl flex items-center justify-center mx-auto shadow-xs">
              1
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">
              Choisissez votre prestation
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Consultez les menus de chefs traiteurs ou filtrez les annonces de vols GP par ville de départ et de destination.
            </p>
          </div>

          <div className="text-center space-y-3 p-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#D4870A] font-black text-xl flex items-center justify-center mx-auto shadow-xs">
              2
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">
              Réservez ou demandez un devis
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Commandez directement ou envoyez vos spécifications. Discutez en direct sur WhatsApp avec le prestataire.
            </p>
          </div>

          <div className="text-center space-y-3 p-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#1D6B45] font-black text-xl flex items-center justify-center mx-auto shadow-xs">
              3
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">
              Livraison & Réception en confiance
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Suivez l'état d'avancement de votre commande ou le vol de votre colis jusqu'à la remise en main propre.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. ENGAGEMENTS & RÉASSURANCE ── */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2 max-w-xl">
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Une question ou besoin d'assistance ?
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Notre équipe et notre communauté sont là pour vous aider 7 jours sur 7.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 flex-wrap">
          <a
            href="https://wa.me/33600000000?text=Bonjour%20Dabari%2C%20j%27ai%20une%20question"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#1D6B45] hover:bg-[#154d31] text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-md transition-all hover:scale-102"
          >
            <Headphones size={16} />
            <span>Support WhatsApp 7j/7</span>
          </a>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>100% Vérifié & Sécurisé</span>
          </div>
        </div>
      </section>
    </div>
  );
}
