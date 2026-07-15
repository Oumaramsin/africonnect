import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: string | JwtPayload;
}

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

export interface CreateGpListingInput {
  gp_id?: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: Date | string;
  available_kg: number;
  price_per_kg: number;
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
  created_at: Date | string | null;
}
