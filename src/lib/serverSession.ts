import "server-only";
import { cookies, headers } from "next/headers";
import { API_BASE_URL, withProxyHeaders } from "./apiProxy";

// Cookie httpOnly posé par l'API à la connexion : lisible uniquement côté serveur
const AUTH_COOKIE = "dabari_token";

/** Délai maximal d'un appel à l'API pendant le rendu serveur : au-delà, l'appel échoue (TimeoutError). */
const SERVER_FETCH_TIMEOUT_MS = 15_000;

/** JWT de la session web du visiteur (composants serveur uniquement). */
export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(AUTH_COOKIE)?.value || null;
}

/**
 * Appel de l'API depuis un composant serveur au nom du visiteur connecté (Bearer), avec son IP
 * pour le rate limiting de l'API. `path` est relatif à l'API, ex : "/commande".
 * Une API qui ne répond pas fait échouer l'appel après 15 s au lieu de bloquer le rendu de la page :
 * l'appelant doit intercepter l'erreur.
 */
export async function fetchApiAsUser(path: string, token: string, init?: RequestInit): Promise<Response> {
  const requestHeaders = withProxyHeaders(await headers(), new Headers(init?.headers));
  requestHeaders.set("Authorization", `Bearer ${token}`);
  const timeout = AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers: requestHeaders, cache: "no-store", signal });
}
