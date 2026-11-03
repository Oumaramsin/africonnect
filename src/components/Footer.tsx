"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Heart, Plane, UtensilsCrossed, Mail } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/site";

export default function Footer() {
  const pathname = usePathname();

  const hideFooterOn = ["/login", "/register", "/reset-password", "/forgot-password"];
  if (hideFooterOn.includes(pathname)) return null;

  return (
    <footer className="hidden md:block w-full bg-slate-900 text-slate-300 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* ── COLONNE 1 : BRAND & MISSION ── */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3 w-fit" aria-label="Dabari, retour à l'accueil">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1D6B45] to-[#0F4A30] flex items-center justify-center text-white shadow-md">
                <span className="font-black text-xl text-[#FAF7F2]">D</span>
              </div>
              <span className="font-black text-2xl tracking-tight text-white">
                Dabari
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              La plateforme de confiance qui connecte la diaspora africaine : traiteurs passionnés, saveurs authentiques et transport sécurisé de colis (GP) entre l&apos;Afrique, l&apos;Europe et le reste du monde.
            </p>

            <div className="pt-2 flex items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-emerald-400 font-semibold border border-slate-700">
                <ShieldCheck size={14} /> Profils & avis vérifiés
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-amber-400 font-semibold border border-slate-700">
                <Heart size={14} /> Réseau solidaire
              </span>
            </div>
          </div>

          {/* ── COLONNE 2 : SERVICES ── */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Services</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/traiteur" className="hover:text-white transition-colors flex items-center gap-2">
                  <UtensilsCrossed size={14} className="text-[#1D6B45]" /> Traiteurs & Chefs
                </Link>
              </li>
              <li>
                <Link href="/traiteur/demande" className="hover:text-white transition-colors">
                  Demande de devis
                </Link>
              </li>
              <li>
                <Link href="/gp" className="hover:text-white transition-colors flex items-center gap-2">
                  <Plane size={14} className="text-sky-400" /> Transport de colis GP
                </Link>
              </li>
              <li>
                <Link href="/gp/nouvelle" className="hover:text-white transition-colors">
                  Publier un trajet GP
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-white transition-colors">
                  Catalogue complet
                </Link>
              </li>
            </ul>
          </div>

          {/* ── COLONNE 3 : ESPACE PRO ── */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Espace Professionnel</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/profil/gp" className="hover:text-white transition-colors">
                  Tableau de bord GP
                </Link>
              </li>
              <li>
                <Link href="/profil/traiteur" className="hover:text-white transition-colors">
                  Espace Traiteur Pro
                </Link>
              </li>
              <li>
                <Link href="/commandes" className="hover:text-white transition-colors">
                  Suivi des commandes
                </Link>
              </li>
              <li>
                <Link href="/profil" className="hover:text-white transition-colors">
                  Paramètres du compte
                </Link>
              </li>
            </ul>
          </div>

          {/* ── COLONNE 4 : SUPPORT & CONTACT ── */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Assistance</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  <Mail size={15} /> Nous écrire
                </a>
              </li>
              <li>
                <Link
                  href="/cgu"
                  className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-xs font-semibold"
                >
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Conditions d&apos;Utilisation (CGU)
                </Link>
              </li>
              <li>
                <span className="text-slate-400 text-xs">
                  Disponible 7j/7 pour vous assister dans vos expéditions et réservations.
                </span>
              </li>
              </ul>
            </div>
          </div>

          {/* ── BAS DE PAGE : COPYRIGHT & MENTIONS ── */}
          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Dabari. Tous droits réservés.</p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <span>Fait avec passion pour la diaspora africaine</span>
              <span>•</span>
              <Link href="/cgu" className="hover:text-emerald-400 transition-colors font-medium">
                Conditions Générales (CGU)
              </Link>
              <span>•</span>
              {/* Politique de confidentialité : article 11 des CGU (src/data/cguData.ts) */}
              <Link href="/cgu#article-11" className="hover:text-emerald-400 transition-colors font-medium">
                Confidentialité & RGPD
              </Link>
              <span>•</span>
              <Link href="/suppression-compte" className="hover:text-emerald-400 transition-colors font-medium">
                Supprimer mon compte
              </Link>
            </div>
          </div>
      </div>
    </footer>
  );
}
