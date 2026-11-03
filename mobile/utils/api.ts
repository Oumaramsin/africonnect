import { router } from "expo-router";
import { deleteSecureToken, getSecureToken } from "./storage";
import { isNetworkError, prepareRequest } from "./network";

export { ApiError, isNetworkError } from "./network";

export interface ApiFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  /** Délai personnalisé ; par défaut 20 s en lecture, 30 s en écriture et 120 s pour un envoi de fichiers. */
  timeoutMs?: number;
  skipAuth?: boolean;
}

/**
 * Client HTTP centralisé et sécurisé pour l'application Mobile.
 * - Injecte automatiquement le token Bearer chiffré si présent.
 * - Gère les délais d'expiration (lecture du corps comprise) et lève une ApiError au message
 *   français quand le serveur ne répond pas (voir utils/network.ts).
 * - Ajoute une clé d'idempotence aux écritures : une relance après une coupure ne crée pas de doublon.
 * - Intercepte les 401 Unauthorized pour déconnecter proprement l'utilisateur.
 */
export async function apiFetch(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs,
    skipAuth = false,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  const baseUrl =
    process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api";

  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${normalizedBaseUrl}/${endpoint.replace(/^\//, "")}`;
  // Le jeton n'est jamais transmis à un domaine tiers, même si une URL absolue est passée
  const isApiUrl = url === normalizedBaseUrl || url.startsWith(`${normalizedBaseUrl}/`);

  const headers: Record<string, string> = {
    ...customHeaders,
  };

  // N'ajoute Content-Type: application/json que si ce n'est pas du FormData
  const isFormData = Boolean(
    fetchOptions.body && typeof fetchOptions.body === "object" && "append" in (fetchOptions.body as any)
  );

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Injection automatique du token d'authentification
  if (!skipAuth && isApiUrl && !headers["Authorization"]) {
    const token = await getSecureToken("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Délai d'expiration, clé d'idempotence et signal de connexion
  const request = prepareRequest(url, fetchOptions, headers, isFormData, timeoutMs);

  let response: Response;
  try {
    response = request.succeed(
      await fetch(url, {
        ...fetchOptions,
        headers,
        signal: request.signal,
      })
    );
  } catch (error) {
    return request.fail(error);
  }

  // Détection de token expiré ou invalide (401)
  if (response.status === 401 && !skipAuth && isApiUrl) {
    await deleteSecureToken("token");
    router.replace("/login");
  }

  return response;
}

/**
 * Message d'erreur d'une réponse de l'API : `error` ou, à défaut, `message` (les deux formats
 * coexistent selon les routes), sinon le message par défaut.
 */
export function getApiErrorMessage(data: unknown, fallback: string): string {
  const body = (data && typeof data === "object" ? data : {}) as { error?: unknown; message?: unknown };
  if (typeof body.error === "string" && body.error.trim()) return body.error;
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  return fallback;
}

/** Code d'erreur métier d'une réponse de l'API (ex. `DEVIS_CHANGED`, `UNVERIFIED_EMAIL`), s'il existe. */
export function getApiErrorCode(data: unknown): string | undefined {
  const code = (data && typeof data === "object" ? data : {}) as { code?: unknown };
  return typeof code.code === "string" ? code.code : undefined;
}

/**
 * Message à afficher pour une exception levée pendant un appel : le message français d'une erreur
 * réseau (hors ligne, délai dépassé), sinon le message par défaut (jamais un message technique).
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return isNetworkError(error) ? error.message : fallback;
}
