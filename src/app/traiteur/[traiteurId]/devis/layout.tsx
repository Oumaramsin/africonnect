import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Demande de devis",
  description: "Demandez un devis personnalisé à un traiteur africain de Dabari pour votre événement.",
  robots: NOINDEX_ROBOTS,
};

export default function DevisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
