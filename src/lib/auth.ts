import cookies from "js-cookie";

export interface DecodedToken {
  userId?: string;
  id?: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Décode et valide le JWT côté client.
 * Retourne le payload si valide et non expiré, sinon null.
 */
export function decodeToken(token: string | null | undefined): DecodedToken | null {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const decoded: DecodedToken = JSON.parse(jsonPayload);

    if (decoded.exp && typeof decoded.exp === "number") {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (decoded.exp <= nowInSeconds) {
        return null;
      }
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Supprime le cookie token.
 */
export function removeToken(): void {
  cookies.remove("token");
}

/**
 * Récupère le token si valide. Si expiré ou corrompu, supprime le cookie et retourne null.
 */
export function getValidToken(): string | null {
  const token = cookies.get("token");
  if (!token) return null;

  const decoded = decodeToken(token);
  if (!decoded) {
    cookies.remove("token");
    return null;
  }

  return token;
}

/**
 * Récupère les informations de l'utilisateur courant depuis le token valide.
 */
export function getCurrentUser(): DecodedToken | null {
  const token = getValidToken();
  if (!token) return null;
  return decodeToken(token);
}

/**
 * Fetch avec token d'authentification.
 * Si l'API retourne 401 (token non reconnu ou révoqué), supprime le cookie.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = getValidToken();

  const headers = new Headers(init?.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    removeToken();
  }

  return response;
}
