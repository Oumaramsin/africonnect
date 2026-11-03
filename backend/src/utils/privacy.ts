import { TRAITEUR_PROPOSAL_STATUS } from "./types";

/*
 * Minimisation des données des clients montrées aux traiteurs : tant qu'aucune proposition n'est
 * acceptée, un traiteur ne voit que le prénom suivi de l'initiale du nom et une localisation
 * approximative (ville ou code postal), jamais le numéro ni la rue, ni les coordonnées.
 */

/** Libellé renvoyé quand aucune localisation approximative ne peut être extraite du lieu saisi. */
export const LOCATION_PLACEHOLDER = "Lieu communiqué après acceptation";

/** « Aminata Diallo » → « Aminata D. » ; un nom d'un seul mot est conservé tel quel. */
export const toShortName = (fullName?: string | null): string => {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Client";
  const firstName = parts[0].slice(0, 60);
  if (parts.length === 1) return firstName;
  const initial = Array.from(parts[parts.length - 1])[0]?.toUpperCase() || "";
  return initial ? `${firstName} ${initial}.` : firstName;
};

// Mots désignant une voie ou un complément d'adresse (le segment qui les contient est retiré)
const STREET_WORD_LIST = [
  "rue", "avenue", "av", "bd", "boulevard", "chemin", "all[ée]e", "impasse", "place", "route", "rte",
  "quai", "cours", "square", "passage", "voie", "sentier", "lotissement", "r[ée]sidence", "b[âa]timent",
  "b[âa]t", "bloc", "appartement", "appart", "appt", "apt", "[ée]tage", "escalier", "porte", "digicode",
  "interphone", "cit[ée]", "villa", "hameau", "lieu-dit", "bp", "cedex", "street", "road", "lane", "drive",
  "bo[îi]te",
];
const STREET_WORDS = new RegExp(`(?<![\\p{L}\\d])(?:${STREET_WORD_LIST.join("|")})(?![\\p{L}\\d])`, "iu");
// « n° 12 », « No. 4 »...
const NUMBER_SIGN = /n\s?[°º]|(?<![\p{L}\d])no\.\s?\d/iu;
// Nombres tolérés : code postal (4-5 chiffres) et arrondissement (« Paris 18e »)
const ALLOWED_NUMBERS = /(?<!\d)\d{4,5}(?!\d)|(?<!\d)\d{1,2}(?:e|er|[èe]me)(?![\p{L}\d])/giu;
// Repli pour une adresse saisie sans virgule : « 12 rue X 75002 Paris » → « 75002 Paris »
const POSTAL_AND_CITY = /(?<!\d)(\d{4,5})\s+(\p{L}[\p{L}' -]{1,40})/u;

const isCoarseSegment = (segment: string): boolean => {
  if (STREET_WORDS.test(segment) || NUMBER_SIGN.test(segment)) return false;
  return !/\d/.test(segment.replace(ALLOWED_NUMBERS, ""));
};

/**
 * Forme approximative d'un lieu saisi librement : les segments contenant un numéro ou une voie
 * sont retirés, seuls les deux derniers segments restants (ville, code postal, pays) sont gardés.
 * Retourne null si rien d'approximatif ne peut être extrait.
 */
export const toCoarseLocation = (raw?: string | null): string | null => {
  const value = (raw || "").trim();
  if (!value) return null;

  const kept = value
    .split(/[,;\n]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment && isCoarseSegment(segment));
  if (kept.length > 0) return kept.slice(-2).join(", ").slice(0, 80);

  const postal = value.match(POSTAL_AND_CITY);
  if (postal) return `${postal[1]} ${postal[2].trim()}`.slice(0, 80);
  return null;
};

/** Client tel que vu par un traiteur sans proposition acceptée : prénom + initiale et ville. */
export const toPublicClient = (client?: { full_name?: string | null; city?: string | null } | null) => ({
  full_name: toShortName(client?.full_name),
  city: toCoarseLocation(client?.city),
});

/**
 * Proposition vue par le traiteur qui l'a envoyée : l'adresse de l'événement, l'identifiant et les
 * coordonnées du client (téléphone, e-mail, WhatsApp) ne sont transmis qu'une fois la proposition
 * acceptée. Avant, seuls le prénom + initiale et une localisation approximative sont renvoyés.
 */
export const hideClientDetailsUntilAccepted = <
  T extends {
    status: string | null;
    request: {
      client_id?: string;
      location: string;
      client?: { full_name?: string | null; city?: string | null } | null;
    };
  },
>(
  proposal: T,
) => {
  if (proposal.status === TRAITEUR_PROPOSAL_STATUS.ACCEPTED) return proposal;
  const { client_id: _clientId, client, location, ...request } = proposal.request;
  return {
    ...proposal,
    request: {
      ...request,
      location: toCoarseLocation(location) ?? LOCATION_PLACEHOLDER,
      client: toPublicClient(client),
    },
  };
};
