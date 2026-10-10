import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Traiteurs Africains & Menus Traditionnels",
  description:
    "Découvrez les meilleurs chefs et traiteurs de la diaspora africaine. Commandez en ligne des plats faits maison (Tiep, Mafé, Alloco, Ndolé...) pour vos réceptions et événements.",
  openGraph: {
    title: "Traiteurs Africains & Menus Traditionnels | Dabari",
    description:
      "Commandez auprès de traiteurs africains certifiés. Menus sur-mesure, devis personnalisés et livraison garantie.",
    url: "https://dabari.app/traiteur",
  },
  alternates: {
    canonical: "https://dabari.app/traiteur",
  },
};

export default function TraiteurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
