import type { Metadata } from "next";
import Link from "next/link";
import { Building2, UserRound, Server, Copyright, ShieldCheck, Flag, FileText } from "lucide-react";
import { CONTACT_EMAIL, pageMetadata } from "@/lib/site";

/*
 * Mentions légales (article 6 de la loi n° 2004-575 du 21 juin 2004, LCEN) du site et de l'application
 * Dabari, édités par RAMSIN. Informations d'identification reprises de https://ramsin.fr/mentions-legales.
 */
export const metadata: Metadata = pageMetadata({
  title: "Mentions légales",
  description:
    "Mentions légales de Dabari (site www.dabari.fr et application mobile) : éditeur RAMSIN, directeur de la publication, hébergeurs et propriété intellectuelle.",
  path: "/mentions-legales",
});

const LAST_UPDATE = "novembre 2026";
const COMPANY_PHONE_DISPLAY = "+33 (0)7 61 51 88 90";
const COMPANY_PHONE_LINK = "+33761518890";

const linkClass = "font-semibold text-[#1D6B45] underline underline-offset-2";

export default function MentionsLegalesPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-[#1D6B45] text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-100">
          <FileText size={14} />
          <span>Informations légales</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Mentions légales</h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Le site www.dabari.fr et l&apos;application mobile Dabari sont un service de mise en relation édité par la
          société RAMSIN. Dernière mise à jour : {LAST_UPDATE}.
        </p>
      </header>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Building2 size={20} className="text-[#1D6B45]" />
          Éditeur
        </h2>
        <ul className="space-y-1.5 text-sm text-slate-700 leading-relaxed">
          <li>
            <strong>RAMSIN</strong>, société par actions simplifiée unipersonnelle (SASU) au capital de 300 €
          </li>
          <li>Immatriculée au RCS de Créteil sous le numéro 941 420 408</li>
          <li>Numéro de TVA intracommunautaire : FR21 941 420 408</li>
          <li>Siège social : 27 rue des Frères Lumière, 94260 Fresnes, France</li>
          <li>
            Contact :{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
              {CONTACT_EMAIL}
            </a>{" "}
            ·{" "}
            <a href={`tel:${COMPANY_PHONE_LINK}`} className={linkClass}>
              {COMPANY_PHONE_DISPLAY}
            </a>
          </li>
        </ul>
        <p className="text-xs text-slate-500 leading-relaxed">
          Dabari est une marque et un service exploités par RAMSIN.
        </p>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <UserRound size={20} className="text-[#1D6B45]" />
          Directeur de la publication
        </h2>
        <p className="text-sm text-slate-700">Oumar Sidibé, président de RAMSIN.</p>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Server size={20} className="text-[#1D6B45]" />
          Hébergement
        </h2>
        <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <li>
            <strong>Site web</strong> : Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis
            (vercel.com).
          </li>
          <li>
            <strong>Serveur applicatif (API) et base de données</strong> : Railway Corporation, 548 Market St PMB
            68956, San Francisco, CA 94104, États-Unis (railway.com).
          </li>
          <li>
            <strong>Photos et médias publiés</strong> : Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107,
            États-Unis (cloudflare.com).
          </li>
        </ul>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Copyright size={20} className="text-[#1D6B45]" />
          Propriété intellectuelle
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          La marque Dabari, son logo, la charte graphique, les textes et l&apos;interface du site et de
          l&apos;application sont la propriété de RAMSIN. Toute reproduction ou réutilisation, totale ou partielle,
          sans autorisation préalable écrite est interdite.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Les contenus publiés par les utilisateurs (photos, descriptions, menus, annonces) restent sous la
          responsabilité de leurs auteurs. Les marques et logos de tiers cités (par exemple WhatsApp) appartiennent
          à leurs propriétaires respectifs.
        </p>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Flag size={20} className="text-[#1D6B45]" />
          Signaler un contenu illicite
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Pour signaler une annonce, une photo ou un profil qui vous paraît illicite ou contraire aux{" "}
          <Link href="/cgu" className={linkClass}>
            conditions d&apos;utilisation
          </Link>
          , écrivez à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
            {CONTACT_EMAIL}
          </a>{" "}
          en précisant l&apos;adresse de la page concernée et la raison de votre signalement.
        </p>
      </section>

      <section className="bg-slate-50 rounded-3xl border border-slate-200 p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ShieldCheck size={20} className="text-[#1D6B45]" />
          Données personnelles et cookies
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Le traitement de vos données personnelles est décrit dans la{" "}
          <Link href="/confidentialite" className={linkClass}>
            politique de confidentialité
          </Link>
          . Le site n&apos;utilise que des cookies strictement nécessaires à la connexion : aucune mesure
          d&apos;audience ni publicité.
        </p>
      </section>
    </div>
  );
}
