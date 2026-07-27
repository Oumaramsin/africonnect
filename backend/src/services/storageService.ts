import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import sharp from "sharp";

dotenv.config();

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucketName = process.env.R2_BUCKET_NAME || "dabari-media";
const publicUrl = process.env.R2_PUBLIC_URL || "http://localhost:3001/uploads";

const isR2Configured = Boolean(
  accountId &&
  accessKeyId &&
  secretAccessKey &&
  !accountId.includes("votre_") &&
  !accessKeyId.includes("votre_")
);

const r2Client = isR2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  : null;

export const uploadToR2 = async (
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  folder = "media"
): Promise<string> => {
  let finalBuffer = fileBuffer;
  let finalMimeType = mimeType;
  let cleanName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, "_");

  // ── CONVERSION AUTO WEBP ET COMPRESSION VIA SHARP ──
  try {
    if (mimeType.startsWith("image/")) {
      finalBuffer = await sharp(fileBuffer)
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      finalMimeType = "image/webp";
      cleanName = `${cleanName}.webp`;
    } else {
      cleanName = `${cleanName}${path.extname(originalName)}`;
    }
  } catch (err) {
    console.warn("⚠️ [Sharp] Compression WebP échouée, conservation du fichier original:", err);
    cleanName = `${cleanName}${path.extname(originalName)}`;
  }

  const safeFileName = `${Date.now()}-${cleanName}`;

  // ── 1. TENTATIVE UPLOAD CLOUDFLARE R2 ──
  if (isR2Configured && r2Client) {
    try {
      const key = `${folder}/${safeFileName}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: finalBuffer,
        ContentType: finalMimeType,
      });

      await r2Client.send(command);

      const baseUrl = publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : publicUrl;
      return `${baseUrl}/${key}`;
    } catch (err: any) {
      console.warn("⚠️ [Cloudflare R2] Impossible d'uploader sur R2, bascule en stockage local :", err.message);
    }
  }

  // ── 2. MODE SIMULATION / LOCAL FALLBACK ──
  console.log("ℹ️ [Mode Simulation Storage] Sauvegarde de l'image en WebP local dans /uploads");
  const targetDir = path.join(__dirname, `../../uploads/${folder}`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const filePath = path.join(targetDir, safeFileName);
  fs.writeFileSync(filePath, finalBuffer);

  const baseUrl = process.env.PUBLIC_API_URL || "http://localhost:3001";
  return `${baseUrl}/uploads/${folder}/${safeFileName}`;
};

export const deleteFromR2 = async (fileUrl: string): Promise<boolean> => {
  try {
    if (!fileUrl) return false;

    // Suppression locale si l'URL contient /uploads/
    if (fileUrl.includes("/uploads/")) {
      const relativePath = fileUrl.substring(fileUrl.indexOf("/uploads/"));
      const localPath = path.join(__dirname, "../../", relativePath);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`🗑️ [Storage] Fichier local supprimé : ${localPath}`);
      }
      return true;
    }

    if (isR2Configured && r2Client) {
      try {
        const urlObj = new URL(fileUrl);
        const key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;

        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        });

        await r2Client.send(command);
        console.log(`🗑️ [Cloudflare R2] Fichier supprimé : ${key}`);
        return true;
      } catch (err) {
        console.warn("⚠️ Échec suppression R2:", err);
      }
    }

    return true;
  } catch (error) {
    console.error("Erreur suppression image:", error);
    return false;
  }
};
