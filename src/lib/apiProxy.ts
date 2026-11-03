/*
 * Relais du site vers l'API Express. Le navigateur appelle /api/* sur le domaine du site : le cookie
 * de session httpOnly y est « first-party » alors que l'API est hébergée sur un autre domaine.
 * La réécriture de next.config.ts transmet ces requêtes à l'API ; src/proxy.ts y ajoute les en-têtes
 * ci-dessous. Module sans dépendance à next/headers : utilisable par proxy.ts et les composants serveur.
 * Il manipule le secret API_PROXY_SECRET : « server-only » interdit son import côté navigateur.
 */

import "server-only";

/** URL de base de l'API Express (ex : https://dabari-api.up.railway.app/api). */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/+$/, "");

const PROXY_SECRET_HEADER = "x-dabari-proxy-secret";
const CLIENT_IP_HEADER = "x-dabari-client-ip";

/**
 * IP du visiteur telle que fournie par l'hébergeur : Vercel écrase x-real-ip / x-forwarded-for,
 * le client ne peut pas les falsifier. En auto-hébergement, le reverse proxy doit faire de même.
 */
const getVisitorIp = (headers: Headers): string | null => {
  const ip = headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
};

/**
 * En-têtes authentifiant le proxy auprès de l'API (secret partagé API_PROXY_SECRET) et lui
 * transmettant l'IP du visiteur : sans eux, tous les visiteurs partageraient l'IP de l'hébergeur
 * pour le rate limiting. Les valeurs éventuellement envoyées par le navigateur sont écrasées.
 */
export function withProxyHeaders(incoming: Headers, target: Headers = new Headers(incoming)): Headers {
  target.delete(PROXY_SECRET_HEADER);
  target.delete(CLIENT_IP_HEADER);

  const secret = process.env.API_PROXY_SECRET;
  const visitorIp = getVisitorIp(incoming);
  if (secret && visitorIp) {
    target.set(PROXY_SECRET_HEADER, secret);
    target.set(CLIENT_IP_HEADER, visitorIp);
  }
  return target;
}
