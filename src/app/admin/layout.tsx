import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration Dabari",
  description: "Portail d'administration Dabari - Gestion et modération de la plateforme.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
