import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Réinitialiser le mot de passe",
  description: "Choisissez un nouveau mot de passe pour votre compte Dabari.",
  robots: NOINDEX_ROBOTS,
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
