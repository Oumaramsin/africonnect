import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Publier une annonce de vol GP",
  description: "Proposez vos kilos disponibles aux expéditeurs de la diaspora africaine sur Dabari.",
  robots: NOINDEX_ROBOTS,
};

export default function NouvelleAnnonceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
