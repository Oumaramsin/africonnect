export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

/**
 * Valide un fichier image sélectionné par l'utilisateur avant son upload
 */
export function validateImage(
  uri: string,
  fileSizeBytes?: number
): ImageValidationResult {
  if (!uri) {
    return { valid: false, error: "Aucun fichier sélectionné." };
  }

  // Vérification de l'extension
  const cleanUri = uri.split("?")[0];
  const extension = cleanUri.split(".").pop()?.toLowerCase();

  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: "Format d'image non supporté. Formats acceptés : JPG, PNG, WEBP.",
    };
  }

  // Vérification de la taille 
  if (fileSizeBytes && fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "L'image est trop volumineuse (maximum 5 Mo autorisés).",
    };
  }

  return { valid: true };
}
