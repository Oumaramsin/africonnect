import { Ionicons } from "@expo/vector-icons";

/**
 * Constantes partagées pour le service Traiteur & Événements (Dabari Mobile)
 * Évite les répétitions de constantes selon le principe DRY
 */

// Spécialités culinaires avec étiquettes formatées (utilisées dans les formulaires de sélection)
export const CUISINES: string[] = [
  "Sénégalaise",
  "Ivoirienne",
  "Camerounaise",
  "Congolaise",
  "Malienne",
  "Guinéenne",
  "Burkinabé",
  "Togolaise",
  "Béninoise",
  "Afro-Fusion",
];

// Identifiants / Slugs normalisés en minuscules
export const CUISINE_SLUGS: string[] = [
  "senegalais",
  "ivoirien",
  "camerounais",
  "congolais",
  "malien",
  "guineen",
  "burkinabe",
  "togolais",
  "beninois",
  "afro-fusion",
];

// Zones de livraison et départements desservis
export const ZONES: string[] = [
  "Paris",
  "Saint-Denis",
  "Aubervilliers",
  "Montreuil",
  "Créteil",
  "Vitry-sur-Seine",
  "Toute l'Île-de-France",
  "Lyon",
  "Marseille",
  "Bordeaux",
  "Toulouse",
];

export interface EventTypeOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// Types d'événements pour les devis et commandes traiteur
export const EVENT_TYPES: EventTypeOption[] = [
  { id: "mariage", label: "Mariage", icon: "heart" },
  { id: "bapteme", label: "Baptême", icon: "happy" },
  { id: "anniversaire", label: "Anniversaire", icon: "gift" },
  { id: "reception", label: "Réception", icon: "wine" },
  { id: "entreprise", label: "Événement pro", icon: "briefcase" },
  { id: "autre", label: "Autre", icon: "sparkles" },
];

// Types d'événements enrichis pour les demandes de traiteur personnalisées
export const DEMANDE_EVENT_TYPES: EventTypeOption[] = [
  { id: "Mariage", label: "Mariage", icon: "heart" },
  { id: "Anniversaire", label: "Anniversaire", icon: "gift" },
  { id: "Baptême", label: "Baptême", icon: "happy" },
  { id: "Buffet / Cocktail", label: "Buffet", icon: "wine" },
  { id: "Fête de famille", label: "Famille", icon: "people" },
  { id: "Dîner privé", label: "Dîner privé", icon: "restaurant" },
  { id: "Événement pro", label: "Événement pro", icon: "briefcase" },
  { id: "Autre", label: "Autre", icon: "sparkles" },
];

// Noms d'événements simplifiés (pour édition rapide)
export const EVENT_TYPE_NAMES: string[] = [
  "Mariage",
  "Anniversaire",
  "Baptême",
  "Buffet / Cocktail",
  "Fête de famille",
  "Dîner privé",
  "Entreprise",
  "Autre",
];

// Suggestions courantes de plats
export const DISH_SUGGESTIONS: string[] = [
  "Thieboudienne au poisson",
  "Poulet Yassa aux oignons",
  "Alloco & Dibi d'agneau",
  "Maffé au bœuf fondant",
  "Ndolé aux crevettes",
  "Attiéké poisson braisé",
  "Pastels au thon & sauce piquante",
];

// Dictionnaire pour affichage direct d'un libellé à partir de son identifiant
export const EVENT_TYPE_LABELS: Record<string, string> = {
  mariage: "Mariage",
  bapteme: "Baptême",
  anniversaire: "Anniversaire",
  reception: "Réception",
  entreprise: "Événement pro",
  autre: "Autre",
};
