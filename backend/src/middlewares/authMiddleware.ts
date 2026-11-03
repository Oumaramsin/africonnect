import { Response, Request, NextFunction } from "express";
import { passwordFingerprint, verifyToken } from "../utils/jwt";
import { AuthenticatedRequest, AuthUserPayload } from "../utils/types";
import { safeEqual } from "../utils/validation";
import { AUTH_COOKIE, isTrustedWebRequest, isWebClient, readCookie } from "../utils/webClient";
import { db } from "../db";

const LOGIN_REQUIRED_MESSAGE = "Connexion requise.";
const INVALID_SESSION_MESSAGE = "Session expirée ou invalide : reconnectez-vous.";
const REQUEST_REFUSED_MESSAGE = "Requête refusée.";

// Réponses d'erreur au format commun de l'API (`error`), `message` conservé pour les clients existants
const sendAuthError = (res: Response, status: number, message: string) =>
  res.status(status).json({ success: false, error: message, message });

class AuthMiddleware {
  static authenticate = async (req: Request, res: Response, next: NextFunction) => {
    // Applications mobiles : header Authorization: Bearer. Site web : cookie httpOnly.
    const bearerToken = req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    const cookieToken = bearerToken ? undefined : readCookie(req, AUTH_COOKIE);
    const token = bearerToken || cookieToken;
    if (!token) {
      return sendAuthError(res, 401, LOGIN_REQUIRED_MESSAGE);
    }

    // Le navigateur joint le cookie automatiquement : il n'est accepté qu'avec les protections
    // anti-CSRF du site (en-tête personnalisé + origine déclarée pour les requêtes modifiantes).
    if (cookieToken && !isTrustedWebRequest(req)) {
      return sendAuthError(res, 403, REQUEST_REFUSED_MESSAGE);
    }

    let decoded: AuthUserPayload;
    try {
      decoded = verifyToken(token) as AuthUserPayload;
    } catch (error) {
      return sendAuthError(res, 401, INVALID_SESSION_MESSAGE);
    }

    if (!decoded || typeof decoded !== "object" || typeof decoded.userId !== "string" || typeof decoded.pwd !== "string") {
      return sendAuthError(res, 401, INVALID_SESSION_MESSAGE);
    }

    try {
      // Le compte doit toujours exister et son mot de passe ne pas avoir changé depuis l'émission du jeton.
      // Le rôle est relu en base : une promotion ou une rétrogradation admin prend effet immédiatement.
      const user = await db.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, password: true },
      });

      if (!user || !safeEqual(passwordFingerprint(user.password), decoded.pwd)) {
        return sendAuthError(res, 401, INVALID_SESSION_MESSAGE);
      }

      (req as AuthenticatedRequest).user = {
        ...decoded,
        userId: user.id,
        role: user.role || "client",
      };
      // Réponses propres à l'utilisateur : jamais mises en cache (navigateur, CDN du proxy web)
      res.setHeader("Cache-Control", "no-store");
      next();
    } catch (error) {
      console.error("Erreur vérification session:", error);
      sendAuthError(res, 503, "Service momentanément indisponible.");
    }
  };

  /**
   * Anti-CSRF des requêtes du site web (en-tête X-Dabari-Client: web), y compris celles qui
   * ouvrent une session (connexion, vérification e-mail, réinitialisation) : une requête modifiante
   * doit provenir d'une origine déclarée. Les requêtes mobiles (sans cet en-tête) ne sont pas concernées.
   */
  static webOriginGuard = (req: Request, res: Response, next: NextFunction) => {
    if (isWebClient(req) && !isTrustedWebRequest(req)) {
      return sendAuthError(res, 403, REQUEST_REFUSED_MESSAGE);
    }
    next();
  };

  static isAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user || user.role !== "admin") {
      return sendAuthError(res, 403, "Accès refusé. Réservé aux administrateurs.");
    }
    next();
  };
}

export default AuthMiddleware;
