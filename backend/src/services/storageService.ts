import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";
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

const UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");
const r2PublicBase = publicUrl.replace(/\/+$/, "");
const localPublicBase = `${(process.env.PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "")}/uploads`;

// Seuls ces dossiers peuvent recevoir des fichiers (le dossier est fourni par le client)
export const UPLOAD_FOLDERS = ["media", "dishes", "profiles"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export const isUploadFolder = (value: unknown): value is UploadFolder =>
  typeof value === "string" && (UPLOAD_FOLDERS as readonly string[]).includes(value);

const FILE_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Analyse une URL de média et ne l'accepte que si elle pointe vers notre propre stockage
 * (R2 public ou dossier /uploads local), dans un dossier autorisé et sans traversée de chemin.
 */
const parseOwnStorageUrl = (
  fileUrl: unknown,
): { key: string; location: "r2" | "local" } | null => {
  if (typeof fileUrl !== "string" || fileUrl.length > 2048) return null;

  const candidates: { base: string; location: "r2" | "local" }[] = [
    { base: r2PublicBase, location: isR2Configured ? "r2" : "local" },
    { base: localPublicBase, location: "local" },
  ];

  for (const { base, location } of candidates) {
    if (!fileUrl.startsWith(`${base}/`)) continue;
    const key = fileUrl.slice(base.length + 1);
    const [folder, fileName, ...rest] = key.split("/");
    if (rest.length === 0 && isUploadFolder(folder) && fileName && FILE_NAME_REGEX.test(fileName)) {
      return { key, location };
    }
  }
  return null;
};

export const isOwnStorageUrl = (fileUrl: unknown): fileUrl is string =>
  parseOwnStorageUrl(fileUrl) !== null;

// Formats acceptés, d'après le contenu réel du fichier (et non le type déclaré par le client)
const ACCEPTED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);
const INVALID_IMAGE_MESSAGE = "Le fichier envoyé n'est pas une image valide (JPEG, PNG ou WebP).";
export const HEIC_REFUSED_MESSAGE =
  "Les photos HEIC / HEIF (format par défaut des iPhone) ne sont pas acceptées : choisissez une image JPEG, PNG ou WebP (sur iPhone : Réglages > Appareil photo > Formats > « Le plus compatible »).";
// Marques ISO-BMFF d'un fichier HEIC / HEIF (octets 8 à 11, après « ftyp »)
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

const isHeifContainer = (fileBuffer: Buffer): boolean =>
  fileBuffer.length >= 12 &&
  fileBuffer.toString("ascii", 4, 8) === "ftyp" &&
  HEIF_BRANDS.has(fileBuffer.toString("ascii", 8, 12));

/**
 * Vérifie le format réel de l'image (JPEG, PNG ou WebP uniquement), lu par sharp dans le contenu
 * du fichier. Les photos HEIC / HEIF sont refusées avec un message explicite.
 */
export const assertSupportedImage = async (fileBuffer: Buffer): Promise<void> => {
  let format: string | undefined;
  try {
    format = (await sharp(fileBuffer).metadata()).format;
  } catch {
    throw new Error(isHeifContainer(fileBuffer) ? HEIC_REFUSED_MESSAGE : INVALID_IMAGE_MESSAGE);
  }
  if (format === "heif" || isHeifContainer(fileBuffer)) {
    throw new Error(HEIC_REFUSED_MESSAGE);
  }
  if (!format || !ACCEPTED_IMAGE_FORMATS.has(format)) {
    throw new Error(INVALID_IMAGE_MESSAGE);
  }
};

/**
 * Convertit l'image en WebP (redimensionnée, métadonnées EXIF/GPS supprimées) puis l'envoie
 * sur R2 (ou en local à défaut). Tout fichier qui n'est pas réellement une image JPEG, PNG ou
 * WebP est refusé : impossible d'héberger du HTML, du SVG scripté ou un exécutable.
 */
export const uploadToR2 = async (
  fileBuffer: Buffer,
  originalName: string,
  folder: UploadFolder = "media"
): Promise<string> => {
  if (!isUploadFolder(folder)) {
    throw new Error("Dossier de destination invalide.");
  }

  await assertSupportedImage(fileBuffer);

  let finalBuffer: Buffer;
  try {
    finalBuffer = await sharp(fileBuffer, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (err) {
    throw new Error(INVALID_IMAGE_MESSAGE);
  }

  const cleanName = originalName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-]/g, "_")
    .slice(0, 40) || "image";
  const safeFileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${cleanName}.webp`;
  const key = `${folder}/${safeFileName}`;

  // ── 1. TENTATIVE UPLOAD CLOUDFLARE R2 ──
  if (isR2Configured && r2Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: finalBuffer,
        ContentType: "image/webp",
      });

      await r2Client.send(command);

      return `${r2PublicBase}/${key}`;
    } catch (err: any) {
      console.warn("⚠️ [Cloudflare R2] Impossible d'uploader sur R2, bascule en stockage local :", err.message);
    }
  }

  // ── 2. MODE SIMULATION / LOCAL FALLBACK ──
  console.log("ℹ️ [Mode Simulation Storage] Sauvegarde de l'image en WebP local dans /uploads");
  const targetDir = path.join(UPLOADS_ROOT, folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(path.join(targetDir, safeFileName), finalBuffer);

  return `${localPublicBase}/${key}`;
};

/**
 * Supprime un média de notre stockage. Les URL externes ou malformées sont ignorées :
 * une URL contrôlée par un utilisateur ne doit jamais permettre d'effacer un fichier arbitraire.
 */
export const deleteFromR2 = async (fileUrl: string): Promise<boolean> => {
  const parsed = parseOwnStorageUrl(fileUrl);
  if (!parsed) return false;

  try {
    if (parsed.location === "r2" && r2Client) {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: parsed.key,
        }),
      );
      console.log(`🗑️ [Cloudflare R2] Fichier supprimé : ${parsed.key}`);
      return true;
    }

    const localPath = path.resolve(UPLOADS_ROOT, parsed.key);
    if (!localPath.startsWith(UPLOADS_ROOT + path.sep)) return false;
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log(`🗑️ [Storage] Fichier local supprimé : ${localPath}`);
    }
    return true;
  } catch (error) {
    console.error("Erreur suppression image:", error);
    return false;
  }
};
