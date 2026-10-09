/**
 * Constantes géographiques partagées pour Dabari (Mobile)
 * Liste standardisée des villes et destinations courantes pour le service GP et transport
 */

export const COMMON_CITIES: string[] = [
  "Paris",
  "Lyon",
  "Marseille",
  "Bordeaux",
  "Toulouse",
  "Lille",
  "Bruxelles",
  "Genève",
  "Dakar",
  "Abidjan",
  "Douala",
  "Yaoundé",
  "Brazzaville",
  "Kinshasa",
  "Bamako",
  "Conakry",
  "Ouagadougou",
  "Lomé",
  "Cotonou",
  "Libreville",
  "Casablanca",
  "Tunis",
  "Alger",
  "Montréal",
];

export const COMMON_CITIES_WITH_OTHER: string[] = [
  ...COMMON_CITIES,
  "Autre (Saisie libre)",
];

export const DESTINATIONS = COMMON_CITIES;
