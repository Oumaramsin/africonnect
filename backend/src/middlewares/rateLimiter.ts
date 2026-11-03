import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request } from "express";
import { db } from "../db";
import { getAuthUserId } from "../utils/types";
import { getClientIp, getVerifiedTokenUserId } from "../utils/webClient";

// Limites assouplies uniquement en développement local explicite (NODE_ENV=development) :
// une recette ou une production sans NODE_ENV garde les limites strictes.
const isDevelopment = process.env.NODE_ENV === "development";

// Clé par visiteur : IP transmise par le proxy Next.js du site (si authentifié), sinon IP de la connexion
const clientKey = (req: Request) => ipKeyGenerator(getClientIp(req));

// Clé du limiteur général : l'utilisateur d'un JWT vérifié (quota propre à chaque compte, même derrière
// l'IP partagée d'un opérateur mobile ou d'une entreprise), sinon l'IP du visiteur.
const generalKey = (req: Request) => {
  const userId = getVerifiedTokenUserId(req);
  return userId ? `user:${userId}` : clientKey(req);
};

// Clé des limiteurs placés après AuthMiddleware.authenticate : l'utilisateur authentifié.
const authenticatedUserKey = (req: Request) => {
  const userId = getAuthUserId(req);
  return userId ? `user:${userId}` : clientKey(req);
};

// Limiteur général pour toute l'API (300 requêtes max par 15 minutes)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generalKey,
  message: {
    status: 429,
    success: false,
    error: "Trop de requêtes en peu de temps. Veuillez réessayer dans 15 minutes.",
    message: "Trop de requêtes en peu de temps. Veuillez réessayer dans 15 minutes.",
  },
});

const CREATION_LIMIT_MESSAGE =
  "Vous avez effectué trop de créations en peu de temps. Veuillez réessayer dans une heure.";

/**
 * Créations (commandes, demandes, propositions, profils, plats, annonces GP) : 30 par heure, par
 * utilisateur et par route. À placer après AuthMiddleware.authenticate.
 */
export const creationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) =>
    `${authenticatedUserKey(req)}|${req.method} ${req.baseUrl}${req.route?.path ?? req.path}`,
  message: { status: 429, success: false, error: CREATION_LIMIT_MESSAGE, message: CREATION_LIMIT_MESSAGE },
});

const UPLOAD_LIMIT_MESSAGE =
  "Vous avez envoyé trop de fichiers en peu de temps. Veuillez réessayer dans une heure.";

/**
 * Envois de fichiers : 60 requêtes par heure et par utilisateur (JWT vérifié, sinon IP). Placé avant
 * AuthMiddleware.authenticate : les tentatives répétées ne déclenchent pas une requête en base chacune.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generalKey,
  message: { status: 429, success: false, error: UPLOAD_LIMIT_MESSAGE, message: UPLOAD_LIMIT_MESSAGE },
});

const AUTH_WINDOW_MS = isDevelopment ? 1000 : 15 * 60 * 1000;

// Une seule alerte admin par IP et par fenêtre : sans cela, chaque requête bloquée créerait
// une notification par administrateur (saturation de la base exploitable par un attaquant).
const alertedIps = new Map<string, number>();

const shouldAlertForIp = (ip: string): boolean => {
  const now = Date.now();
  for (const [key, expiresAt] of alertedIps) {
    if (expiresAt <= now) alertedIps.delete(key);
  }
  if (alertedIps.has(ip)) return false;
  alertedIps.set(ip, now + AUTH_WINDOW_MS);
  return true;
};

// Limiteur strict pour l'authentification avec Journalisation & Alerte Admin (15 min en Prod, 1s en Dev)
export const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: isDevelopment ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  handler: async (req, res) => {
    const ip = getClientIp(req);
    const targetUrl = req.originalUrl.split("?")[0].slice(0, 100);
    const timestamp = new Date().toISOString();

    // 1. Journalisation dans les logs serveur (Audit de Sécurité)
    console.warn(
      `🚨 [ALERTE SÉCURITÉ - BRUTE FORCE DETECTÉ] IP: ${ip} | Route: ${targetUrl} | Date: ${timestamp}`
    );

    // 2. Notification en temps réel des administrateurs dans la BDD (une fois par IP et par fenêtre)
    if (shouldAlertForIp(ip)) {
      try {
        const admins = await db.user.findMany({
          where: { role: "admin" },
          select: { id: true },
        });

        if (admins.length > 0) {
          await db.notification.createMany({
            data: admins.map((admin) => ({
              user_id: admin.id,
              type: "security_alert",
              titre: "Alerte Sécurité : Attaque Brute Force",
              message: `Tentatives massives échouées depuis l'IP ${ip} sur ${targetUrl}. L'IP a été bloquée pendant 15 minutes.`,
              data: { ip, targetUrl, timestamp },
            })),
          });
        }
      } catch (err) {
        console.error("Erreur enregistrement alerte sécurité admin:", err);
      }
    }

    // 3. Réponse d'erreur 429
    return res.status(429).json({
      status: 429,
      message:
        "Trop de tentatives de connexion. Votre adresse IP a été temporairement bloquée pendant 15 minutes et l'administrateur a été notifié.",
    });
  },
});
