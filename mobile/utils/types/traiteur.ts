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