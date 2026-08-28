import { router } from "expo-router";
import { deleteSecureToken, getSecureToken } from "./storage";

export interface ApiFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  timeoutMs?: number;
  skipAuth?: boolean;
}

const DEFAULT_TIMEOUT = 15000; // 15 secondes

/**
 * Client HTTP centralisé et sécurisé pour l'application Mobile.
 * - Injecte automatiquement le token Bearer chiffré si présent.
 * - Gère les timeouts réseau via AbortController.
 * - Intercepte les 401 Unauthorized pour déconnecter proprement l'utilisateur.
 */
export async function apiFetch(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT,
    skipAuth = false,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  const baseUrl =
    process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api";

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  const headers: Record<string, string> = {
    ...customHeaders,
  };

  // N'ajoute Content-Type: application/json que si ce n'est pas du FormData
  const isFormData =
    fetchOptions.body && typeof fetchOptions.body === "object" && "append" in (fetchOptions.body as any);

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Injection automatique du token d'authentification
  if (!skipAuth && !headers["Authorization"]) {
    const token = await getSecureToken("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Configuration du timeout réseau
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Détection de token expiré ou invalide (401)
    if (response.status === 401 && !skipAuth) {
      await deleteSecureToken("token");
      router.replace("/login");
    }

    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error("Délai d'attente dépassé (connexion réseau trop lente).");
    }

    throw new Error(
      error.message || "Impossible de contacter le serveur Dabari."
    );
  }
}
