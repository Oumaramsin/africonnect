import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nos Services Diaspora Africaine",
  description:
    "Découvrez l'ensemble de l'écosystème Dabari : services de traiteurs authentiques pour vos cérémonies et transport de bagages GP sécurisé entre l'Afrique et l'Europe.",
  openGraph: {
    title: "Nos Services Diaspora Africaine | Dabari",
    description:
      "Tous les services essentiels pour la diaspora africaine réunis au même endroit.",
    url: "https://dabari.app/services",
  },
  alternates: {
    canonical: "https://dabari.app/services",
  },
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
