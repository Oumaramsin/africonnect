import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes Commandes & Réservations GP",
  description:
    "Suivez en temps réel l'avancement de vos commandes de traiteur et vos expéditions de colis GP sur Dabari. Espace personnel sécurisé.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function CommandesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
