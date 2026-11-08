import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface AuthUserPayload extends JwtPayload {
  userId: string;
  role?: string;
  full_name?: string;
  email?: string;
  pwd?: string;
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

export const DEVIS_STATUS = {
  DRAFT: "draft",
  EN_ATTENTE_SIGNATURES: "en_attente_signatures",
  SIGNE_CLIENT: "signe_client",
  SIGNE_TRAITEUR: "signe_traiteur",
  SIGNE_PAR_LES_DEUX: "signe_par_les_deux",
  REFUSE: "refuse",
} as const;

export interface DevisConditionsMetadata {
  texte?: string;
  acompte_type?: "aucun" | "obligatoire" | "optionnel";
  acompte_montant?: number;
  acompte_pourcentage?: number;
  acompte_paye?: boolean;
  acompte_paye_at?: string | null;
  acompte_transaction_ref?: string | null;
  acompte_choix_jour_j?: boolean;
  /** Date à laquelle le traiteur a signalé ne pas avoir reçu l'acompte déclaré réglé (null sinon) */
  acompte_conteste_at?: string | null;
}

/**
 * Seuls champs des conditions de devis acceptés du traiteur : le montant de l'acompte est calculé
 * par le serveur et l'état du règlement (payé, date, référence, choix du jour J) vient de la base.
 */
export interface DevisConditionsInput {
  texte?: string;
  acompte_type?: "aucun" | "obligatoire" | "optionnel";
  acompte_pourcentage?: number;
}

export const ACOMPTE_TYPES = ["aucun", "obligatoire", "optionnel"] as const;
export const ACOMPTE_MAX_POURCENTAGE = 80;
export const DEVIS_TEXT_MAX_LENGTH = 3000;

/**
 * Conditions envoyées par le traiteur (JSON sérialisé, ou texte libre des anciennes versions) :
 * seuls le texte, le type et le pourcentage d'acompte sont retenus, le reste est ignoré.
 */
export const parseDevisConditionsInput = (
  raw: string,
): { value?: DevisConditionsInput; error?: string } => {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return trimmed.length > DEVIS_TEXT_MAX_LENGTH
      ? { error: "Le texte des conditions ne doit pas dépasser 3 000 caractères." }
      : { value: { texte: trimmed } };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { error: "Les conditions du devis sont illisibles." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "Les conditions du devis sont illisibles." };
  }

  const value: DevisConditionsInput = {};
  if (parsed.texte !== undefined && parsed.texte !== null) {
    if (typeof parsed.texte !== "string" || parsed.texte.length > DEVIS_TEXT_MAX_LENGTH) {
      return { error: "Le texte des conditions doit être un texte de 3 000 caractères maximum." };
    }
    value.texte = parsed.texte.trim();
  }
  if (parsed.acompte_type !== undefined && parsed.acompte_type !== null) {
    if (!ACOMPTE_TYPES.includes(parsed.acompte_type)) {
      return { error: "Type d'acompte invalide (aucun, obligatoire ou optionnel)." };
    }
    value.acompte_type = parsed.acompte_type;
  }
  // Le pourcentage est ignoré (forcé à 0) quand aucun acompte n'est demandé
  const rawPourcentage = parsed.acompte_pourcentage;
  if (value.acompte_type !== "aucun" && rawPourcentage !== undefined && rawPourcentage !== null && rawPourcentage !== "") {
    const pourcentage =
      typeof rawPourcentage === "number"
        ? rawPourcentage
        : typeof rawPourcentage === "string"
          ? Number(rawPourcentage.trim().replace(",", "."))
          : NaN;
    if (!Number.isFinite(pourcentage) || pourcentage < 0 || pourcentage > ACOMPTE_MAX_POURCENTAGE) {
      return { error: `Le pourcentage d'acompte doit être compris entre 0 et ${ACOMPTE_MAX_POURCENTAGE} %.` };
    }
    value.acompte_pourcentage = pourcentage;
  }
  return { value };
};

// Texte par défaut des conditions d'un devis : les paiements se font directement entre le client et
// le traiteur, Dabari ne perçoit ni ne conserve aucun fonds.
export const DEFAULT_DEVIS_CONDITIONS_TEXTE =
  "Acompte et solde à régler directement au traiteur, selon les modalités convenues entre vous. Dabari assure la mise en relation et ne perçoit ni ne conserve aucun fonds.";

// Anciens textes par défaut, qui annonçaient à tort un séquestre : remplacés à la lecture (et donc
// réécrits à la prochaine mise à jour du devis).
const LEGACY_DEVIS_CONDITIONS_TEXTES = new Set([
  "Paiement garanti sous séquestre Dabari. Solde libéré après confirmation de la prestation.",
  "Paiement garanti sous séquestre Dabari. Solde libéré après confirmation de l'événement.",
]);

export const parseDevisConditionsMeta = (raw?: string | null): DevisConditionsMetadata => {
  const meta = parseDevisConditionsMetaRaw(raw);
  if (LEGACY_DEVIS_CONDITIONS_TEXTES.has((meta.texte || "").trim())) {
    meta.texte = DEFAULT_DEVIS_CONDITIONS_TEXTE;
  }
  return meta;
};

const parseDevisConditionsMetaRaw = (
  raw?: string | null,
): DevisConditionsMetadata => {
  const defaultMeta: DevisConditionsMetadata = {
    texte: DEFAULT_DEVIS_CONDITIONS_TEXTE,
    acompte_type: "optionnel",
    acompte_montant: 0,
    acompte_pourcentage: 30,
    acompte_paye: false,
    acompte_paye_at: null,
    acompte_transaction_ref: null,
    acompte_choix_jour_j: false,
    acompte_conteste_at: null,
  };

  if (!raw) return defaultMeta;

  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed);
      return {
        texte:
          typeof parsed.texte === "string"
            ? parsed.texte
            : typeof parsed.conditions === "string"
              ? parsed.conditions
              : defaultMeta.texte,
        acompte_type:
          parsed.acompte_type === "aucun" ||
          parsed.acompte_type === "obligatoire" ||
          parsed.acompte_type === "optionnel"
            ? parsed.acompte_type
            : "optionnel",
        acompte_montant:
          typeof parsed.acompte_montant === "number" && !isNaN(parsed.acompte_montant)
            ? Math.max(0, parsed.acompte_montant)
            : 0,
        acompte_pourcentage:
          typeof parsed.acompte_pourcentage === "number" &&
          !isNaN(parsed.acompte_pourcentage)
            ? Math.min(100, Math.max(0, parsed.acompte_pourcentage))
            : 30,
        acompte_paye: parsed.acompte_paye === true,
        acompte_paye_at: typeof parsed.acompte_paye_at === "string" ? parsed.acompte_paye_at : null,
        acompte_transaction_ref:
          typeof parsed.acompte_transaction_ref === "string" ? parsed.acompte_transaction_ref : null,
        acompte_choix_jour_j: parsed.acompte_choix_jour_j === true,
        acompte_conteste_at: typeof parsed.acompte_conteste_at === "string" ? parsed.acompte_conteste_at : null,
      };
    }
  } catch {
    // Fallback plain string
  }

  return {
    ...defaultMeta,
    texte: raw,
  };
};

/**
 * Conditions d'un devis pour un prix donné : texte, type et pourcentage d'acompte repris de la saisie
 * (sinon valeurs par défaut), montant recalculé côté serveur, aucun règlement déclaré.
 */
export const buildDevisConditions = (
  price: number,
  input?: DevisConditionsInput,
): DevisConditionsMetadata => {
  const defaults = parseDevisConditionsMeta(null);
  const acompteType = input?.acompte_type ?? defaults.acompte_type ?? "optionnel";
  const pourcentage =
    acompteType === "aucun"
      ? 0
      : Math.min(input?.acompte_pourcentage ?? defaults.acompte_pourcentage ?? 30, ACOMPTE_MAX_POURCENTAGE);
  return {
    ...defaults,
    texte: input?.texte?.trim() || defaults.texte,
    acompte_type: acompteType,
    acompte_pourcentage: pourcentage,
    acompte_montant: acompteType === "aucun" ? 0 : Math.round(price * pourcentage) / 100,
  };
};

export const serializeDevisConditionsMeta = (
  meta: DevisConditionsMetadata,
): string => {
  return JSON.stringify({
    texte: meta.texte || "",
    acompte_type: meta.acompte_type || "optionnel",
    acompte_montant: meta.acompte_montant ?? 0,
    // `??` et non `||` : un acompte de 0 % (type « aucun ») ne doit pas redevenir 30 %
    acompte_pourcentage: meta.acompte_pourcentage ?? 30,
    acompte_paye: Boolean(meta.acompte_paye),
    acompte_paye_at: meta.acompte_paye_at || null,
    acompte_transaction_ref: meta.acompte_transaction_ref || null,
    acompte_choix_jour_j: Boolean(meta.acompte_choix_jour_j),
    acompte_conteste_at: meta.acompte_conteste_at || null,
  });
};

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
// Négociation du prix d'une offre de traiteur
// ==========================================

/** Contre-propositions qu'un client peut faire sur une même offre (ensuite : signer ou décliner). */
export const NEGOCIATION_MAX_CONTRE_OFFRES = 3;
export const NEGOCIATION_MESSAGE_MAX_LENGTH = 500;

/**
 * Étape de la négociation d'une offre, enregistrée par le serveur seul (colonne JSON
 * traiteur_proposals.negociation) :
 * - « contre_offre » : le client propose un prix (prix) plus bas que le devis en cours (prix_precedent) ;
 * - « prix_maintenu » : le traiteur garde son devis signé (prix), avec un message facultatif ;
 * - « nouveau_devis » : le traiteur signe un nouveau devis (prix) qui remplace le précédent (prix_precedent).
 */
export type NegociationEntry = {
  type: "contre_offre" | "prix_maintenu" | "nouveau_devis";
  auteur: "client" | "traiteur";
  prix: number;
  prix_precedent: number | null;
  message: string | null;
  at: string;
};

const NEGOCIATION_TYPES = ["contre_offre", "prix_maintenu", "nouveau_devis"];

/** Historique lu en base : toute entrée inattendue est ignorée. */
export const parseNegociation = (raw: unknown): NegociationEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is NegociationEntry =>
      !!entry &&
      typeof entry === "object" &&
      NEGOCIATION_TYPES.includes(entry.type) &&
      (entry.auteur === "client" || entry.auteur === "traiteur") &&
      typeof entry.prix === "number" &&
      Number.isFinite(entry.prix) &&
      typeof entry.at === "string",
  );
};

/** Vrai si une contre-proposition du client attend la réponse du traiteur. */
export const hasPendingCounterOffer = (entries: NegociationEntry[]): boolean =>
  entries.length > 0 && entries[entries.length - 1].type === "contre_offre";

export const countCounterOffers = (entries: NegociationEntry[]): number =>
  entries.filter((entry) => entry.type === "contre_offre").length;

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
  // La proposition est un devis : conditions d'acompte et signature (engagement) du traiteur
  conditions: DevisConditionsInput;
  traiteur_signature: string;
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
  recipient_name?: string;
  recipient_phone?: string;
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
  recipient_name?: string;
  recipient_phone?: string;
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
  recipient_name?: string | null;
  recipient_phone?: string | null;
  departure_city?: string | null;
  departure_country?: string | null;
  arrival_city?: string | null;
  arrival_country?: string | null;
  departure_date?: Date | string | null;
  arrival_date?: Date | string | null;
  created_at: Date | string | null;
}
