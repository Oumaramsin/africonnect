import { router } from "expo-router";

/** Ce qu'une notification (de l'écran Notifications ou reçue en push) indique pour la navigation. */
export interface NotificationTarget {
  type?: string | null;
  data?: Record<string, unknown> | null;
}

const asParam = (value: unknown) => String(value);

/** Notifications reçues par un traiteur au sujet de ses offres : ouvertes sur les annonces. */
const TRAITEUR_OFFER_TYPES = new Set([
  "traiteur_contre_offre",
  "traiteur_proposal_rejected",
  "traiteur_request_deleted",
]);

/**
 * Ouvre l'écran lié à une notification : même logique pour un toucher dans l'écran Notifications
 * et pour l'ouverture d'une notification push.
 */
export function openNotificationTarget({ type, data }: NotificationTarget): void {
  const payload = data || {};

  if (payload.commande_id) {
    router.push({
      pathname: "/commandes",
      params: { tab: "traiteur", commande_id: asParam(payload.commande_id) },
    });
    return;
  }

  if (payload.order_id) {
    router.push({
      pathname: "/commandes",
      params: { tab: "traiteur", sub: "plats" },
    });
    return;
  }

  if (payload.request_id || payload.listing_id) {
    router.push({
      pathname: "/commandes",
      params: { tab: "gp" },
    });
    return;
  }

  // Contre-proposition reçue par un traiteur : écran de réponse de l'annonce concernée
  if (type === "traiteur_contre_offre" && typeof payload.requestId === "string" && payload.requestId) {
    router.push({
      pathname: "/traiteur/negociation" as any,
      params: { requestId: payload.requestId },
    });
    return;
  }

  if (type && TRAITEUR_OFFER_TYPES.has(type)) {
    router.push({
      pathname: "/traiteur" as any,
      params: { tab: "demandes" },
    });
    return;
  }

  if (payload.proposalId || payload.requestId) {
    router.push({
      pathname: "/commandes",
      params: { tab: "traiteur", sub: "mes_demandes" },
    });
    return;
  }

  // Si alerte sécurité admin
  if (type === "security_alert") {
    router.push("/admin" as any);
    return;
  }

  // Fallback par défaut vers l'espace commandes
  router.push("/commandes");
}
