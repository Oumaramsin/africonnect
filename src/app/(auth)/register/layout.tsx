import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte",
  description:
    "Rejoignez Dabari, la plateforme de la diaspora africaine. Commandez auprès de traiteurs d'exception ou devenez transporteur GP certifié.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
