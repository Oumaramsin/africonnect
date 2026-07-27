export type GpListing = {
  id: string;
  gp_id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  available_kg: number;
  price_per_kg: number;
  flight_type: string;
  description: string;
  rating: number;
  review_count: number;
  is_active: boolean;
  pickup_address: string | null;
  pickup_city: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  profiles?: {
    full_name: string;
    phone: string | null;
    whatsapp: string | null;
  } | null;
};

export type GpRequest = {
  id: string;
  listing_id: string;
  sender_id: string;
  weight_kg: number;
  content_desc: string;
  declared_value: number;
  status: string;
  total_amount: number;
  notes: string;
  created_at: string;
};

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  reference_id: string;
  is_read: boolean;
  created_at: string;
};

import React from "react";
import { Globe } from "lucide-react";

const COUNTRY_FLAG: Record<string, string> = {
  France: "🇫🇷",
  Sénégal: "🇸🇳",
  "Côte d'Ivoire": "🇨🇮",
  Cameroun: "🇨🇲",
  Congo: "🇨🇬",
  Mali: "🇲🇱",
  Guinée: "🇬🇳",
  "Burkina Faso": "🇧🇫",
};

export function getFlag(country: string): React.ReactNode {
  if (COUNTRY_FLAG[country]) {
    return COUNTRY_FLAG[country];
  }
  return React.createElement(Globe, {
    className: "inline-block w-4 h-4 text-[#1D6B45] align-text-bottom mr-1",
  });
}

export function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatDistance(km: number): string {
  if (km < 1) return "Moins d'1 km";
  if (km < 10) return `${km} km`;
  return `~${km} km`;
}