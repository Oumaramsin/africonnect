import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import CguContent from "./CguContent";

export const metadata: Metadata = pageMetadata({
  title: "Conditions générales d'utilisation et confidentialité",
  description:
    "Conditions générales d'utilisation et de service de Dabari : cotransportage de colis (GP), prestations des traiteurs, paiement sous séquestre et protection des données personnelles (RGPD).",
  path: "/cgu",
});

export default function CguPage() {
  return <CguContent />;
}
