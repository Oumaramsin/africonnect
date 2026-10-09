import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface AuthUserPayload extends JwtPayload {
  userId: string;
  role?: string;
  full_name?: string;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload | any;
}

/**
 * Extrait l'identifiant utilisateur authentifié (strictement issu du token vérifié)
 */
export const getAuthUserId = (req: Request): string | null => {
  const user = (req as AuthenticatedRequest).user;
  if (!user || typeof user !== "object") return null;
  return user.userId || (user as any).id || null;
};

/**
 * Extrait le payload utilisateur authentifié
 */
export const getAuthUser = (req: Request): AuthUserPayload | null => {
  const user = (req as AuthenticatedRequest).user;
  if (!user || typeof user !== "object") return null;
  return user;
};

/**
 * Vérifie si l'utilisateur courant possède le rôle administrateur
 */
export const isUserAdmin = (req: Request): boolean => {
  const user = getAuthUser(req);
  return user?.role === "admin";
};

/**
 * Valide si une chaîne est un UUID v4 valide pour éviter les injections ou erreurs 500 Prisma
 */
export const isValidUUID = (id?: string | null): boolean => {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id.trim(),
  );
};

// ==========================================
// Constantes de Statuts Centralisées
// ==========================================

export const COMMANDE_TRAITEUR_STATUS = {
  EN_ATTENTE: "en_attente",
  ACCEPTEE: "acceptee",
  REFUSEE: "refusee",
  ANNULEE: "annulee",
} as const;

export const ORDER_PLAT_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
} as const;

export const GP_REQUEST_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REFUSED: "refused",
  REJECTED: "rejected",
  COLIS_RECU: "colis_recu",
  EN_ACHEMINEMENT: "en_acheminement",
  ARRIVE: "arrive",
  LIVRE: "livre",
  CANCELLED: "cancelled",
} as const;

export const TRAITEUR_REQUEST_STATUS = {
  OPEN: "open",
  FULFILLED: "fulfilled",
  CANCELLED: "cancelled",
} as const;

export const TRAITEUR_PROPOSAL_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const;

// ==========================================
// Interfaces Données Traiteur & Plats
// ==========================================

export interface CreateCommandeTraiteurInput {
  client_id?: string;
  traiteur_id: string;
  date_evenement: Date | string;
  nb_personnes: number;
  adresse: string;
  type_evenement?: string;
  notes?: string;
}

export interface CreateOrderItemInput {
  dish_id: string;
  quantity: number;
  unit_price: number;
}

export interface CreateDishesOrderInput {
  client_id?: string;
  traiteur_id: string;
  delivery_type?: string;
  delivery_address: string;
  delivery_date: Date | string;
  notes?: string;
  items: CreateOrderItemInput[];
}

export interface OrderItem {
  id: string;
  order_id: string | null;
  dish_id: string | null;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  client_id: string | null;
  traiteur_id: string | null;
  status: string | null;
  delivery_type: string | null;
  delivery_address: string | null;
  delivery_date: Date | string | null;
  total_amount: number | null;
  notes: string | null;
  created_at: Date | string | null;
  order_items?: OrderItem[];
}

export interface CreateTraiteurProfileInput {
  name: string;
  bio: string;
  cuisine_type: string[];
  delivery_zones: string[];
  whatsapp?: string;
  image_url?: string;
}

export interface CreateDishInput {
  name: string;
  description: string;
  price: number;
  cuisine_type: string;
  image_urls?: string[];
  is_available?: boolean;
}

export interface CreateTraiteurRequestInput {
  event_type: string;
  guest_count?: number | null;
  event_date: Date | string;
  location: string;
  food_preferences: string;
  budget?: number | null;
  description?: string | null;
  title?: string | null;
}

export interface UpdateTraiteurRequestInput {
  title?: string;
  event_type?: string;
  guest_count?: number | null;
  event_date?: string;
  location?: string;
  food_preferences?: string;
  budget?: number | null;
  description?: string | null;
}

export interface CreateTraiteurProposalInput {
  proposed_price: number;
  message: string;
}

// ==========================================
// Interfaces Données GP (Transporteurs)
// ==========================================

export interface CreateGpListingInput {
  gp_id?: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: Date | string;
  arrival_date?: Date | string | null;
  available_kg: number;
  price_per_kg: number;
  flight_type?: string;
  pickup_address?: string;
  pickup_city?: string;
  dropoff_address?: string;
  dropoff_city?: string;
  description?: string;
}

export interface UpdateGpListingInput {
  departure_city?: string;
  departure_country?: string;
  arrival_city?: string;
  arrival_country?: string;
  departure_date?: Date | string;
  arrival_date?: Date | string | null;
  available_kg?: number;
  price_per_kg?: number;
  flight_type?: string;
  pickup_address?: string;
  pickup_city?: string;
  dropoff_address?: string;
  dropoff_city?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateGpRequestInput {
  listing_id: string;
  sender_id?: string;
  weight_kg: number;
  content_desc: string;
  declared_value?: number;
  notes?: string;
  total_amount?: number;
}

export interface GpDelayInput {
  arrival_date: string;
  delay_reason?: string;
}

export interface UpdateClientGpRequestInput {
  weight_kg?: number;
  content_desc?: string;
  declared_value?: number;
  notes?: string;
}

export interface GpRequest {
  id: string;
  listing_id: string | null;
  sender_id: string | null;
  weight_kg: number;
  content_desc: string;
  declared_value: number | null;
  status: string | null;
  total_amount: number | null;
  notes: string | null;
  departure_city?: string | null;
  departure_country?: string | null;
  arrival_city?: string | null;
  arrival_country?: string | null;
  departure_date?: Date | string | null;
  arrival_date?: Date | string | null;
  created_at: Date | string | null;
}
