import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// Les pages privées ne sont pas bloquées ici : elles portent une balise noindex que les robots
// doivent pouvoir lire (une page bloquée par robots.txt peut quand même être indexée sans contenu).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
