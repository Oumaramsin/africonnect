import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tableau de bord Diaspora",
  description:
    "Tableau de bord Dabari : explorez les traiteurs africains, réservez des kilos pour vos colis GP et suivez vos activités.",
  alternates: {
    canonical: "https://dabari.app/dashboard",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
