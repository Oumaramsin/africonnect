import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Demande de devis traiteur",
  description: "Décrivez votre événement et recevez les propositions des traiteurs africains de Dabari.",
  robots: NOINDEX_ROBOTS,
};

export default function DemandeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
