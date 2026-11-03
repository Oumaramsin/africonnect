import type { NextConfig } from "next";

type RemotePattern = Exclude<
  NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number],
  URL
>;

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/+$/, "");

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const apiUrl = parseUrl(apiBaseUrl);

// Dossiers publics des médias envoyés par les utilisateurs (UPLOAD_FOLDERS de
// backend/src/services/storageService.ts) : <stockage>/<dossier>/<fichier>, sans paramètre
const MEDIA_FOLDERS = ["media", "dishes", "profiles"];

// Optimiseur d'images (/_next/image) limité aux médias de Dabari : hôte exact, chemin précis et
// aucun paramètre d'URL. Un motif trop large en ferait un proxy ouvert (SSRF, abus de bande passante).
const remotePatterns: RemotePattern[] = [];
// Origines autorisées pour les images dans la CSP (images non optimisées, aperçus)
const imageOrigins = new Set<string>();

// 1. Stockage local de secours servi par l'API : <origine de l'API>/uploads/<dossier>/<fichier>
if (apiUrl && (apiUrl.protocol === "https:" || apiUrl.protocol === "http:")) {
  for (const folder of MEDIA_FOLDERS) {
    remotePatterns.push({
      protocol: apiUrl.protocol === "https:" ? "https" : "http",
      hostname: apiUrl.hostname,
      port: apiUrl.port,
      pathname: `/uploads/${folder}/*`,
      search: "",
    });
  }
  imageOrigins.add(apiUrl.origin);
}

// 2. Stockage public (Cloudflare R2 ou CDN) : hôtes exacts, ex.
//    NEXT_PUBLIC_IMAGE_HOSTS="pub-xxxx.r2.dev,media.dabari.fr" (hôte de R2_PUBLIC_URL côté API)
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || "")
  .split(",")
  .map((host) => host.trim().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").toLowerCase())
  .filter(Boolean);
for (const hostname of new Set(imageHosts)) {
  for (const folder of MEDIA_FOLDERS) {
    remotePatterns.push({ protocol: "https", hostname, port: "", pathname: `/${folder}/*`, search: "" });
  }
  imageOrigins.add(`https://${hostname}`);
}
// Variable absente (déploiement non encore configuré) : repli sur les URL publiques R2
// (pub-xxxx.r2.dev), limitées aux dossiers de médias, pour ne pas casser les photos existantes
if (imageHosts.length === 0) {
  for (const folder of MEDIA_FOLDERS) {
    remotePatterns.push({ protocol: "https", hostname: "*.r2.dev", port: "", pathname: `/${folder}/*`, search: "" });
  }
  imageOrigins.add("https://*.r2.dev");
  if (isProduction) {
    console.warn("⚠️ NEXT_PUBLIC_IMAGE_HOSTS absent : images autorisées sur *.r2.dev (renseignez l'hôte exact de R2_PUBLIC_URL).");
  }
}

// 3. Photos de démonstration (seed, données anciennes), dont les URL portent des paramètres de recadrage
remotePatterns.push({ protocol: "https", hostname: "images.unsplash.com", port: "", pathname: "/photo-*" });
imageOrigins.add("https://images.unsplash.com");

// Origines appelées par le navigateur : l'API (appels directs hors proxy /api) et les services
// d'autocomplétion d'adresses
const connectOrigins = new Set<string>([
  "https://api-adresse.data.gouv.fr",
  "https://nominatim.openstreetmap.org",
]);
if (apiUrl) connectOrigins.add(apiUrl.origin);

// Forçage HTTPS des ressources en production réelle uniquement (API en HTTPS) : sur un
// `next start` local en http://localhost, la directive empêcherait le chargement des ressources
const upgradeInsecureRequests = isProduction && apiUrl?.protocol === "https:";

// Content Security Policy sans nonce (pages statiques/ISR compatibles), cf.
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md « Without Nonces »
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  ["img-src 'self' data: blob:", ...imageOrigins].join(" "),
  "font-src 'self' data:",
  ["connect-src 'self'", ...connectOrigins].join(" "),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(upgradeInsecureRequests ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  images: {
    remotePatterns,
  },
  async redirects() {
    return [
      {
        // L'accueil est désormais servi sur « / » (src/app/page.tsx)
        source: "/dashboard",
        destination: "/",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Proxy même domaine vers l'API Express : le cookie de session httpOnly du site y est
        // « first-party » et relayé à l'API (voir src/lib/auth.ts et src/proxy.ts)
        source: "/api/:path*",
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
