import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  Database,
  Target,
  Users,
  Globe,
  Clock,
  Cookie,
  Lock,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { CONTACT_EMAIL, pageMetadata } from "@/lib/site";

/*
 * Politique de confidentialité de Dabari (site et application), responsable du traitement : RAMSIN.
 * Elle décrit le fonctionnement réel du service : à mettre à jour à chaque nouvelle donnée collectée,
 * nouveau prestataire technique (e-mails, paiement...) ou changement de durée de conservation.
 */
export const metadata: Metadata = pageMetadata({
  title: "Politique de confidentialité",
  description:
    "Données personnelles traitées par Dabari (site et application) : données collectées, finalités, destinataires, durées de conservation, cookies et exercice de vos droits.",
  path: "/confidentialite",
});

const LAST_UPDATE = "novembre 2026";

const linkClass = "font-semibold text-[#1D6B45] underline underline-offset-2";
const sectionClass = "bg-white rounded-3xl border border-slate-200 p-6 space-y-3";
const titleClass = "flex items-center gap-2 text-lg font-bold text-slate-900";
const listClass = "list-disc pl-5 space-y-1.5 text-sm text-slate-700 leading-relaxed";
const textClass = "text-sm text-slate-700 leading-relaxed";

export default function ConfidentialitePage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-[#1D6B45] text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-100">
          <ShieldCheck size={14} />
          <span>Données personnelles</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
          Politique de confidentialité
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Cette politique explique quelles données personnelles sont traitées lorsque vous utilisez Dabari (site
          www.dabari.fr et application mobile), pourquoi, avec qui elles sont partagées et comment exercer vos
          droits. Dernière mise à jour : {LAST_UPDATE}.
        </p>
      </header>

      <section className={sectionClass}>
        <h2 className={titleClass}>
          <Building2 size={20} className="text-[#1D6B45]" />
          Responsable du traitement
        </h2>
        <p className={textClass}>
          RAMSIN, SASU au capital de 300 €, immatriculée au RCS de Créteil sous le numéro 941 420 408, dont le siège
          social est situé 27 rue des Frères Lumière, 94260 Fresnes, France. Contact :{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
            {CONTACT_EMAIL}
          </a>
          . Voir aussi les{" "}
          <Link href="/mentions-legales" className={linkClass}>
            mentions légales
          </Link>
          .
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>
          <Database size={20} className="text-[#1D6B45]" />
          Données que nous traitons
        </h2>
        <ul className={listClass}>
          <li>
            <strong>Votre compte</strong> : nom et prénom, adresse e-mail et/ou numéro de téléphone, mot de passe
            (enregistré uniquement sous forme chiffrée irréversible), ville ou adresse si vous la renseignez.
          </li>
          <li>
            <strong>Votre profil de prestataire</strong>, si vous en créez un : nom commercial, description,
            spécialités, photos de plats, tarifs, zone d&apos;intervention et numéro WhatsApp ; pour les voyageurs
            GP, vos trajets (villes, dates, kilos disponibles, prix).
          </li>
          <li>
            <strong>Vos demandes et vos échanges sur Dabari</strong> : annonces de recherche de traiteur (type et
            date d&apos;événement, nombre d&apos;invités, lieu, préférences), propositions, commandes de plats
            (adresse et date de livraison ou de retrait), devis (montants, conditions, acompte déclaré, signatures
            électroniques : nom saisi et date), demandes de transport de colis (poids, description du contenu).
          </li>
          <li>
            <strong>Les photos</strong> que vous choisissez d&apos;envoyer depuis la galerie de votre appareil.
          </li>
          <li>
            <strong>Les notifications</strong> affichées dans votre espace et, si vous les autorisez, l&apos;identifiant
            technique de votre appareil pour les notifications push, avec son type (Android ou iOS).
          </li>
          <li>
            <strong>Des données techniques</strong> : adresse IP et journaux du serveur, utilisés pour la sécurité
            (limitation des tentatives de connexion, prévention des abus).
          </li>
        </ul>
        <p className={textClass}>
          Dabari ne collecte pas votre position, n&apos;accède ni à vos contacts ni à l&apos;appareil photo, ne fait
          pas de mesure d&apos;audience ni de publicité, et ne traite aucune donnée bancaire : les paiements se font
          directement entre utilisateurs, en dehors de Dabari.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>
          <Target size={20} className="text-[#1D6B45]" />
          Pourquoi et sur quelle base
        </h2>
        <ul className={listClass}>
          <li>
            Créer et gérer votre compte, vous mettre en relation avec les traiteurs, voyageurs GP ou clients, gérer
            annonces, devis, commandes et réservations : <strong>exécution du contrat</strong> (nos{" "}
            <Link href="/cgu" className={linkClass}>
              conditions d&apos;utilisation
            </Link>
            ).
          </li>
          <li>
            Vous informer de l&apos;avancement de vos commandes et devis, dans votre espace et par notification
            push : <strong>exécution du contrat</strong>. Les notifications push nécessitent votre autorisation,
            que vous pouvez retirer à tout moment dans les réglages de votre téléphone.
          </li>
          <li>
            Assurer la sécurité du service et prévenir la fraude et les abus : <strong>intérêt légitime</strong>.
          </li>
          <li>
            Répondre aux demandes des autorités et respecter nos obligations légales :{" "}
            <strong>obligation légale</strong>.
          </li>
        </ul>
        <p className={textClass}>Vos données ne sont ni vendues ni utilisées à des fins publicitaires.</p>
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>
          <Users size={20} className="text-[#1D6B45]" />
          Qui a accès à vos données
        </h2>
        <ul className={listClass}>
          <li>
            <strong>Les autres utilisateurs</strong>, uniquement pour la mise en relation : le profil public des
            prestataires (nom, ville, photos, numéro WhatsApp) ; votre nom, vos coordonnées et le détail de votre
            demande pour le prestataire ou le client avec qui vous échangez.
          </li>
          <li>
            <strong>Nos prestataires techniques</strong>, qui traitent les données pour notre compte : Vercel Inc.
            (hébergement du site), Railway Corporation (hébergement du serveur et de la base de données),
            Cloudflare, Inc. (stockage des photos), Expo (650 Industries, Inc.), Google (Firebase Cloud Messaging) et
            Apple (Apple Push Notification service) pour l&apos;acheminement des notifications push, ainsi que notre
            prestataire d&apos;envoi d&apos;e-mails lorsque l&apos;envoi d&apos;e-mails est activé.
          </li>
          <li>
            <strong>L&apos;API Adresse de l&apos;État</strong> (adresse.data.gouv.fr), qui reçoit le texte que vous
            saisissez dans un champ d&apos;adresse pour vous proposer des suggestions.
          </li>
          <li>
            <strong>OpenStreetMap (service Nominatim, OpenStreetMap Foundation)</strong>, qui reçoit une adresse
            saisie hors de France pour en vérifier l&apos;existence.
          </li>
          <li>
            <strong>WhatsApp</strong> : si vous ouvrez une conversation WhatsApp depuis Dabari, l&apos;échange se
            déroule sur WhatsApp et relève de sa propre politique de confidentialité.
          </li>
          <li>
            <strong>Les autorités</strong>, uniquement sur demande légale.
          </li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>
          <Globe size={20} className="text-[#1D6B45]" />
          Transferts hors de l&apos;Union européenne
        </h2>
        <p className={textClass}>
          Certains de ces prestataires sont établis aux États-Unis ou peuvent y traiter des données. Ces transferts
          sont encadrés par les garanties prévues par le RGPD : décision d&apos;adéquation du cadre de protection
          des données UE–États-Unis (Data Privacy Framework) pour les entreprises certifiées, ou clauses
          contractuelles types adoptées par la Commission européenne.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>
          <Clock size={20} className="text-[#1D6B45]" />
          Durées de conservation
        </h2>
        <ul className={listClass}>
          <li>
            <strong>Compte et profil</strong> : tant que votre compte est actif. Vous pouvez le supprimer à tout
            moment (voir « Vos droits »).
          </li>
          <li>
            <strong>À la suppression du compte</strong> : votre compte, votre profil, vos notifications, vos
            annonces de recherche de traiteur et les appareils enregistrés pour les notifications sont supprimés ;
            votre profil traiteur et vos trajets GP sont retirés de la plateforme. Les commandes, devis et demandes
            de transport conclus avec d&apos;autres utilisateurs sont conservés sans lien avec votre compte, car
            l&apos;autre partie peut en avoir besoin, pendant la durée de prescription applicable (en principe
            5 ans) pour la gestion d&apos;éventuels litiges et le respect de nos obligations légales.
          </li>
          <li>
            <strong>Identifiant d&apos;appareil pour les notifications push</strong> : supprimé à la déconnexion,
            lorsque l&apos;appareil n&apos;est plus valide, ou à la suppression du compte.
          </li>
          <li>
            <strong>Journaux techniques</strong> : 12 mois au plus.
          </li>
        </ul>
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>
          <Cookie size={20} className="text-[#1D6B45]" />
          Cookies
        </h2>
        <p className={textClass}>
          Le site utilise uniquement deux cookies strictement nécessaires à la connexion : <code>dabari_token</code>{" "}
          (votre session, inaccessible aux scripts de la page) et <code>dabari_session</code> (indique qu&apos;une
          session est ouverte). Ils expirent au bout de 7 jours ou à la déconnexion et ne nécessitent pas de
          consentement. Aucun cookie de mesure d&apos;audience ou de publicité n&apos;est déposé. Dans
          l&apos;application, la session est conservée dans le stockage sécurisé de votre téléphone.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>
          <Lock size={20} className="text-[#1D6B45]" />
          Sécurité
        </h2>
        <p className={textClass}>
          Les échanges sont chiffrés (HTTPS), les mots de passe ne sont jamais conservés en clair, les sessions sont
          protégées et l&apos;accès aux données est limité aux besoins du service.
        </p>
      </section>

      <section className="bg-slate-50 rounded-3xl border border-slate-200 p-6 space-y-3">
        <h2 className={titleClass}>
          <Scale size={20} className="text-[#1D6B45]" />
          Vos droits
        </h2>
        <p className={textClass}>
          Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation,
          d&apos;opposition et de portabilité de vos données, ainsi que du droit de définir des directives sur leur
          sort après votre décès. Vous pouvez modifier votre profil depuis votre compte et le supprimer depuis
          l&apos;application (onglet Profil) ou le site (
          <Link href="/suppression-compte" className={linkClass}>
            supprimer mon compte
          </Link>
          ).
        </p>
        <p className={textClass}>
          Pour toute autre demande, écrivez à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
            {CONTACT_EMAIL}
          </a>{" "}
          : nous répondons dans un délai d&apos;un mois. Vous pouvez aussi adresser une réclamation à la CNIL (
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className={linkClass}>
            www.cnil.fr
          </a>
          ).
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Cette politique peut évoluer avec le service ; la date de mise à jour figure en haut de la page.
        </p>
      </section>
    </div>
  );
}
