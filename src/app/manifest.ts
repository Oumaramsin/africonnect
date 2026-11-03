import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, THEME_COLOR } from "@/lib/site";

// Manifeste web (installation sur l'écran d'accueil), servi sur /manifest.webmanifest
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} - Traiteurs africains & transport de colis GP`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "fr",
    dir: "ltr",
    background_color: "#F8FAFC",
    theme_color: THEME_COLOR,
    categories: ["food", "travel", "lifestyle"],
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
