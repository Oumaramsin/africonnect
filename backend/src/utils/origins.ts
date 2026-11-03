// Origines locales acceptées uniquement si NODE_ENV=development (front Next.js en local) : un
// environnement de recette ou de production mal configuré (NODE_ENV absent) ne les accepte pas.
const LOCAL_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

let declaredOrigins: Set<string> | null = null;

/**
 * Fronts déclarés : FRONTEND_URL + CORS_ORIGINS (séparés par des virgules), avec et sans « www. ».
 * Calculé au premier appel, une fois les variables d'environnement chargées.
 */
const getDeclaredOrigins = (): Set<string> => {
  if (declaredOrigins) return declaredOrigins;

  const origins = new Set<string>();
  const addOrigin = (value?: string) => {
    if (!value?.trim()) return;
    try {
      const url = new URL(value.trim());
      origins.add(url.origin);
      const altHost = url.hostname.startsWith("www.") ? url.hostname.slice(4) : `www.${url.hostname}`;
      origins.add(`${url.protocol}//${altHost}${url.port ? `:${url.port}` : ""}`);
    } catch {
      console.warn(`⚠️ Origine CORS ignorée (URL invalide) : ${value}`);
    }
  };
  addOrigin(process.env.FRONTEND_URL);
  (process.env.CORS_ORIGINS || "").split(",").forEach(addOrigin);

  declaredOrigins = origins;
  return origins;
};

export const hasDeclaredOrigins = (): boolean => getDeclaredOrigins().size > 0;

/** Vrai si l'origine est celle d'un front autorisé (CORS et protection anti-CSRF). */
export const isAllowedOrigin = (origin: string): boolean =>
  getDeclaredOrigins().has(origin) ||
  (process.env.NODE_ENV === "development" && LOCAL_ORIGIN_REGEX.test(origin));
