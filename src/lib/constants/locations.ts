/**
 * Constantes géographiques partagées pour Dabari (Web)
 * Liste standardisée des villes et destinations courantes pour le service GP et transport
 */

export const COMMON_CITIES = [
  "Paris",
  "Lyon",
  "Marseille",
  "Bordeaux",
  "Toulouse",
  "Lille",
  "Dakar",
  "Abidjan",
  "Douala",
  "Yaoundé",
  "Bamako",
  "Conakry",
  "Brazzaville",
  "Kinshasa",
  "Ouagadougou",
  "Cotonou",
  "Lomé",
  "Libreville",
  "Antananarivo",
  "Casablanca",
  "Alger",
  "Tunis",
  "Bruxelles",
  "Genève",
  "Montréal",
] as const;

export const GP_DESTINATION_FILTERS = [
  { label: "Tous les trajets", value: "tout" },
  { label: "🇸🇳 Sénégal", value: "Sénégal" },
  { label: "🇨🇮 Côte d'Ivoire", value: "Côte d'Ivoire" },
  { label: "🇫🇷 France", value: "France" },
  { label: "🇨🇲 Cameroun", value: "Cameroun" },
  { label: "🇲🇱 Mali", value: "Mali" },
  { label: "🇬🇳 Guinée", value: "Guinée" },
  { label: "🇨🇬 Congo", value: "Congo" },
  { label: "🇨🇩 RDC", value: "RDC" },
  { label: "🇧🇫 Burkina Faso", value: "Burkina Faso" },
  { label: "🇧🇯 Bénin", value: "Bénin" },
  { label: "🇹🇬 Togo", value: "Togo" },
  { label: "🇬🇦 Gabon", value: "Gabon" },
  { label: "🇲🇬 Madagascar", value: "Madagascar" },
  { label: "🇲🇦 Maroc", value: "Maroc" },
  { label: "🇧🇪 Belgique", value: "Belgique" },
  { label: "🇨🇦 Canada", value: "Canada" },
] as const;

export const DESTINATIONS = COMMON_CITIES;

export type CommonCity = (typeof COMMON_CITIES)[number];
