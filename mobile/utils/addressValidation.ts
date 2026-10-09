/**
 * Service de validation d'existence réelle des adresses (France & International)
 * Dabari Mobile
 */

export interface AddressValidationResult {
  isValid: boolean;
  normalizedAddress?: string;
  error?: string;
}

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
    /\b\d{5}\b/.test(clean);

  // 1. API officielle Adresse data.gouv.fr (France)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const banUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
      clean
    )}&limit=1`;
    const res = await fetch(banUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const first = data.features?.[0];
      const score = first?.properties?.score || 0;

      if (score >= 0.42 && first?.properties?.label) {
        return {
          isValid: true,
          normalizedAddress: first.properties.label,
        };
      }
    }
  } catch (err) {
    console.warn("[verifyAddressExists mobile] Erreur BAN:", err);
  }

  if (isExplicitFrance) {
    return {
      isValid: false,
      error:
        "L'adresse indiquée n'a pas été trouvée en France. Veuillez sélectionner une adresse existante dans les suggestions.",
    };
  }

  // 2. Villes et pays internationaux connus
  const words = lower.split(/[\s,.-]+/);
  const matchesKnownCity = words.some((w) => KNOWN_INTERNATIONAL_CITIES.includes(w));
  const matchesKnownCountry = KNOWN_COUNTRIES.some((c) => lower.includes(c));

  if (matchesKnownCity || matchesKnownCountry) {
    return {
      isValid: true,
      normalizedAddress: clean,
    };
  }

  // 3. Fallback Nominatim OpenStreetMap
  try {
    const osmController = new AbortController();
    const osmTimeout = setTimeout(() => osmController.abort(), 3000);

    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      clean
    )}&format=json&limit=1`;
    const osmRes = await fetch(osmUrl, {
      signal: osmController.signal,
      headers: {
        Accept: "application/json",
      },
    });
    clearTimeout(osmTimeout);

    if (osmRes.ok) {
      const osmData = await osmRes.json();
      if (Array.isArray(osmData) && osmData.length > 0 && osmData[0]?.display_name) {
        return {
          isValid: true,
          normalizedAddress: osmData[0].display_name,
        };
      }
    }
  } catch (osmErr) {
    console.warn("[verifyAddressExists mobile] Erreur OSM fallback:", osmErr);
  }

  return {
    isValid: false,
    error:
      "Ce lieu ou cette adresse n'a pas pu être identifié(e). Veuillez préciser un lieu réel ou sélectionner une suggestion.",
  };
}
