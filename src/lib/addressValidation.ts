/**
 * Service de validation d'existence réelle des adresses (France & International)
 * Dabari
 */

export interface AddressValidationResult {
  isValid: boolean;
  normalizedAddress?: string;
  error?: string;
  /**
   * Vrai si l'adresse est acceptée sans avoir pu être vérifiée : service de géocodage injoignable
   * (hors ligne, délai dépassé, service en panne). Le serveur revalide l'adresse à l'enregistrement.
   */
  unverified?: boolean;
}

/** Message à afficher à côté d'une adresse acceptée sans vérification. */
export const UNVERIFIED_ADDRESS_NOTICE =
  "Adresse non vérifiée (service d'adresses injoignable) : elle sera contrôlée à l'enregistrement.";

// Liste de villes et capitales africaines et internationales courantes pour validation rapide
const KNOWN_INTERNATIONAL_CITIES = [
  "dakar", "thies", "saint-louis", "touba", "ziguinchor", "mbour", "kaolack",
  "abidjan", "bouake", "yamoussoukro", "san-pedro", "korhogo", "daloa",
  "douala", "yaounde", "bafoussam", "garoua", "maroua",
  "cotonou", "porto-novo", "parakou", "abomey",
  "lome", "kara", "sokode", "kpalime",
  "bamako", "sikasso", "mopti", "segou",
  "ouagadougou", "bobo-dioulasso", "koudougou",
  "conakry", "kankan", "kindia", "labe",
  "kinshasa", "lubumbashi", "goma", "kisangani",
  "brazzaville", "pointe-noire",
  "libreville", "port-gentil",
  "niamey", "maradi", "zinder",
  "ndjamena", "moundou",
  "bruxelles", "geneve", "montreal", "quebec"
];

const KNOWN_COUNTRIES = [
  "france", "senegal", "sénégal", "cote d'ivoire", "côte d'ivoire", "cameroun",
  "benin", "bénin", "togo", "mali", "burkina faso", "guinee", "guinée",
  "congo", "gabon", "niger", "tchad", "belgique", "suisse", "canada"
];

/**
 * Interroge un service de géocodage avec un délai maximal (lecture du corps comprise).
 * Renvoie `null` si le service n'a pas répondu correctement (hors ligne, délai dépassé, erreur HTTP) :
 * l'adresse ne peut alors pas être jugée inexistante.
 */
async function fetchGeocoding<T>(url: string, timeoutMs: number, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      console.warn(`[verifyAddressExists] Service de géocodage indisponible (HTTP ${res.status}) :`, new URL(url).host);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn("[verifyAddressExists] Service de géocodage injoignable :", new URL(url).host, err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Adresse acceptée telle quelle faute de pouvoir la vérifier (le serveur la revalide). */
const acceptUnverified = (address: string): AddressValidationResult => ({
  isValid: true,
  normalizedAddress: address,
  unverified: true,
});

/**
 * Vérifie si une adresse saisie correspond à un endroit géographique réel.
 * Priorise l'API Adresse BAN pour la France, puis la détection internationale / OpenStreetMap.
 * Si les services de géocodage sont injoignables, l'adresse est acceptée avec `unverified: true`
 * au lieu d'être déclarée introuvable.
 */
export async function verifyAddressExists(
  address: string,
  countryHint?: string
): Promise<AddressValidationResult> {
  const clean = (address || "").trim();
  if (clean.length < 3) {
    return {
      isValid: false,
      error: "Veuillez renseigner une adresse ou une ville valide (au moins 3 caractères).",
    };
  }

  // Vérifier si c'est du charabia évident (ex: que des consonnes aléatoires sans voyelle ou répétition de lettres)
  const lower = clean.toLowerCase();
  if (/^[bcdfghjklmnpqrstvwxz]{5,}/i.test(lower) || /(.)\1{4,}/.test(lower)) {
    return {
      isValid: false,
      error: "L'adresse saisie ne correspond à aucun endroit réel reconnu.",
    };
  }

  const isExplicitFrance =
    countryHint?.toLowerCase() === "france" ||
    lower.includes("france") ||
    /\b\d{5}\b/.test(clean); // Code postal français à 5 chiffres

  // 1. Test avec l'API officielle Adresse data.gouv.fr (France)
  const banUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
    clean
  )}&limit=1`;
  const banData = await fetchGeocoding<{
    features?: { properties?: { score?: number; label?: string } }[];
  }>(banUrl, 3500);

  if (banData) {
    const first = banData.features?.[0];
    const score = first?.properties?.score || 0;

    // Un score >= 0.42 garantit une correspondance réelle sur une commune, voie ou numéro en France
    if (score >= 0.42 && first?.properties?.label) {
      return {
        isValid: true,
        normalizedAddress: first.properties.label,
      };
    }
  }

  // Adresse explicitement française : seule l'API BAN fait foi
  if (isExplicitFrance) {
    if (!banData) return acceptUnverified(clean);
    return {
      isValid: false,
      error:
        "L'adresse indiquée n'a pas été trouvée en France. Veuillez sélectionner une adresse existante dans les suggestions.",
    };
  }

  // 2. Détection villes & pays internationaux connus (Afrique de l'Ouest & Centrale, etc.)
  const words = lower.split(/[\s,.-]+/);
  const matchesKnownCity = words.some((w) => KNOWN_INTERNATIONAL_CITIES.includes(w));
  const matchesKnownCountry = KNOWN_COUNTRIES.some((c) => lower.includes(c));

  if (matchesKnownCity || matchesKnownCountry) {
    return {
      isValid: true,
      normalizedAddress: clean,
    };
  }

  // 3. Fallback géocodage OpenStreetMap (Nominatim) pour l'international
  const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    clean
  )}&format=json&limit=1`;
  const osmData = await fetchGeocoding<{ display_name?: string }[]>(osmUrl, 3000, {
    headers: {
      Accept: "application/json",
    },
  });

  if (Array.isArray(osmData) && osmData.length > 0 && osmData[0]?.display_name) {
    return {
      isValid: true,
      normalizedAddress: osmData[0].display_name,
    };
  }

  // OpenStreetMap n'a pas répondu : impossible de conclure, le serveur revalidera
  if (osmData === null) return acceptUnverified(clean);

  // Si aucun service n'a reconnu l'endroit
  return {
    isValid: false,
    error:
      "Ce lieu ou cette adresse n'a pas pu être identifié(e). Veuillez préciser un lieu réel ou sélectionner une suggestion.",
  };
}
