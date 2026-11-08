import type { Metadata } from "next";
import { getGpListings } from "@/lib/publicApi";
import { breadcrumbJsonLd, jsonLdGraph, serializeJsonLd } from "@/lib/jsonLd";
import { pageMetadata } from "@/lib/site";
import GpListClient from "./GpListClient";

// ISR : annonces régénérées au plus toutes les minutes (GP_REVALIDATE de src/lib/publicApi.ts)
export const revalidate = 60;

export const metadata: Metadata = pageMetadata({
  title: "GP : transport de colis international sécurisé",
  description:
    "Envoyez vos colis et bagages entre l'Afrique (Sénégal, Côte d'Ivoire, Cameroun...) et l'Europe avec des voyageurs GP vérifiés. Tarifs au kilo transparents, paiement direct au voyageur.",
  path: "/gp",
});

const breadcrumb = serializeJsonLd(
  jsonLdGraph(
    breadcrumbJsonLd([
      { name: "Accueil", path: "/" },
      { name: "Vols GP", path: "/gp" },
    ]),
  ),
);

export default async function GpPage() {
  // API injoignable : la page s'affiche quand même et les annonces sont chargées dans le navigateur
  const result = await getGpListings();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumb }} />
      <GpListClient initialListings={result.status === "ok" ? result.data : null} />
    </>
  );
}
