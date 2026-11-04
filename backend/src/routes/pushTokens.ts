import { Router, Request, Response } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import { db } from "../db";
import { getAuthUserId } from "../utils/types";
import { EXPO_PUSH_TOKEN_PATTERN } from "../services/pushService";

/*
 * Enregistrement des appareils pour les notifications push (application mobile).
 * POST   /api/push-tokens { token, platform } : rattache le jeton de l'appareil au compte connecté.
 * DELETE /api/push-tokens { token }           : détache le jeton (déconnexion).
 */

const MAX_DEVICES_PER_USER = 10;
const PLATFORMS = new Set(["android", "ios"]);

const router = Router();

router.use(AuthMiddleware.authenticate);

const sendError = (res: Response, status: number, error: string) =>
  res.status(status).json({ success: false, error, message: error });

const readToken = (req: Request): string | null => {
  const token = req.body?.token;
  return typeof token === "string" && EXPO_PUSH_TOKEN_PATTERN.test(token) ? token : null;
};

router.post("/", async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  if (!userId) return sendError(res, 401, "Connexion requise.");

  const token = readToken(req);
  if (!token) return sendError(res, 400, "Jeton de notification invalide.");
  const platform = typeof req.body?.platform === "string" && PLATFORMS.has(req.body.platform) ? req.body.platform : null;

  try {
    // Un appareil appartient au dernier compte qui s'y est connecté
    await db.pushToken.upsert({
      where: { token },
      create: { token, user_id: userId, platform },
      update: { user_id: userId, platform, updated_at: new Date() },
    });

    // Au-delà de 10 appareils, les plus anciens sont oubliés
    const extra = await db.pushToken.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: "desc" },
      skip: MAX_DEVICES_PER_USER,
      select: { id: true },
    });
    if (extra.length > 0) {
      await db.pushToken.deleteMany({ where: { id: { in: extra.map((row) => row.id) } } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Erreur enregistrement jeton push :", error instanceof Error ? error.message : error);
    sendError(res, 503, "Les notifications push sont momentanément indisponibles.");
  }
});

router.delete("/", async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  if (!userId) return sendError(res, 401, "Connexion requise.");

  const token = readToken(req);
  if (!token) return sendError(res, 400, "Jeton de notification invalide.");

  try {
    await db.pushToken.deleteMany({ where: { token, user_id: userId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression jeton push :", error instanceof Error ? error.message : error);
    sendError(res, 503, "Les notifications push sont momentanément indisponibles.");
  }
});

export default router;
