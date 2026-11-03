import "server-only";
import { cache } from "react";
import { API_BASE_URL } from "./apiProxy";
import type { Dish, Traiteur } from "./types/traiteur";
import type { GpListing } from "./types/gp";

/*
 * Lecture des données publiques de l'API depuis les composants serveur (pages ISR, sitemap).
 * Aucune donnée de session : ces réponses sont mises en cache et partagées entre visiteurs.
 * Une API injoignable ne doit jamais faire échouer une page : l'appelant reçoit "unavailable"
 * et laisse le composant client recharger les données dans le navigateur.
 */

/** Durées de revalidation (secondes), alignées sur les `export const revalidate` des pages. */
export const TRAITEUR_REVALIDATE = 300;
export const GP_REVALIDATE = 60;

const API_TIMEOUT_MS = 8000;

/** Même format que isValidUUID côté API (backend/src/utils/types.ts) : l'API répond 400 sinon. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PublicDish = Dish & { created_at?: string | null };
export type PublicTraiteur = Omit<Traiteur, "dishes"> & {
  dishes: PublicDish[];
  is_active?: boolean | null;
  created_at?: string | null;
};

/**
 * Issue d'un appel public :
 * - "ok" : données reçues ;
 * - "not_found" : ressource absente (404 JSON de l'API, identifiant invalide, traiteur inactif) ;
 * - "unavailable" : API injoignable, délai dépassé, erreur serveur ou réponse illisible.
 */
export type PublicResult<T> =
  | { status: "ok"; data: T }
  | { status: "not_found" }
  | { status: "unavailable" };

const UNAVAILABLE = { status: "unavailable" } as const;
const NOT_FOUND = { status: "not_found" } as const;

type ApiBody = { data?: Record<string, unknown> } | null;

async function fetchPublic<T>(
  path: string,
  revalidate: number,
  pick: (body: ApiBody) => T | null | undefined,
): Promise<PublicResult<T>> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => null)) as ApiBody;
    // Seul un 404 émis par l'API (corps JSON) signifie « ressource absente » : une page d'erreur
    // HTML de l'hébergeur ou d'un proxy est traitée comme une indisponibilité
    if (res.status === 404) return body && typeof body === "object" ? NOT_FOUND : UNAVAILABLE;
    if (!res.ok || !body) return UNAVAILABLE;
    const data = pick(body);
    return data == null ? UNAVAILABLE : { status: "ok", data };
  } catch (error) {
    console.error(`[publicApi] GET ${path} :`, error instanceof Error ? error.message : error);
    return UNAVAILABLE;
  }
}

const asArray = <T>(value: unknown): T[] | null => (Array.isArray(value) ? (value as T[]) : null);
const asObject = <T>(value: unknown): T | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as T) : null;

// `cache` (React) partage le résultat entre generateMetadata et la page d'un même rendu : le
// signal d'expiration passé à fetch désactive la mémoïsation automatique de Next.js.

/** Traiteurs actifs proposant au moins un plat disponible. */
export const getActiveTraiteurs = cache(
  (revalidate: number = TRAITEUR_REVALIDATE): Promise<PublicResult<PublicTraiteur[]>> =>
    fetchPublic("/traiteur", revalidate, (body) => asArray<PublicTraiteur>(body?.data?.activeTraiteur)),
);

/** Fiche d'un traiteur ; un traiteur désactivé est traité comme absent. */
export const getTraiteur = cache(async (id: string): Promise<PublicResult<PublicTraiteur>> => {
  if (!UUID_PATTERN.test(id)) return NOT_FOUND;
  const result = await fetchPublic(`/traiteur/${encodeURIComponent(id)}`, TRAITEUR_REVALIDATE, (body) =>
    asObject<PublicTraiteur>(body?.data?.traiteur),
  );
  if (result.status === "ok" && result.data.is_active === false) return NOT_FOUND;
  return result;
});

/** Annonces GP actives (passées comprises : filtrer avec isUpcomingDeparture). */
export const getGpListings = cache(
  (revalidate: number = GP_REVALIDATE): Promise<PublicResult<GpListing[]>> =>
    fetchPublic("/gp", revalidate, (body) => asArray<GpListing>(body?.data?.gp)),
);

/** Annonce GP active ; une annonce désactivée est traitée comme absente. */
export const getGpListing = cache(async (id: string): Promise<PublicResult<GpListing>> => {
  if (!UUID_PATTERN.test(id)) return NOT_FOUND;
  const result = await fetchPublic(`/gp/${encodeURIComponent(id)}`, GP_REVALIDATE, (body) =>
    asObject<GpListing>(body?.data?.gp),
  );
  if (result.status === "ok" && result.data.is_active === false) return NOT_FOUND;
  return result;
});

/** Date du jour à Paris au format AAAA-MM-JJ. */
function todayInParis(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Vrai si le départ d'une annonce GP est aujourd'hui ou plus tard (heure de Paris). La date de
 * départ est une date sans heure (colonne DATE), sérialisée « AAAA-MM-JJT00:00:00.000Z ».
 */
export function isUpcomingDeparture(departureDate: string | null | undefined, now = new Date()): boolean {
  const day = typeof departureDate === "string" ? departureDate.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= todayInParis(now);
}
