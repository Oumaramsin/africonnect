import type { MetadataRoute } from "next";
import { getActiveTraiteurs, getGpListings, isUpcomingDeparture } from "@/lib/publicApi";
import { absoluteUrl } from "@/lib/site";

// Régénéré au plus une fois par heure ; une API injoignable donne un sitemap limité aux pages fixes
export const revalidate = 3600;

const SITEMAP_REVALIDATE = 3600;

/** Date ISO valide, sinon undefined (pas de date « artificielle »). */
const toDate = (value: string | null | undefined): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** Dernière date connue parmi plusieurs (création du profil, ajout des plats...). */
const latestDate = (values: (string | null | undefined)[]): Date | undefined =>
  values
    .map(toDate)
    .filter((date): date is Date => date !== undefined)
    .sort((a, b) => b.getTime() - a.getTime())[0];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/traiteur"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/gp"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/services"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/cgu"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/suppression-compte"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/confidentialite"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/mentions-legales"), changeFrequency: "yearly", priority: 0.2 },
  ];

  const [traiteurs, listings] = await Promise.all([
    getActiveTraiteurs(SITEMAP_REVALIDATE),
    getGpListings(SITEMAP_REVALIDATE),
  ]);

  const traiteurPages: MetadataRoute.Sitemap =
    traiteurs.status === "ok"
      ? traiteurs.data.map((traiteur) => ({
          url: absoluteUrl(`/traiteur/${traiteur.id}`),
          lastModified: latestDate([traiteur.created_at, ...(traiteur.dishes ?? []).map((dish) => dish.created_at)]),
          changeFrequency: "weekly",
          priority: 0.8,
        }))
      : [];

  // Seules les annonces dont le départ n'est pas passé : les autres sont en noindex
  const gpPages: MetadataRoute.Sitemap =
    listings.status === "ok"
      ? listings.data
          .filter((listing) => isUpcomingDeparture(listing.departure_date))
          .map((listing) => ({
            url: absoluteUrl(`/gp/${listing.id}`),
            lastModified: toDate(listing.created_at),
            changeFrequency: "daily",
            priority: 0.7,
          }))
      : [];

  return [...staticPages, ...traiteurPages, ...gpPages];
}
