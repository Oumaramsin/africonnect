import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Smartphone, Monitor, Trash2, ShieldCheck } from "lucide-react";
import { CONTACT_EMAIL, pageMetadata } from "@/lib/site";

/*
 * Page publique de suppression de compte, accessible sans connexion : exigée par Google Play (et
 * l'App Store) pour les applications qui permettent de créer un compte. Elle décrit les trois voies
 * prévues par l'article 11.2 des CGU : l'application, le site et la demande par e-mail.
 */
export const metadata: Metadata = pageMetadata({
  title: "Supprimer mon compte Dabari",
  description:
    "Comment supprimer votre compte Dabari et vos données personnelles depuis l'application, le site web ou par e-mail.",
  path: "/suppression-compte",
});

const DELETE_MAIL_SUBJECT = encodeURIComponent("Demande de suppression de mon compte Dabari");
const DELETE_MAIL_BODY = encodeURIComponent(
  "Bonjour,\n\nJe souhaite la suppression de mon compte Dabari et de mes données personnelles.\n" +
    "Adresse e-mail ou numéro de téléphone du compte : \n\nMerci."
);

export default function SuppressionComptePage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-full border border-rose-100">
          <Trash2 size={14} />
          <span>Données personnelles</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
          Supprimer mon compte Dabari
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Vous pouvez supprimer votre compte à tout moment, depuis l&apos;application, depuis le site ou en
          nous écrivant. La suppression est définitive.
        </p>
      </header>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Smartphone size={20} className="text-[#1D6B45]" />
          Depuis l&apos;application mobile
        </h2>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700">
          <li>Connectez-vous à l&apos;application Dabari.</li>
          <li>Ouvrez l&apos;onglet « Profil ».</li>
          <li>Touchez « Supprimer mon compte définitivement », puis confirmez.</li>
        </ol>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Monitor size={20} className="text-[#1D6B45]" />
          Depuis le site web
        </h2>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700">
          <li>
            <Link href="/login" className="font-semibold text-[#1D6B45] underline underline-offset-2">
              Connectez-vous
            </Link>{" "}
            sur www.dabari.fr.
          </li>
          <li>
            Allez dans{" "}
            <Link href="/profil" className="font-semibold text-[#1D6B45] underline underline-offset-2">
              Mon profil
            </Link>
            , rubrique « Gestion du compte ».
          </li>
          <li>Cliquez sur « Supprimer mon compte définitivement », puis confirmez.</li>
        </ol>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Mail size={20} className="text-[#1D6B45]" />
          Sans accès à votre compte
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Écrivez-nous depuis l&apos;adresse e-mail de votre compte (ou en indiquant le numéro de téléphone
          utilisé) à{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${DELETE_MAIL_SUBJECT}&body=${DELETE_MAIL_BODY}`}
            className="font-semibold text-[#1D6B45] underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
          . Nous vérifions que la demande vient bien du titulaire du compte avant de le supprimer.
        </p>
      </section>

      <section className="bg-slate-50 rounded-3xl border border-slate-200 p-6 space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ShieldCheck size={20} className="text-[#1D6B45]" />
          Ce qui est supprimé
        </h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
          <li>Votre compte et vos informations de profil (nom, e-mail, téléphone, ville).</li>
          <li>Vos notifications, vos annonces de recherche de traiteur et les appareils enregistrés pour les notifications.</li>
          <li>Votre profil traiteur et vos annonces de transport GP sont retirés de la plateforme.</li>
        </ul>
        <p className="text-xs text-slate-500 leading-relaxed">
          Les commandes, devis et demandes de transport conclus avec d&apos;autres utilisateurs sont conservés sans
          lien avec votre compte, car l&apos;autre partie peut en avoir besoin, pendant la durée nécessaire à la
          gestion d&apos;éventuels litiges et au respect de nos obligations légales.
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Vos autres droits (accès, rectification, portabilité) sont décrits dans la{" "}
          <Link href="/confidentialite" className="underline underline-offset-2">
            politique de confidentialité
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
