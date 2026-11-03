import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGpListing, isUpcomingDeparture } from "@/lib/publicApi";
import type { GpListing } from "@/lib/types/gp";
import { breadcrumbJsonLd, jsonLdGraph, serializeJsonLd } from "@/lib/jsonLd";
import { NOINDEX_ROBOTS, SITE_URL, absoluteUrl, pageMetadata, truncateText } from "@/lib/site";
import GpDetailClient from "./GpDetailClient";

type Props = { params: Promise<{ listingId: string }> };

// ISR : aucune annonce générée au build, chacune l'est à sa première visite puis au plus toutes
// les minutes (GP_REVALIDATE de src/lib/publicApi.ts)
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

/** Date de vol (colonne DATE, minuit UTC) en toutes lettres, sans décalage de fuseau. */
const formatFlightDate = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Nombre au format français (les décimaux de l'API arrivent parfois sous forme de chaîne). */
const formatNumber = (value: unknown, minDigits: number, maxDigits: number) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString("fr-FR", { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits })
    : "?";
};

function describeListing(listing: GpListing): string {
  return truncateText(
    `Envoyez vos colis de ${listing.departure_city} (${listing.departure_country}) à ${listing.arrival_city} (${listing.arrival_country}) avec un voyageur GP vérifié : départ le ${formatFlightDate(listing.departure_date)}, ${formatNumber(listing.available_kg, 0, 1)} kg disponibles à ${formatNumber(listing.price_per_kg, 2, 2)} €/kg, paiement sous séquestre.`,
    200,
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { listingId } = await params;
  const result = await getGpListing(listingId);

  if (result.status === "not_found") {
    return { title: "Trajet GP introuvable", robots: NOINDEX_ROBOTS };
  }
  if (result.status === "unavailable") {
    // Métadonnées génériques : l'annonce sera chargée dans le navigateur
    return pageMetadata({
      title: "Vol GP : transport de colis",
      description:
        "Réservez des kilos auprès d'un voyageur GP vérifié pour envoyer vos colis entre l'Europe et l'Afrique, avec paiement sous séquestre.",
      path: `/gp/${listingId}`,
    });
  }

  const listing = result.data;
  const metadata = pageMetadata({
    title: `GP ${listing.departure_city} → ${listing.arrival_city}, départ le ${formatFlightDate(listing.departure_date)}`,
    description: describeListing(listing),
    path: `/gp/${listing.id}`,
  });
  // Annonce dont le départ est passé : consultable mais retirée de l'index
  return isUpcomingDeparture(listing.departure_date) ? metadata : { ...metadata, robots: NOINDEX_ROBOTS };
}

function listingJsonLd(listing: GpListing) {
  const url = absoluteUrl(`/gp/${listing.id}`);
  const route = `${listing.departure_city} → ${listing.arrival_city}`;
  const pricePerKg = Number(listing.price_per_kg);
  const availableKg = Number(listing.available_kg);
  const traveler = (listing.gp || listing.profiles)?.full_name;
  const upcoming = isUpcomingDeparture(listing.departure_date);

  return jsonLdGraph(
    {
      "@type": "Service",
      "@id": `${url}#service`,
      name: `Transport de colis GP ${route}`,
      serviceType: "Transport de colis par voyageur (GP)",
      description: describeListing(listing),
      url,
      ...(traveler ? { provider: { "@type": "Person", name: traveler } } : {}),
      broker: { "@id": `${SITE_URL}/#organization` },
      areaServed: [
        { "@type": "Place", name: `${listing.departure_city}, ${listing.departure_country}` },
        { "@type": "Place", name: `${listing.arrival_city}, ${listing.arrival_country}` },
      ],
      ...(Number.isFinite(pricePerKg) && pricePerKg > 0
        ? {
            offers: {
              "@type": "Offer",
              url,
              price: pricePerKg,
              priceCurrency: "EUR",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: pricePerKg,
                priceCurrency: "EUR",
                unitCode: "KGM",
                unitText: "kg",
                referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "KGM" },
              },
              ...(Number.isFinite(availableKg)
                ? { eligibleQuantity: { "@type": "QuantitativeValue", maxValue: availableKg, unitCode: "KGM" } }
                : {}),
              availability:
                upcoming && availableKg > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
              validThrough: listing.departure_date,
            },
          }
        : {}),
    },
    breadcrumbJsonLd([
      { name: "Accueil", path: "/" },
      { name: "Vols GP", path: "/gp" },
      { name: route, path: `/gp/${listing.id}` },
    ]),
  );
}

export default async function GpDetailPage({ params }: Props) {
  const { listingId } = await params;
  const result = await getGpListing(listingId);

  // 404 uniquement si l'API confirme l'absence ; API injoignable : la page s'affiche et
  // l'annonce est chargée dans le navigateur
  if (result.status === "not_found") notFound();
  const listing = result.status === "ok" ? result.data : null;

  return (
    <>
      {listing && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(listingJsonLd(listing)) }}
        />
      )}
      <GpDetailClient key={listingId} listingId={listingId} initialListing={listing} />
    </>
  );
}
