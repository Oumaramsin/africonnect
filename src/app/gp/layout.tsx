import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GP Transport de Colis International Sécurisé",
  description:
    "Envoyez vos bagages et colis entre l'Afrique (Sénégal, Côte d'Ivoire, Cameroun...) et l'Europe en toute sérénité avec des voyageurs GP certifiés. Paiement sous séquestre garanti.",
  openGraph: {
    title: "GP Transport de Colis International Sécurisé | Dabari",
    description:
      "Expédition rapide et fiable de colis par des voyageurs GP fiables et vérifiés. Tarifs au kilo transparents et séquestre sécurisé.",
    url: "https://dabari.app/gp",
  },
  alternates: {
    canonical: "https://dabari.app/gp",
  },
};

export default function GpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
