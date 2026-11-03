import type { Metadata } from "next";

/*
 * Identité et URL publiques du site : source unique pour les métadonnées (canonical, Open Graph),
 * le sitemap, robots.txt et les données structurées JSON-LD.
 */

/** Domaine de production canonique (sans barre finale). */
export const SITE_URL = "https://www.dabari.fr";
export const SITE_NAME = "Dabari";
export const SITE_LOCALE = "fr_FR";

/** Titre et description par défaut (accueil, pages sans métadonnées propres). */
export const SITE_TITLE = "Dabari - Plateforme Diaspora Africaine | Traiteurs & GP Sécurisé";
export const SITE_DESCRIPTION =
  "La plateforme de référence pour la diaspora africaine : commandez auprès des meilleurs traiteurs traditionnels et expédiez vos colis en toute sécurité avec nos voyageurs GP certifiés.";

/** Adresse de contact publique (celle des CGU, src/data/cguData.ts). */
export const CONTACT_EMAIL = "contact@ramsin.fr";

/** Couleur de marque (barre du navigateur mobile, manifeste). */
export const THEME_COLOR = "#1D6B45";

export type ShareImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

/** Image de partage par défaut, générée par src/app/opengraph-image.tsx (1200 × 630). */
export const DEFAULT_SHARE_IMAGE: ShareImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Dabari - Traiteurs africains et transport de colis GP pour la diaspora",
};

/** Pages privées, d'authentification ou transactionnelles : hors index, liens suivis. */
export const NOINDEX_ROBOTS: Metadata["robots"] = { index: false, follow: true };

/** URL absolue d'un chemin du site (« / » donne l'origine seule, comme les balises canonical). */
export function absoluteUrl(path = "/"): string {
  if (path === "/" || path === "") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Raccourcit un texte pour une meta description (coupe au dernier mot entier). */
export function truncateText(text: string, maxLength = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, "")}…`;
}

type PageMetadataOptions = {
  /** Titre de la page sans le nom du site (le gabarit « %s | Dabari » du layout racine l'ajoute),
   *  ou `{ absolute }` pour un titre complet (accueil). */
  title: string | { absolute: string };
  description: string;
  /** Chemin canonique relatif (ex : "/traiteur"), résolu avec `metadataBase`. */
  path: string;
  /** Image de partage propre à la page ; à défaut, l'image générée du site. */
  image?: ShareImage | null;
};

/**
 * Métadonnées d'une page publique : canonical + Open Graph complet. Les objets `openGraph` ne se
 * fusionnent pas entre segments (un enfant remplace celui du parent) : chaque page fournit donc
 * le sien en entier, image comprise. La carte Twitter est complétée par Next.js depuis Open Graph.
 */
export function pageMetadata({ title, description, path, image }: PageMetadataOptions): Metadata {
  const shareTitle = typeof title === "string" ? `${title} | ${SITE_NAME}` : title.absolute;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: SITE_LOCALE,
      siteName: SITE_NAME,
      url: path,
      title: shareTitle,
      description,
      images: [image ?? DEFAULT_SHARE_IMAGE],
    },
  };
}
