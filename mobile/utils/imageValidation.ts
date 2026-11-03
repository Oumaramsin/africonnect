import { Platform } from "react-native";
import { apiFetch, getApiErrorMessage, getErrorMessage } from "./api";

/*
 * Photos envoyées à l'API (plats, logo d'atelier) : validation à la sélection selon le contrat
 * d'upload (JPEG, PNG ou WebP, 5 Mo par fichier, 5 fichiers par envoi) et envoi vers /upload.
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/** Photo choisie avec expo-image-picker (seuls les champs utiles de ImagePickerAsset). */
export interface PickedImage {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
}

export type ImageUploadResult =
  | { ok: true; urls: string[] }
  | { ok: false; error: string };

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
/** Nombre maximal de photos par envoi (et par plat). */
export const MAX_IMAGES_PER_UPLOAD = 5;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const FORMAT_ERROR = "Format d'image non supporté. Formats acceptés : JPG, PNG, WEBP.";
const SIZE_ERROR = "L'image est trop volumineuse (maximum 5 Mo autorisés).";
const UPLOAD_ERROR = "Échec de l'envoi des photos. Réessayez.";

/** Type MIME en minuscules, « image/jpg » ramené à « image/jpeg ». */
const normalizeMimeType = (value?: string | null): string | null => {
  const mime = value?.trim().toLowerCase();
  if (!mime) return null;
  return mime === "image/jpg" ? "image/jpeg" : mime;
};

const extensionOf = (value?: string | null): string | null => {
  if (!value) return null;
  const match = /\.([a-z0-9]+)$/i.exec(value.split(/[?#]/)[0]);
  return match ? match[1].toLowerCase() : null;
};

/**
 * Type MIME d'une photo : celui fourni par le sélecteur, sinon celui d'une URI data:, sinon celui
 * déduit de l'extension du nom ou de l'URI (`image/${ext.toLowerCase()}`, « jpg » → « jpeg »).
 * Null si rien ne permet de le connaître (URI blob: ou content:// sans type déclaré).
 */
export function getImageMimeType(image: PickedImage): string | null {
  const declared = normalizeMimeType(image.mimeType);
  if (declared) return declared;
  const dataUriType = /^data:([^;,]+)/i.exec(image.uri || "");
  if (dataUriType) return normalizeMimeType(dataUriType[1]);
  const extension = extensionOf(image.fileName) ?? extensionOf(image.uri);
  if (!extension) return null;
  return MIME_BY_EXTENSION[extension] ?? `image/${extension}`;
}

/**
 * Valide une photo sélectionnée avant son envoi. Un format inconnu (aucun type ni extension) est
 * accepté : l'API vérifie de toute façon le contenu réel du fichier.
 */
export function validateImage(image: PickedImage): ImageValidationResult {
  if (!image?.uri) {
    return { valid: false, error: "Aucun fichier sélectionné." };
  }

  const mimeType = getImageMimeType(image);
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: FORMAT_ERROR };
  }

  if (image.fileSize && image.fileSize > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: SIZE_ERROR };
  }

  return { valid: true };
}

/**
 * Trie les photos choisies : garde les photos conformes, dans la limite des places restantes, et
 * renvoie le message expliquant celles qui ont été écartées (null si toutes sont gardées).
 */
export function filterPickedImages(
  images: PickedImage[],
  remainingSlots: number,
): { accepted: PickedImage[]; rejectionMessage: string | null } {
  const errors = new Set<string>();
  const valid = images.filter((image) => {
    const check = validateImage(image);
    if (!check.valid && check.error) errors.add(check.error);
    return check.valid;
  });

  const slots = Math.max(0, remainingSlots);
  const accepted = valid.slice(0, slots);
  if (valid.length > slots) {
    errors.add(
      `${MAX_IMAGES_PER_UPLOAD} photos maximum : les photos en trop n'ont pas été ajoutées.`,
    );
  }

  return {
    accepted,
    rejectionMessage: errors.size > 0 ? Array.from(errors).join("\n") : null,
  };
}

/**
 * Ajoute une photo au formulaire d'envoi. Sur mobile, React Native envoie le fichier désigné par
 * { uri, name, type } ; sur le web ce format n'existe pas (il deviendrait « [object Object] ») :
 * le fichier choisi (URI blob: ou data:) est relu en Blob.
 */
async function appendImage(formData: FormData, field: string, image: PickedImage): Promise<void> {
  const baseName =
    (image.fileName || image.uri.split(/[?#]/)[0].split("/").pop() || "photo")
      .replace(/\.[^/.]+$/, "")
      .slice(0, 60) || "photo";

  if (Platform.OS === "web") {
    const blob = await (await fetch(image.uri)).blob();
    const mimeType = normalizeMimeType(blob.type) ?? getImageMimeType(image) ?? "image/jpeg";
    const extension = EXTENSION_BY_MIME[mimeType] ?? "jpg";
    formData.append(field, blob, `${baseName}.${extension}`);
    return;
  }

  const mimeType = getImageMimeType(image) ?? "image/jpeg";
  const extension = EXTENSION_BY_MIME[mimeType] ?? "jpg";
  formData.append(field, {
    uri: image.uri,
    name: `${baseName}.${extension}`,
    type: mimeType,
  } as any);
}

async function sendImages(
  endpoint: "/upload/single" | "/upload/multiple",
  field: string,
  images: PickedImage[],
  folder?: string,
): Promise<ImageUploadResult> {
  const formData = new FormData();
  try {
    for (const image of images) {
      await appendImage(formData, field, image);
    }
  } catch (err) {
    console.warn("Lecture de la photo impossible :", err);
    return {
      ok: false,
      error: "Impossible de lire une des photos sélectionnées. Retirez-la puis choisissez-la à nouveau.",
    };
  }
  if (folder) formData.append("folder", folder);

  try {
    const response = await apiFetch(endpoint, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: getApiErrorMessage(data, UPLOAD_ERROR) };
    }

    const urls: unknown[] = Array.isArray(data.urls) ? data.urls : [data.url || data.fileUrl];
    if (urls.length !== images.length || urls.some((url) => typeof url !== "string" || !url)) {
      return { ok: false, error: UPLOAD_ERROR };
    }
    return { ok: true, urls: urls as string[] };
  } catch (err) {
    console.error("Erreur d'envoi des photos :", err);
    return { ok: false, error: getErrorMessage(err, UPLOAD_ERROR) };
  }
}

/** Envoie une photo (POST /upload/single) ; en cas de succès, `urls` contient son URL publique. */
export function uploadImage(image: PickedImage, folder?: string): Promise<ImageUploadResult> {
  return sendImages("/upload/single", "file", [image], folder);
}

/** Envoie plusieurs photos (POST /upload/multiple) ; les URL sont renvoyées dans le même ordre. */
export function uploadImages(images: PickedImage[], folder?: string): Promise<ImageUploadResult> {
  return sendImages("/upload/multiple", "files", images, folder);
}
