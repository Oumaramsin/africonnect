import { Router, Request, Response } from "express";
import multer from "multer";
import AuthMiddleware from "../middlewares/authMiddleware";
import { uploadToR2 } from "../services/storageService";

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadRouter = Router();

uploadRouter.post(
  "/single",
  AuthMiddleware.authenticate,
  memoryUpload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "Aucun fichier fourni." });
      }

      const folder = (req.body.folder as string) || "media";
      const fileUrl = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        folder
      );

      res.status(201).json({
        success: true,
        url: fileUrl,
      });
    } catch (error: any) {
      console.error("Erreur d'upload single R2:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

uploadRouter.post(
  "/multiple",
  AuthMiddleware.authenticate,
  memoryUpload.array("files", 10),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: "Aucun fichier fourni." });
      }

      const folder = (req.body.folder as string) || "dishes";
      const uploadPromises = files.map((file) =>
        uploadToR2(file.buffer, file.originalname, file.mimetype, folder)
      );

      const urls = await Promise.all(uploadPromises);

      res.status(201).json({
        success: true,
        urls,
      });
    } catch (error: any) {
      console.error("Erreur d'upload multiple R2:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default uploadRouter;
