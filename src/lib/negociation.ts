import type { NegociationEntry } from "@/lib/types/traiteur";

/*
 * Négociation du prix d'une offre de traiteur : le client propose un prix plus bas (contre-proposition),
 * le traiteur maintient son prix ou signe un nouveau devis, puis le client signe ou décline.
 * Mêmes règles que l'API (backend/src/utils/types.ts), qui reste seule juge.
 */

export const NEGOCIATION_MAX_CONTRE_OFFRES = 3;
export const NEGOCIATION_MESSAGE_MAX_LENGTH = 500;

const ENTRY_TYPES = ["contre_offre", "prix_maintenu", "nouveau_devis"];

/** Historique de la négociation d'une offre (entrées inattendues ignorées). */
export function getNegociation(raw: unknown): NegociationEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is NegociationEntry =>
      !!entry &&
      typeof entry === "object" &&
      ENTRY_TYPES.includes(entry.type) &&
      typeof entry.prix === "number" &&
      Number.isFinite(entry.prix) &&
      typeof entry.at === "string",
  );
}

/** Vrai si une contre-proposition du client attend la réponse du traiteur. */
export function hasPendingCounterOffer(entries: NegociationEntry[]): boolean {
  return entries.length > 0 && entries[entries.length - 1].type === "contre_offre";
}

export function countCounterOffers(entries: NegociationEntry[]): number {
  return entries.filter((entry) => entry.type === "contre_offre").length;
}

export function formatEuros(value: number): string {
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`;
}

/** Montant saisi : virgule ou point décimal, espaces de milliers ignorés ; NaN si invalide. */
export function parseAmountInput(value: string): number {
  const cleaned = value.replace(/[\s  ]/g, "").replace(",", ".");
  return cleaned && /^\d+(\.\d{0,2})?$/.test(cleaned) ? Number(cleaned) : NaN;
}

/** Libellé d'une étape, du point de vue du client ou du traiteur. */
export function describeNegociationEntry(
  entry: NegociationEntry,
  viewer: "client" | "traiteur",
  traiteurName?: string | null,
): string {
  const prix = formatEuros(entry.prix);
  const avant =
    entry.prix_precedent !== null && entry.prix_precedent !== undefined ? formatEuros(entry.prix_precedent) : null;
  switch (entry.type) {
    case "contre_offre":
      return viewer === "client"
        ? `Vous avez proposé ${prix}${avant ? ` (devis : ${avant})` : ""}`
        : `Le client propose ${prix}${avant ? ` (votre devis : ${avant})` : ""}`;
    case "prix_maintenu":
      return viewer === "client"
        ? `${traiteurName || "Le traiteur"} maintient son prix : ${prix}`
        : `Vous avez maintenu votre prix : ${prix}`;
    case "nouveau_devis":
    default:
      return viewer === "client"
        ? `Nouveau devis signé : ${prix}${avant ? ` (au lieu de ${avant})` : ""}`
        : `Vous avez envoyé un nouveau devis : ${prix}${avant ? ` (au lieu de ${avant})` : ""}`;
  }
}
