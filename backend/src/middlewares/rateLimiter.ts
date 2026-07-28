import rateLimit from "express-rate-limit";
import { db } from "../db";

// Limiteur général pour toute l'API (300 requêtes max par 15 minutes)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: "Trop de requêtes effectuées depuis cette adresse IP. Veuillez réessayer dans 15 minutes.",
  },
});

// Limiteur strict pour l'authentification avec Journalisation & Alerte Admin (10 tentatives max par 15 minutes par IP)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "Inconnu";
    const targetUrl = req.originalUrl;
    const timestamp = new Date().toISOString();

    // 1. Journalisation dans les logs serveur (Audit de Sécurité)
    console.warn(
      `🚨 [ALERTE SÉCURITÉ - BRUTE FORCE DETECTÉ] IP: ${ip} | Route: ${targetUrl} | Date: ${timestamp}`
    );

    // 2. Notification en temps réel des administrateurs dans la BDD
    try {
      const admins = await db.user.findMany({
        where: { role: "admin" },
        select: { id: true },
      });

      if (admins.length > 0) {
        for (const admin of admins) {
          await db.notification.create({
            data: {
              user_id: admin.id,
              type: "security_alert",
              titre: "🚨 Alerte Sécurité : Attaque Brute Force",
              message: `Tentatives massives échouées depuis l'IP ${ip} sur ${targetUrl}. L'IP a été bloquée pendant 15 minutes.`,
              data: { ip, targetUrl, timestamp },
            },
          });
        }
      }
    } catch (err) {
      console.error("Erreur enregistrement alerte sécurité admin:", err);
    }

    // 3. Réponse d'erreur 429
    return res.status(429).json({
      status: 429,
      message:
        "Trop de tentatives de connexion. Votre adresse IP a été temporairement bloquée pendant 15 minutes et l'administrateur a été notifié.",
    });
  },
});
