import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: "Recevez un lien pour réinitialiser le mot de passe de votre compte Dabari.",
  robots: NOINDEX_ROBOTS,
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
