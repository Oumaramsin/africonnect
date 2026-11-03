import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTraiteur, type PublicTraiteur } from "@/lib/publicApi";
import { breadcrumbJsonLd, jsonLdGraph, serializeJsonLd } from "@/lib/jsonLd";
import { NOINDEX_ROBOTS, absoluteUrl, pageMetadata, truncateText } from "@/lib/site";
import TraiteurDetailClient from "./TraiteurDetailClient";

type Props = { params: Promise<{ traiteurId: string }> };

// ISR : aucune fiche générée au build, chacune l'est à sa première visite puis au plus toutes les
// 5 minutes (TRAITEUR_REVALIDATE de src/lib/publicApi.ts)
export const revalidate = 300;

export async function generateStaticParams() {
  return [];
}

const cleanList = (values: string[] | null | undefined): string[] =>
  (values ?? []).map((value) => value?.trim()).filter((value): value is string => Boolean(value));

function describeTraiteur(traiteur: PublicTraiteur): string {
  const cuisines = cleanList(traiteur.cuisine_type).slice(0, 3);
  const zones = cleanList(traiteur.delivery_zones).slice(0, 3);
  const intro = `${traiteur.name} : traiteur de cuisine africaine${cuisines.length ? ` (${cuisines.join(", ")})` : ""}${
    zones.length ? `, livraison à ${zones.join(", ")}` : ""
  }.`;
  const details = traiteur.bio?.trim() || "Plats faits maison à commander en ligne et devis pour vos événements.";
  return truncateText(`${intro} ${details}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { traiteurId } = await params;
  const result = await getTraiteur(traiteurId);

  if (result.status === "not_found") {
    return { title: "Traiteur introuvable", robots: NOINDEX_ROBOTS };
  }
  if (result.status === "unavailable") {
    // Métadonnées génériques : la fiche sera chargée dans le navigateur
    return pageMetadata({
      title: "Traiteur africain",
      description:
        "Découvrez la carte de ce traiteur africain sur Dabari : plats faits maison à commander en ligne et devis pour vos événements.",
      path: `/traiteur/${traiteurId}`,
    });
  }

  const traiteur = result.data;
  return pageMetadata({
    title: `${traiteur.name} - Traiteur africain`,
    description: describeTraiteur(traiteur),
    path: `/traiteur/${traiteur.id}`,
    image: traiteur.image_url ? { url: traiteur.image_url, alt: traiteur.name } : undefined,
  });
}

function traiteurJsonLd(traiteur: PublicTraiteur) {
  const url = absoluteUrl(`/traiteur/${traiteur.id}`);
  const cuisines = cleanList(traiteur.cuisine_type);
  const zones = cleanList(traiteur.delivery_zones);
  const prices = (traiteur.dishes ?? [])
    .filter((dish) => dish.is_available)
    .map((dish) => Number(dish.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  const reviewCount = Number(traiteur.review_count) || 0;
  const rating = Number(traiteur.rating);

  return jsonLdGraph(
    {
      "@type": "FoodEstablishment",
      "@id": `${url}#traiteur`,
      name: traiteur.name,
      description: traiteur.bio?.trim() || "Traiteur de cuisine africaine traditionnelle sur Dabari.",
      url,
      ...(traiteur.image_url ? { image: [traiteur.image_url] } : {}),
      servesCuisine: cuisines.length ? cuisines : ["Cuisine africaine"],
      ...(zones.length ? { areaServed: zones.map((zone) => ({ "@type": "Place", name: zone })) } : {}),
      menu: `${url}#carte`,
      ...(prices.length
        ? {
            priceRange:
              Math.min(...prices) === Math.max(...prices)
                ? `${Math.min(...prices).toFixed(2)} €`
                : `${Math.min(...prices).toFixed(2)} € - ${Math.max(...prices).toFixed(2)} €`,
          }
        : {}),
      ...(reviewCount > 0 && Number.isFinite(rating) && rating > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: rating,
              reviewCount,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
    },
    breadcrumbJsonLd([
      { name: "Accueil", path: "/" },
      { name: "Traiteurs", path: "/traiteur" },
      { name: traiteur.name, path: `/traiteur/${traiteur.id}` },
    ]),
  );
}

export default async function TraiteurDetailPage({ params }: Props) {
  const { traiteurId } = await params;
  const result = await getTraiteur(traiteurId);

  // 404 uniquement si l'API confirme l'absence (ou un traiteur désactivé) ; API injoignable :
  // la page s'affiche et la fiche est chargée dans le navigateur
  if (result.status === "not_found") notFound();
  const traiteur = result.status === "ok" ? result.data : null;

  return (
    <>
      {traiteur && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(traiteurJsonLd(traiteur)) }}
        />
      )}
      <TraiteurDetailClient key={traiteurId} traiteurId={traiteurId} initialTraiteur={traiteur} />
    </>
  );
}
