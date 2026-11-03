import { CookieOptions, Request, Response } from "express";
import { isIP } from "net";
import { isAllowedOrigin } from "./origins";
import { TOKEN_TTL_SECONDS, verifyToken } from "./jwt";
import { safeEqual } from "./validation";

/*
 * Sessions du site web : le JWT est stocké dans un cookie httpOnly, illisible par le JavaScript
 * de la page (une XSS ne peut donc pas le voler). Le site appelle l'API via son propre domaine
 * (proxy Next.js sur /api) : le cookie reste « first-party » alors que l'API est hébergée ailleurs.
 * Les applications mobiles conservent le header Authorization: Bearer.
 */

/** Cookie httpOnly portant le JWT de la session web. */
export const AUTH_COOKIE = "dabari_token";
/** Indicateur non sensible (« 1 ») lisible par le front pour savoir qu'une session est ouverte. */
export const SESSION_HINT_COOKIE = "dabari_session";
/** En-tête envoyé par le site web : demande une session par cookie et sert de jeton anti-CSRF. */
export const WEB_CLIENT_HEADER = "x-dabari-client";
/** En-têtes ajoutés par le proxy Next.js du site (voir src/proxy.ts côté web). */
export const PROXY_SECRET_HEADER = "x-dabari-proxy-secret";
export const CLIENT_IP_HEADER = "x-dabari-client-ip";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const isWebClient = (req: Request): boolean => req.header(WEB_CLIENT_HEADER) === "web";

const hasTrustedOrigin = (req: Request): boolean => {
  const origin = req.header("Origin");
  if (origin) return isAllowedOrigin(origin);
  // Certains navigateurs ou extensions omettent Origin : repli sur le Referer
  const referer = req.header("Referer");
  if (!referer) return false;
  try {
    return isAllowedOrigin(new URL(referer).origin);
  } catch {
    return false;
  }
};

/**
 * Protection anti-CSRF des requêtes du site web : l'en-tête personnalisé ne peut être ajouté ni par
 * un formulaire ni par une page tierce (pré-vérification CORS refusée), et toute requête modifiante
 * doit provenir d'une origine déclarée (FRONTEND_URL / CORS_ORIGINS).
 */
export const isTrustedWebRequest = (req: Request): boolean =>
  isWebClient(req) && (SAFE_METHODS.has(req.method) || hasTrustedOrigin(req));

const verifiedUserIds = new WeakMap<Request, string | null>();

/**
 * Identifiant utilisateur d'un JWT dont la signature et l'expiration sont valides (Bearer, ou cookie
 * de session web accompagné des protections anti-CSRF), sans accès à la base. Sert de clé au rate
 * limiting et à l'idempotence ; ne remplace pas AuthMiddleware.authenticate (un compte supprimé ou
 * un mot de passe changé depuis l'émission du jeton n'est pas détecté ici).
 */
export const getVerifiedTokenUserId = (req: Request): string | null => {
  const cached = verifiedUserIds.get(req);
  if (cached !== undefined) return cached;

  const bearerToken = req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  const token = bearerToken || (isTrustedWebRequest(req) ? readCookie(req, AUTH_COOKIE) : undefined);
  let userId: string | null = null;
  if (token) {
    try {
      const decoded = verifyToken(token) as { userId?: unknown } | string;
      if (decoded && typeof decoded === "object" && typeof decoded.userId === "string" && decoded.userId) {
        userId = decoded.userId;
      }
    } catch {
      userId = null;
    }
  }
  verifiedUserIds.set(req, userId);
  return userId;
};

/** Lit un cookie de la requête (Express n'analyse pas l'en-tête Cookie sans cookie-parser). */
export const readCookie = (req: Request, name: string): string | undefined => {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim()) || undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const sessionCookieOptions = (req: Request): CookieOptions => ({
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production" || req.secure,
});

export const setSessionCookies = (req: Request, res: Response, token: string): void => {
  const options: CookieOptions = { ...sessionCookieOptions(req), maxAge: TOKEN_TTL_SECONDS * 1000 };
  res.cookie(AUTH_COOKIE, token, { ...options, httpOnly: true });
  res.cookie(SESSION_HINT_COOKIE, "1", options);
};

export const clearSessionCookies = (req: Request, res: Response): void => {
  const options = sessionCookieOptions(req);
  res.clearCookie(AUTH_COOKIE, { ...options, httpOnly: true });
  res.clearCookie(SESSION_HINT_COOKIE, options);
};

/**
 * Réponse ouvrant une session : le site web reçoit les cookies et jamais le jeton dans le corps,
 * les applications mobiles reçoivent le jeton en JSON comme auparavant.
 */
export const sendSession = (
  req: Request,
  res: Response,
  token: string,
  body: Record<string, unknown>,
) => {
  res.setHeader("Cache-Control", "no-store");
  if (isWebClient(req)) {
    setSessionCookies(req, res, token);
    return res.status(200).json(body);
  }
  return res.status(200).json({ ...body, token });
};

/** Vrai si la requête provient du proxy Next.js du site (secret partagé API_PROXY_SECRET). */
const isFromTrustedProxy = (req: Request): boolean => {
  const expected = process.env.API_PROXY_SECRET;
  const provided = req.header(PROXY_SECRET_HEADER);
  return Boolean(expected && provided && safeEqual(provided, expected));
};

/**
 * Adresse IP du visiteur. Les appels du site transitent par le proxy Next.js : sans l'IP qu'il
 * transmet, tous les visiteurs partageraient l'IP du proxy et seraient bloqués ensemble par le
 * rate limiting. Cet en-tête n'est pris en compte qu'accompagné du secret partagé (sinon n'importe
 * quel client pourrait choisir son IP).
 */
export const getClientIp = (req: Request): string => {
  if (isFromTrustedProxy(req)) {
    const forwardedIp = req.header(CLIENT_IP_HEADER)?.trim();
    if (forwardedIp && isIP(forwardedIp)) return forwardedIp;
  }
  return req.ip || req.socket.remoteAddress || "unknown";
};
