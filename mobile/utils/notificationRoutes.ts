import { router } from "expo-router";

/** Ce qu'une notification (de l'écran Notifications ou reçue en push) indique pour la navigation. */
export interface NotificationTarget {
  type?: string | null;
  data?: Record<string, unknown> | null;
}

const asParam = (value: unknown) => String(value);

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
