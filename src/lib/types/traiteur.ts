export type Traiteur = {
  id: string;
  name: string;
  bio: string;
  cuisine_type: string[];
  rating: number;
  review_count: number;
  delivery_zones: string[];
  whatsapp: string | null;
  image_url: string | null;
  dishes: Dish[];
};

export type Dish = {
  id: string;
  traiteur_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  image_urls?: string[];
  cuisine_type: string;
  is_available: boolean;
  is_archived?: boolean;
};

export type CartItem = {
  dish: Dish;
  quantity: number;
  traiteur_id: string;
  traiteur_name: string;
};

export const TRAITEUR_EVENT_TYPES = [
  { id: "mariage", label: "Mariage" },
  { id: "anniversaire", label: "Anniversaire" },
  { id: "bapteme", label: "Baptême" },
  { id: "repas_famille", label: "Repas de famille" },
  { id: "diner_prive", label: "Dîner privé" },
  { id: "entreprise", label: "Événement entreprise" },
  { id: "communion", label: "Fête religieuse" },
  { id: "autre", label: "Autre événement" },
] as const;

export type TraiteurRequest = {
  id: string;
  client_id: string;
  title: string | null;
  event_type: string;
  guest_count: number | null;
  event_date: string;
  location: string;
  food_preferences: string;
  budget: number | null;
  description: string | null;
  status: "open" | "fulfilled" | "cancelled";
  created_at: string;
  // Annonce publiée par l'utilisateur connecté (liste des annonces côté traiteur)
  is_own?: boolean;
  client?: {
    id: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    city: string | null;
  };
  proposals?: TraiteurProposal[];
};

/** Étape de la négociation du prix d'une offre (écrite par l'API seule). */
export type NegociationEntry = {
  type: "contre_offre" | "prix_maintenu" | "nouveau_devis";
  auteur: "client" | "traiteur";
  prix: number;
  prix_precedent: number | null;
  message: string | null;
  at: string;
};

export type TraiteurProposal = {
  id: string;
  request_id: string;
  traiteur_id: string;
  proposed_price: number;
  message: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  // Devis proposé : conditions d'acompte (JSON) et signature du traiteur (absentes sur les anciennes offres)
  conditions_devis?: string | null;
  traiteur_signature?: string | null;
  traiteur_signed_at?: string | null;
  // Négociation du prix : contre-propositions du client et réponses du traiteur
  negociation?: NegociationEntry[] | null;
  traiteur?: {
    id: string;
    name: string;
    rating: number | null;
    review_count: number | null;
    image_url: string | null;
    whatsapp: string | null;
    profile?: {
      full_name: string;
      phone: string | null;
      avatar_url: string | null;
    } | null;
  };
  request?: TraiteurRequest;
};

/**
 * Normalise un numéro de téléphone pour un lien direct WhatsApp (ex: 0612345678 -> 33612345678)
 */
export function formatWhatsAppUrl(phone?: string | null, text?: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0") && digits.length === 10) {
    digits = `33${digits.slice(1)}`;
  }
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}