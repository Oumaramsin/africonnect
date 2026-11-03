import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Connectez-vous à votre compte Dabari pour accéder à vos commandes, vos demandes de devis traiteurs et vos vols GP.",
  robots: NOINDEX_ROBOTS,
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
