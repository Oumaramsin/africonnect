import type { Metadata } from "next";
import { getActiveTraiteurs } from "@/lib/publicApi";
import { breadcrumbJsonLd, jsonLdGraph, serializeJsonLd } from "@/lib/jsonLd";
import { pageMetadata } from "@/lib/site";
import TraiteurListClient from "./TraiteurListClient";

// ISR : liste régénérée au plus toutes les 5 minutes (TRAITEUR_REVALIDATE de src/lib/publicApi.ts)
export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: "Traiteurs africains & menus traditionnels",
  description:
    "Découvrez les meilleurs chefs et traiteurs de la diaspora africaine. Commandez en ligne des plats faits maison (tiep, mafé, alloco, ndolé...) ou demandez un devis pour vos réceptions et événements.",
  path: "/traiteur",
});

const breadcrumb = serializeJsonLd(
  jsonLdGraph(
    breadcrumbJsonLd([
      { name: "Accueil", path: "/" },
      { name: "Traiteurs", path: "/traiteur" },
    ]),
  ),
);

export default async function TraiteurPage() {
  // API injoignable : la page s'affiche quand même et la liste est chargée dans le navigateur
  const result = await getActiveTraiteurs();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumb }} />
      <TraiteurListClient initialTraiteurs={result.status === "ok" ? result.data : null} />
    </>
  );
}
