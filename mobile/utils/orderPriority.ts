/*
 * Tri des commandes par priorité, du point de vue de l'utilisateur :
 *   0. une action de sa part est attendue (devis à chiffrer ou à signer, acompte à régler,
 *      commande ou demande de colis à accepter) ;
 *   1. confirmé et à venir ;
 *   2. en attente de l'autre partie ;
 *   3. passé ou terminé ;
 *   4. annulé ou refusé.
 * À rang égal : date de l'événement (de la livraison, du départ) la plus proche d'abord pour ce qui
 * est à venir, la plus récente d'abord pour l'historique.
 */

export type OrderKind = "devis" | "plat" | "gp";
/** « client » : commandes passées ; « pro » : commandes reçues (traiteur, voyageur GP). */
export type OrderViewer = "client" | "pro";

type SortableOrder = {
  statut?: string | null;
  status?: string | null;
  created_at?: string | null;
  devis_status?: string | null;
  prix_devis?: number | string | null;
  conditions_devis?: string | null;
  client_signed_at?: string | null;
  traiteur_signed_at?: string | null;
  date_evenement?: string | null;
  delivery_date?: string | null;
  departure_date?: string | null;
};

const CANCELLED = new Set(["annulee", "refusee", "rejected", "refused", "cancelled", "annule", "refuse"]);
const DONE = new Set(["livre", "livree", "delivered", "terminee", "completed"]);

const toTime = (value?: string | null): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const startOfToday = (): number => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
};

/**
 * Jour calendaire d'une date d'événement : « 2026-12-16 » (ou « 2026-12-16T00:00:00.000Z ») est lu
 * comme le 16 décembre local, sinon un événement du jour passerait pour « passé » à l'ouest de Greenwich.
 */
const toLocalDay = (value?: string | null): number | null => {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!match) return toTime(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
};

const relevantDate = (order: SortableOrder, kind: OrderKind): number | null =>
  toLocalDay(kind === "devis" ? order.date_evenement : kind === "plat" ? order.delivery_date : order.departure_date);

/** Acompte encore à régler (ou à choisir) par le client sur un devis signé. */
const isAcompteDue = (order: SortableOrder): boolean => {
  if (!order.conditions_devis) return false;
  try {
    const meta = JSON.parse(order.conditions_devis);
    return (
      meta.acompte_type !== "aucun" &&
      Number(meta.acompte_montant || 0) > 0 &&
      !meta.acompte_paye &&
      !meta.acompte_choix_jour_j
    );
  } catch {
    return false;
  }
};

const devisRank = (order: SortableOrder, viewer: OrderViewer, isPast: boolean): number => {
  const statut = order.statut || "";
  if (CANCELLED.has(statut) || order.devis_status === "refuse") return 4;
  if (isPast) return 3;
  const priced = Number(order.prix_devis || 0) > 0;
  // Confirmé seulement s'il est signé par les deux : une demande « acceptée » par le traiteur peut
  // encore attendre son chiffrage ou une signature
  const fullySigned = order.devis_status === "signe_par_les_deux";
  if (viewer === "client") {
    if (priced && !order.client_signed_at && !fullySigned) return 0;
    if (fullySigned) return isAcompteDue(order) ? 0 : 1;
    return 2;
  }
  if (!priced) return 0;
  if (!order.traiteur_signed_at && !fullySigned) return 0;
  return fullySigned ? 1 : 2;
};

const platRank = (order: SortableOrder, viewer: OrderViewer, isPast: boolean): number => {
  const status = order.status || order.statut || "";
  if (CANCELLED.has(status)) return 4;
  if (DONE.has(status)) return 3;
  if (status === "pending" || status === "en_attente") {
    if (isPast) return 3;
    return viewer === "pro" ? 0 : 2;
  }
  return isPast ? 3 : 1;
};

const gpRank = (order: SortableOrder, viewer: OrderViewer, isPast: boolean): number => {
  const status = order.status || "";
  if (CANCELLED.has(status)) return 4;
  if (DONE.has(status)) return 3;
  if (status === "pending") {
    if (isPast) return 3;
    return viewer === "pro" ? 0 : 2;
  }
  return 1;
};

export function sortOrdersByPriority<T extends SortableOrder>(
  items: T[],
  kind: OrderKind,
  viewer: OrderViewer,
): T[] {
  const today = startOfToday();
  const ranked = items.map((item) => {
    const date = relevantDate(item, kind);
    const isPast = date !== null && date < today;
    const rank =
      kind === "devis"
        ? devisRank(item, viewer, isPast)
        : kind === "plat"
          ? platRank(item, viewer, isPast)
          : gpRank(item, viewer, isPast);
    return { item, rank, date, created: toTime(item.created_at) ?? 0 };
  });

  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const upcoming = a.rank <= 2;
    if (a.date !== null && b.date !== null && a.date !== b.date) {
      return upcoming ? a.date - b.date : b.date - a.date;
    }
    // Sans date : après celles qui en ont une
    if (a.date === null && b.date !== null) return 1;
    if (a.date !== null && b.date === null) return -1;
    return b.created - a.created;
  });

  return ranked.map((entry) => entry.item);
}
