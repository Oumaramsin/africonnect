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

export type CommandeTraiteur = {
  id: string;
  statut: string;
  created_at: string;
  nb_personnes: number;
  traiteur?: { name: string } | null;
  traiteurs?: { name: string } | null;
};

export type OrderPlat = {
  id: string;
  status: string;
  created_at: string;
  total_amount: number;
  traiteur?: { name: string } | null;
  traiteurs?: { name: string } | null;
  order_items?: {
    id: string;
    quantity: number;
    dishes?: { name: string } | null;
  }[];
};

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
  client?: {
    id: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    city: string | null;
  };
  proposals?: TraiteurProposal[];
};

export type TraiteurProposal = {
  id: string;
  request_id: string;
  traiteur_id: string;
  proposed_price: number;
  message: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
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
 * Normalise un numéro de téléphone pour un lien direct WhatsApp
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