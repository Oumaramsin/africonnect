import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon Profil & Espace Prestataire",
  description:
    "Gérez votre compte Dabari, votre espace traiteur et vos annonces de transport GP en toute simplicité.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function ProfilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
