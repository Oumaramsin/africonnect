import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import multer from "multer";
import {
  assertSupportedImage,
  HEIC_REFUSED_MESSAGE,
  isUploadFolder,
  uploadToR2,
  UploadFolder,
} from "../services/storageService";
import { getPublicErrorMessage } from "../utils/validation";

/*
 * Authentification (AuthMiddleware.authenticate) et quota par utilisateur (uploadLimiter) sont
 * appliqués au montage du routeur dans index.ts, avant le limiteur général.
 */

// Contrôle indicatif (type déclaré par le client) : le format réel est vérifié par sharp avant tout envoi
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);
const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 5;

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, files: MAX_FILES, fields: 5 },
  fileFilter: (_req, file, cb) => {
    const mimeType = (file.mimetype || "").toLowerCase();
    if (ALLOWED_MIME_TYPES.has(mimeType)) {
      cb(null, true);
    } else if (HEIC_MIME_TYPES.has(mimeType) || /\.(heic|heif)$/i.test(file.originalname || "")) {
      // Photo iPhone : message explicite (un HEIC déclaré en JPEG est refusé par la vérification sharp)
      cb(new Error("HEIC_NOT_SUPPORTED"));
    } else {
      cb(new Error("INVALID_FILE_TYPE"));
    }
  },
});

/** Convertit les erreurs Multer (taille, type, nombre de fichiers) en réponse 400 JSON. */
const withUploadErrors = (middleware: RequestHandler): RequestHandler => (req: Request, res: Response, next: NextFunction) => {
  middleware(req, res, (err?: unknown) => {
    if (!err) return next();
    let message = "Format de fichier invalide. Seuls JPEG, PNG et WebP sont acceptés.";
    if (err instanceof multer.MulterError) {
      message =
        err.code === "LIMIT_FILE_SIZE"
          ? `Fichier trop volumineux (${MAX_FILE_SIZE_MB} Mo maximum par image).`
          : err.code === "LIMIT_FILE_COUNT"
            ? `${MAX_FILES} fichiers maximum par envoi.`
            : "Envoi de fichier invalide.";
    } else if (err instanceof Error && err.message === "HEIC_NOT_SUPPORTED") {
      message = HEIC_REFUSED_MESSAGE;
    }
    res.status(400).json({ success: false, error: message });
  });
};

const resolveFolder = (req: Request, fallback: UploadFolder): UploadFolder | null => {
  const folder = req.body?.folder;
  if (folder === undefined || folder === "") return fallback;
  return isUploadFolder(folder) ? folder : null;
};

const uploadRouter = Router();

uploadRouter.post(
  "/single",
  withUploadErrors(memoryUpload.single("file")),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "Aucun fichier fourni." });
      }

      const folder = resolveFolder(req, "media");
      if (!folder) {
        return res.status(400).json({ success: false, error: "Dossier de destination invalide." });
      }

      await assertSupportedImage(req.file.buffer);
      const fileUrl = await uploadToR2(req.file.buffer, req.file.originalname, folder);

      res.status(201).json({
        success: true,
        url: fileUrl,
      });
    } catch (error: any) {
      console.error("Erreur d'upload single R2:", error);
      res.status(400).json({ success: false, error: getPublicErrorMessage(error, "Échec de l'envoi du fichier.") });
    }
  }
);

uploadRouter.post(
  "/multiple",
  withUploadErrors(memoryUpload.array("files", MAX_FILES)),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: "Aucun fichier fourni." });
      }

      const folder = resolveFolder(req, "dishes");
      if (!folder) {
        return res.status(400).json({ success: false, error: "Dossier de destination invalide." });
      }

      // Tous les formats sont vérifiés avant le premier envoi : pas de fichiers orphelins en cas de refus
      for (const file of files) {
        await assertSupportedImage(file.buffer);
      }

      const urls: string[] = [];
      // Traitement séquentiel : limite la mémoire et le CPU consommés par sharp
      for (const file of files) {
        urls.push(await uploadToR2(file.buffer, file.originalname, folder));
      }

      res.status(201).json({
        success: true,
        urls,
      });
    } catch (error: any) {
      console.error("Erreur d'upload multiple R2:", error);
      res.status(400).json({ success: false, error: getPublicErrorMessage(error, "Échec de l'envoi des fichiers.") });
    }
  }
);

export default uploadRouter;
