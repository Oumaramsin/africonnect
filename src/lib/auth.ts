/*
 * Session web : le JWT est stocké par l'API dans un cookie httpOnly, illisible en JavaScript
 * (une XSS ne peut pas le voler). Les requêtes authentifiées passent par le proxy même domaine
 * /api (next.config.ts + src/proxy.ts), seul à recevoir ce cookie. L'utilisateur courant est
 * fourni par GET /api/auth/me : le front ne décode plus le JWT.
 */

import { isNetworkError, prepareRequest } from "./network";

export { ApiError, isNetworkError } from "./network";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/+$/, "");
/** Indicateur « session ouverte » posé par l'API à côté du cookie httpOnly (aucun secret). */
const SESSION_HINT_COOKIE = "dabari_session";
/** Ancien cookie lisible en JavaScript qui contenait le JWT : supprimé s'il subsiste. */
const LEGACY_TOKEN_COOKIE = "token";

export interface CurrentUser {
  id: string;
  /** Alias de `id`, conservé pour les composants existants. */
  userId: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  /** Rôle métier du profil (client, traiteur, gp, admin). */
  role: string;
  /** Droits d'administration (rôle du compte vérifié par l'API). */
  isAdmin: boolean;
  /** Profils traiteur de l'utilisateur (on ne se demande pas de devis à soi-même). */
  traiteurIds: string[];
}

const readCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const entry = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
};

const expireCookie = (name: string): void => {
  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
};

let legacyTokenChecked = false;
const removeLegacyToken = (): void => {
  if (legacyTokenChecked || typeof document === "undefined") return;
  legacyTokenChecked = true;
  if (readCookie(LEGACY_TOKEN_COOKIE) !== null) expireCookie(LEGACY_TOKEN_COOKIE);
};

/**
 * Vrai si une session semble ouverte. Indication pour l'affichage et les redirections :
 * l'API vérifie le cookie de session à chaque requête.
 */
export function hasSession(): boolean {
  removeLegacyToken();
  return readCookie(SESSION_HINT_COOKIE) === "1";
}

let currentUserRequest: Promise<CurrentUser | null> | null = null;

/** Oublie la session côté navigateur (session expirée ou révoquée, déconnexion). */
export function clearSession(): void {
  currentUserRequest = null;
  if (typeof document !== "undefined") expireCookie(SESSION_HINT_COOKIE);
}

/** À appeler après une connexion : l'utilisateur courant sera relu depuis l'API. */
export function invalidateCurrentUser(): void {
  currentUserRequest = null;
}

/** Les URL de l'API sont servies par le proxy même domaine /api, seul à recevoir le cookie de session. */
const toSameOriginApi = (input: RequestInfo | URL): RequestInfo | URL => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : null;
  if (url === null || !url.startsWith(API_BASE_URL)) return input;
  const rest = url.slice(API_BASE_URL.length);
  return rest === "" || rest.startsWith("/") || rest.startsWith("?") ? `/api${rest}` : input;
};

const isSameOriginApi = (input: RequestInfo | URL): boolean =>
  typeof input === "string" && (input === "/api" || input.startsWith("/api/") || input.startsWith("/api?"));

/**
 * Fetch authentifié par le cookie de session. Accepte les URL de l'API (NEXT_PUBLIC_API_URL) ou
 * les chemins /api. Si l'API répond 401 (session expirée ou révoquée), la session locale est oubliée.
 *
 * Sans réponse (hors ligne, délai dépassé), une ApiError au message français est levée ; les
 * écritures portent une clé d'idempotence (voir lib/network.ts) pour qu'une relance ne crée pas
 * de doublon côté serveur.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const target = toSameOriginApi(input);
  const headers = new Headers(init?.headers || {});
  const sameOriginApi = isSameOriginApi(target);
  if (sameOriginApi) {
    // En-tête exigé par l'API pour les sessions par cookie (protection anti-CSRF)
    headers.set("X-Dabari-Client", "web");
  }

  const url = typeof target === "string" ? target : target instanceof URL ? target.href : target.url;
  const request = prepareRequest(url, init ?? {}, headers);

  let response: Response;
  try {
    response = request.succeed(
      await fetch(target, {
        ...init,
        headers,
        signal: request.signal,
        credentials: "same-origin",
      })
    );
  } catch (error) {
    return request.fail(error);
  }

  if (response.status === 401) {
    const hadSession = hasSession();
    clearSession();
    if (hadSession) {
      // Le cookie httpOnly, invalide, ne peut être effacé que par l'API
      void fetch("/api/auth/logout", {
        method: "POST",
        headers: { "X-Dabari-Client": "web" },
        credentials: "same-origin",
      }).catch(() => undefined);
    }
  }

  return response;
}

const toCurrentUser = (raw: unknown): CurrentUser | null => {
  if (!raw || typeof raw !== "object") return null;
  const user = raw as Record<string, unknown>;
  if (typeof user.id !== "string") return null;
  const optionalText = (value: unknown) => (typeof value === "string" ? value : null);
  return {
    id: user.id,
    userId: user.id,
    full_name: optionalText(user.full_name),
    email: optionalText(user.email),
    phone: optionalText(user.phone),
    role: optionalText(user.role) || "client",
    isAdmin: user.is_admin === true,
    traiteurIds: Array.isArray(user.traiteurs)
      ? user.traiteurs
          .map((traiteur) => (traiteur && typeof traiteur === "object" ? (traiteur as { id?: unknown }).id : null))
          .filter((id): id is string => typeof id === "string")
      : [],
  };
};

/** Utilisateur connecté (GET /api/auth/me, mis en cache pour la page), ou null. */
export function getCurrentUser(): Promise<CurrentUser | null> {
  if (!hasSession()) return Promise.resolve(null);
  if (!currentUserRequest) {
    const request: Promise<CurrentUser | null> = authFetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => (res.ok ? toCurrentUser((await res.json()).user) : null))
      .catch(() => null)
      .then((user) => {
        // Échec : pas de mise en cache, le prochain appel réessaiera
        if (!user && currentUserRequest === request) currentUserRequest = null;
        return user;
      });
    currentUserRequest = request;
  }
  return currentUserRequest;
}

/** Données locales propres au compte (panier traiteur), effacées à la déconnexion. */
const ACCOUNT_STORAGE_KEYS = ["dabari_cart"];

/**
 * Déconnexion : l'API efface le cookie httpOnly, puis la session locale et les données du compte
 * gardées dans le navigateur sont oubliées. Voir logoutAndReload pour quitter l'espace connecté.
 */
export async function logout(): Promise<void> {
  try {
    await authFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // API injoignable : la session est tout de même oubliée côté navigateur
  } finally {
    clearSession();
    try {
      ACCOUNT_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // Stockage local indisponible (navigation privée stricte) : rien à effacer
    }
  }
}

/**
 * Déconnexion suivie d'un rechargement complet de la page de connexion : contrairement à une
 * navigation côté client (router.push), aucune donnée du compte ne reste en mémoire.
 */
export async function logoutAndReload(): Promise<void> {
  await logout();
  // Rechargement complet voulu : il vide l'état de l'application, ce que router.push ne fait pas
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/login");
}

/* ── Messages d'erreur des appels à l'API ── */

/** Affiché quand l'API indique que la même action est déjà en cours de traitement. */
const IN_PROGRESS_MESSAGE =
  "Cette action est déjà en cours de traitement. Patientez quelques secondes, puis vérifiez le résultat avant de réessayer.";

/** Code d'erreur métier (`code`) d'une réponse de l'API, s'il y en a un. */
export function apiErrorCode(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/** Message d'une réponse en erreur de l'API : selon les routes, il est dans `error` ou `message`. */
export function apiErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const { error, message } = data as { error?: unknown; message?: unknown };
    if (typeof error === "string" && error.trim()) return error;
    if (typeof message === "string" && message.trim()) return message;
  }
  return apiErrorCode(data) === "IDEMPOTENCY_IN_PROGRESS" ? IN_PROGRESS_MESSAGE : fallback;
}

/** Message d'un chargement en échec : coupure réseau (message déjà en français) ou erreur inattendue. */
export function loadErrorMessage(error: unknown, fallback: string): string {
  return isNetworkError(error) ? error.message : fallback;
}

/**
 * Message d'un envoi resté sans réponse : l'issue est inconnue, mais l'écriture porte une clé
 * d'idempotence (lib/network.ts) et relancer exactement la même action ne crée pas de doublon.
 */
export function sendErrorMessage(error: unknown, fallback: string): string {
  return isNetworkError(error)
    ? `${error.message} Votre saisie est conservée : relancer la même action ne crée pas de doublon.`
    : fallback;
}
