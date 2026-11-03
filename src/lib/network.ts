/*
 * Résilience réseau des appels à l'API : délais d'expiration, erreurs typées avec des messages
 * français, signal « hors ligne / en ligne » pour le bandeau, et clés d'idempotence.
 *
 * Clés d'idempotence : chaque écriture envoie un en-tête Idempotency-Key. Si une requête échoue sans
 * réponse (coupure, délai dépassé), l'issue est inconnue : le serveur a peut-être déjà enregistré
 * l'action. La même clé est alors réutilisée si l'utilisateur relance exactement la même action, et
 * l'API renvoie le résultat déjà obtenu au lieu de créer un doublon (commande, réservation, devis...).
 */

export type ApiErrorKind = "offline" | "timeout";

/** Erreur réseau survenue avant toute réponse de l'API (le message est prêt à être affiché). */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
  }
}

/** Vrai si l'erreur vient de la connexion (hors ligne ou délai dépassé) et non d'une réponse de l'API. */
export const isNetworkError = (error: unknown): error is ApiError => error instanceof ApiError;

export const OFFLINE_MESSAGE =
  "Connexion impossible : vérifiez votre connexion internet puis réessayez.";
export const TIMEOUT_MESSAGE =
  "Le serveur met trop de temps à répondre. Vérifiez votre connexion puis réessayez.";

/** Délais d'expiration (en-têtes et lecture du corps compris). */
const READ_TIMEOUT_MS = 20_000;
const WRITE_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const NETWORK_EVENT = "dabari:network";

/** Prévient le bandeau de connexion : `online` = l'API a répondu, `!online` = aucune réponse. */
export function emitNetworkStatus(online: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NETWORK_EVENT, { detail: { online } }));
}

const newIdempotencyKey = (): string => {
  const cryptoApi = typeof crypto !== "undefined" ? crypto : undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

/** Écritures dont l'issue est inconnue (aucune réponse reçue), par empreinte méthode + URL + corps. */
const pendingKeys = new Map<string, { key: string; expiresAt: number }>();
const PENDING_KEY_TTL_MS = 30 * 60_000;

const fingerprintOf = (method: string, url: string, body: string) => `${method} ${url}\n${body}`;

/**
 * Prépare une requête : délai d'expiration et, pour une écriture JSON, clé d'idempotence (reprise
 * de la tentative précédente si son issue est inconnue). `settle` doit être appelé avec le résultat.
 */
export function prepareRequest(url: string, init: RequestInit, headers: Headers) {
  const method = (init.method || "GET").toUpperCase();
  const isUpload = typeof FormData !== "undefined" && init.body instanceof FormData;
  const timeoutMs = isUpload ? UPLOAD_TIMEOUT_MS : WRITE_METHODS.has(method) ? WRITE_TIMEOUT_MS : READ_TIMEOUT_MS;

  // Écritures JSON ou sans corps (annulation, suppression) : les envois de fichiers en sont exclus
  const bodyText = typeof init.body === "string" ? init.body : init.body == null ? "" : null;
  let fingerprint: string | null = null;
  if (WRITE_METHODS.has(method) && bodyText !== null && !headers.has("Idempotency-Key")) {
    fingerprint = fingerprintOf(method, url, bodyText);
    const now = Date.now();
    for (const [print, entry] of pendingKeys) if (entry.expiresAt < now) pendingKeys.delete(print);
    const previous = pendingKeys.get(fingerprint);
    headers.set("Idempotency-Key", previous?.key ?? newIdempotencyKey());
  }

  // Délai d'expiration, sans perdre l'annulation éventuellement demandée par l'appelant
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const callerSignal = init.signal;
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const idempotencyKey = headers.get("Idempotency-Key");
  const rememberUnknownOutcome = () => {
    if (fingerprint && idempotencyKey) {
      pendingKeys.set(fingerprint, { key: idempotencyKey, expiresAt: Date.now() + PENDING_KEY_TTL_MS });
    }
  };

  return {
    signal: controller.signal,
    /** Convertit l'échec de fetch en erreur typée (l'annulation demandée par l'appelant est relancée telle quelle). */
    fail(error: unknown): never {
      clearTimeout(timer);
      if (callerSignal?.aborted && !timedOut) throw error;
      rememberUnknownOutcome();
      emitNetworkStatus(false);
      if (timedOut) throw new ApiError("timeout", TIMEOUT_MESSAGE);
      throw new ApiError("offline", OFFLINE_MESSAGE);
    },
    /** Réponse reçue : l'issue est connue, sauf si l'API indique que la même action est encore en cours. */
    succeed(response: Response): Response {
      emitNetworkStatus(true);
      if (fingerprint) {
        if (response.status === 409 && response.headers.get("Idempotency-Status") === "in-progress") {
          rememberUnknownOutcome();
        } else {
          pendingKeys.delete(fingerprint);
        }
      }
      // Corps illisible (coupure ou délai pendant la lecture) : le serveur a peut-être enregistré
      // l'action, la clé est conservée pour qu'une relance récupère ce résultat sans doublon
      return withSafeBody(response, () => clearTimeout(timer), () => timedOut, rememberUnknownOutcome);
    },
  };
}

/**
 * Lecture du corps protégée : une page d'erreur HTML (502 du proxy, maintenance) ou un corps tronqué
 * par une coupure donne un objet `{ error }` lisible au lieu d'une SyntaxError en anglais.
 */
function withSafeBody(
  response: Response,
  done: () => void,
  timedOut: () => boolean,
  onUnreadable: () => void
): Response {
  const readJson = response.json.bind(response);
  const readText = response.text.bind(response);

  Object.defineProperty(response, "json", {
    configurable: true,
    value: async () => {
      try {
        return await readJson();
      } catch {
        if (response.ok || timedOut()) onUnreadable();
        if (timedOut()) throw new ApiError("timeout", TIMEOUT_MESSAGE);
        return {
          error: response.ok
            ? "Réponse inattendue du serveur. Réessayez dans un instant."
            : `Le serveur est momentanément indisponible (erreur ${response.status}). Réessayez dans un instant.`,
        };
      } finally {
        done();
      }
    },
  });
  Object.defineProperty(response, "text", {
    configurable: true,
    value: async () => {
      try {
        return await readText();
      } catch {
        onUnreadable();
        if (timedOut()) throw new ApiError("timeout", TIMEOUT_MESSAGE);
        throw new ApiError("offline", OFFLINE_MESSAGE);
      } finally {
        done();
      }
    },
  });
  return response;
}
