import crypto from "crypto";
import type { Response } from "express";

const EMAIL_REGEX = /^[^\s@,;:<>()[\]"'\\]+@[^\s@,;:<>()[\]"'\\]+\.[^\s@,;:<>()[\]"'\\]{2,}$/;
const PHONE_REGEX = /^\+?[0-9\s().-]{6,24}$/;

// Domaines techniques utilisés pour les comptes créés par numéro de téléphone (pas de boîte mail réelle)
const SYNTHETIC_EMAIL_DOMAINS = ["@dabari.app", "@africonnect.com"];

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Normalise une adresse e-mail (trim + minuscules) et rejette les formats invalides
 * ou les listes de destinataires (virgules, points-virgules...) utilisables pour du spam.
 */
export const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) return null;
  return email;
};

export const isSyntheticEmail = (email: string): boolean =>
  SYNTHETIC_EMAIL_DOMAINS.some((domain) => email.toLowerCase().endsWith(domain));

export const isValidPhone = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const phone = value.trim();
  const digits = phone.replace(/\D/g, "");
  return PHONE_REGEX.test(phone) && digits.length >= 6 && digits.length <= 15;
};

export const isValidPassword = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length >= PASSWORD_MIN_LENGTH &&
  value.length <= PASSWORD_MAX_LENGTH;

/** Vrai si la valeur est absente ou une chaîne d'au plus `maxLength` caractères. */
export const isOptionalTextWithin = (value: unknown, maxLength: number): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.length <= maxLength);

/** Vrai si la valeur est une chaîne non vide (après trim) d'au plus `maxLength` caractères. */
export const isRequiredTextWithin = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;

/** Vrai si la valeur est un tableau d'au plus `maxItems` chaînes non vides d'au plus `maxLength` caractères. */
export const isStringArrayWithin = (
  value: unknown,
  maxItems: number,
  maxLength: number,
): value is string[] =>
  Array.isArray(value) &&
  value.length <= maxItems &&
  value.every((item) => isRequiredTextWithin(item, maxLength));

export const generateNumericCode = (): string =>
  crypto.randomInt(100000, 1000000).toString();

export const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Message d'erreur renvoyable au client : seules les erreurs métier (`new Error(...)`)
 * sont exposées. Les erreurs Prisma, TypeError, etc. révèlent des détails internes
 * (requêtes, schéma, code) et sont remplacées par le message générique.
 */
export const getPublicErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== "object") return fallback;
  const err = error as { name?: unknown; message?: unknown; customMessage?: unknown };
  if (typeof err.customMessage === "string" && err.customMessage) return err.customMessage;
  if (err.name !== "Error") return fallback;
  return typeof err.message === "string" && err.message ? err.message : fallback;
};

/** Code d'erreur métier (ex : EXPIRED_CODE) exploité par les clients, jamais un message technique. */
export const getPublicErrorCode = (error: unknown): string | undefined => {
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && /^[A-Z_]{3,40}$/.test(message) ? message : undefined;
};

/**
 * Erreur métier portant son statut HTTP (409 conflit, 403...) et, au besoin, un code stable
 * exploité par les applications (ex. DEVIS_CHANGED). Son message est destiné à l'utilisateur.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

/** Vrai pour une erreur métier (message affichable), faux pour une erreur technique (Prisma, TypeError...). */
export const isPublicError = (error: unknown): boolean => getPublicErrorMessage(error, "") !== "";

/**
 * Réponse d'erreur d'un contrôleur : statut de l'HttpError, `businessStatus` (400 par défaut) pour
 * une erreur métier classique, 500 avec le message générique pour une erreur technique.
 */
export const sendErrorResponse = (
  res: Response,
  error: unknown,
  fallback: string,
  businessStatus = 400,
) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      ...(error.code ? { code: error.code } : {}),
    });
  }
  return res
    .status(isPublicError(error) ? businessStatus : 500)
    .json({ success: false, error: getPublicErrorMessage(error, fallback) });
};

/**
 * Booléen strict : true / false (ou les chaînes exactes "true" / "false"). Retourne undefined si la
 * valeur est absente et null si elle est invalide (évite que "false" ou "0" deviennent true).
 */
export const parseStrictBoolean = (value: unknown): boolean | null | undefined => {
  if (value === undefined) return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
};
