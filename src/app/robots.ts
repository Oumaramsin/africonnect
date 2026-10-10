import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://dabari.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/dashboard", "/traiteur", "/gp", "/services"],
        disallow: ["/admin/", "/profil/", "/commandes/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
