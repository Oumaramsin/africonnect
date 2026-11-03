import { absoluteUrl } from "./site";

/**
 * Sérialise des données structurées pour une balise <script type="application/ld+json">.
 * JSON.stringify n'échappe pas "<" : un nom ou une description contenant "</script>"
 * fermerait la balise et permettrait d'injecter du HTML/JS (XSS stockée).
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

type JsonLdNode = Record<string, unknown>;

/** Regroupe plusieurs entités schema.org dans un même document JSON-LD. */
export function jsonLdGraph(...nodes: JsonLdNode[]): JsonLdNode {
  return { "@context": "https://schema.org", "@graph": nodes };
}

export type BreadcrumbItem = { name: string; path: string };

/** Fil d'Ariane schema.org (BreadcrumbList) à partir de chemins relatifs du site. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
