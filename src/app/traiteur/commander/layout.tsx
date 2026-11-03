import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Finaliser ma commande",
  description: "Validez votre commande de plats faits maison auprès de votre traiteur Dabari.",
  robots: NOINDEX_ROBOTS,
};

export default function CommanderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
