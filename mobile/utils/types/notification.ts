export type NotificationType =
  // Traiteur & Devis événementiels
  | "nouvelle_commande"
  | "commande_acceptee"
  | "commande_refusee"
  | "devis_chiffre"
  | "devis_refuse"
  | "devis_signature_requise"
  | "devis_valide"
  | "devis_acompte_verse"
  | "devis_acompte_refuse"
  | "devis_acompte_annule"
  | "traiteur_proposal_received"
  | "traiteur_proposal_accepted"
  | "traiteur_request_deleted"
  // Commandes de plats cuisinés
  | "nouvelle_commande_plat"
  | "order_acceptee"
  | "order_refusee"
  // GP Transport de colis
  | "nouvelle_demande_colis"
  | "gp_acceptee"
  | "gp_refusee"
  | "gp_retard"
  // Sécurité & Système
  | "security_alert"
  | "system_info"
  | string;

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  titre: string;
  message: string;
  data?: {
    commande_id?: string;
    order_id?: string;
    request_id?: string;
    listing_id?: string;
    proposalId?: string;
    requestId?: string;
    traiteurId?: string;
    clientId?: string;
    prix_devis?: number;
    acompte_montant?: number;
    action?: string;
    status?: string;
    new_arrival_date?: string;
    delay_reason?: string;
    weight_kg?: number;
    total_amount?: number;
    date_evenement?: string;
    nb_personnes?: number;
    motif?: string;
    ip?: string;
    targetUrl?: string;
    [key: string]: any;
  } | null;
  is_read: boolean;
  created_at: string;
}

export type NotificationCategory = "all" | "unread" | "traiteur" | "gp" | "securite";

/**
 * Retourne la catégorie fonctionnelle d'une notification
 */
export function getNotificationCategory(type: string): "traiteur" | "gp" | "securite" | "system" {
  if (
    type.startsWith("gp_") ||
    type === "nouvelle_demande_colis"
  ) {
    return "gp";
  }

  if (
    type.startsWith("devis_") ||
    type.startsWith("traiteur_") ||
    type.startsWith("commande_") ||
    type.startsWith("order_") ||
    type === "nouvelle_commande" ||
    type === "nouvelle_commande_plat"
  ) {
    return "traiteur";
  }

  if (type === "security_alert") {
    return "securite";
  }

  return "system";
}

/**
 * Métadonnées graphiques complètes pour chaque notification (icône, couleur, libellé)
 */
export function getNotificationVisuals(type: string): {
  iconName: string;
  iconColor: string;
  badgeBg: string;
  categoryLabel: string;
  badgeColor: string;
} {
  switch (type) {
    // ── Devis & Acomptes séquestrés ──
    case "devis_acompte_verse":
      return {
        iconName: "shield-checkmark",
        iconColor: "#059669",
        badgeBg: "#ECFDF5",
        categoryLabel: "Acompte Séquestré",
        badgeColor: "#065F46",
      };
    case "devis_acompte_refuse":
      return {
        iconName: "cash-outline",
        iconColor: "#D97706",
        badgeBg: "#FEF3C7",
        categoryLabel: "Paiement Jour J",
        badgeColor: "#92400E",
      };
    case "devis_acompte_annule":
      return {
        iconName: "refresh-circle-outline",
        iconColor: "#6B7280",
        badgeBg: "#F3F4F6",
        categoryLabel: "Acompte en attente",
        badgeColor: "#374151",
      };
    case "devis_chiffre":
      return {
        iconName: "document-text-outline",
        iconColor: "#2563EB",
        badgeBg: "#EFF6FF",
        categoryLabel: "Devis Chiffré",
        badgeColor: "#1E40AF",
      };
    case "devis_valide":
      return {
        iconName: "checkmark-done-circle",
        iconColor: "#059669",
        badgeBg: "#ECFDF5",
        categoryLabel: "Devis Validé 100%",
        badgeColor: "#065F46",
      };
    case "devis_signature_requise":
      return {
        iconName: "create-outline",
        iconColor: "#7C3AED",
        badgeBg: "#F5F3FF",
        categoryLabel: "Signature requise",
        badgeColor: "#5B21B6",
      };
    case "devis_refuse":
      return {
        iconName: "close-circle-outline",
        iconColor: "#DC2626",
        badgeBg: "#FEF2F2",
        categoryLabel: "Devis décliné",
        badgeColor: "#991B1B",
      };

    // ── Commandes Traiteur & Plats ──
    case "nouvelle_commande":
    case "nouvelle_commande_plat":
      return {
        iconName: "restaurant",
        iconColor: "#D97706",
        badgeBg: "#FFFBEB",
        categoryLabel: "Nouvelle Commande",
        badgeColor: "#B45309",
      };
    case "commande_acceptee":
    case "order_acceptee":
      return {
        iconName: "checkmark-circle",
        iconColor: "#16A34A",
        badgeBg: "#F0FDF4",
        categoryLabel: "Commande Confirmée",
        badgeColor: "#15803D",
      };
    case "commande_refusee":
    case "order_refusee":
      return {
        iconName: "close-circle",
        iconColor: "#E11D48",
        badgeBg: "#FFF1F2",
        categoryLabel: "Commande Refusée",
        badgeColor: "#BE123C",
      };
    case "traiteur_proposal_received":
      return {
        iconName: "pricetag-outline",
        iconColor: "#0D9488",
        badgeBg: "#F0FDFA",
        categoryLabel: "Proposition reçue",
        badgeColor: "#0F766E",
      };
    case "traiteur_proposal_accepted":
      return {
        iconName: "star",
        iconColor: "#16A34A",
        badgeBg: "#F0FDF4",
        categoryLabel: "Proposition acceptée",
        badgeColor: "#15803D",
      };
    case "traiteur_request_deleted":
      return {
        iconName: "trash-outline",
        iconColor: "#64748B",
        badgeBg: "#F8FAFC",
        categoryLabel: "Demande annulée",
        badgeColor: "#475569",
      };

    case "commande_annulee":
    case "order_annulee":
      return {
        iconName: "close-circle-outline",
        iconColor: "#64748B",
        badgeBg: "#F1F5F9",
        categoryLabel: "Commande Annulée",
        badgeColor: "#475569",
      };
    case "commande_modifiee":
    case "order_modifiee":
      return {
        iconName: "create-outline",
        iconColor: "#2563EB",
        badgeBg: "#EFF6FF",
        categoryLabel: "Commande Modifiée",
        badgeColor: "#1E40AF",
      };

    // ── GP Transport Colis ──
    case "nouvelle_demande_colis":
      return {
        iconName: "airplane",
        iconColor: "#0284C7",
        badgeBg: "#F0F9FF",
        categoryLabel: "Demande GP Colis",
        badgeColor: "#0369A1",
      };
    case "gp_acceptee":
      return {
        iconName: "checkmark-done-outline",
        iconColor: "#059669",
        badgeBg: "#ECFDF5",
        categoryLabel: "Colis GP Accepté",
        badgeColor: "#065F46",
      };
    case "gp_refusee":
      return {
        iconName: "alert-circle-outline",
        iconColor: "#DC2626",
        badgeBg: "#FEF2F2",
        categoryLabel: "Colis GP Refusé",
        badgeColor: "#991B1B",
      };
    case "gp_colis_recu":
      return {
        iconName: "cube-outline",
        iconColor: "#0284C7",
        badgeBg: "#F0F9FF",
        categoryLabel: "Colis Réceptionné",
        badgeColor: "#0369A1",
      };
    case "gp_acheminement":
      return {
        iconName: "airplane-outline",
        iconColor: "#2563EB",
        badgeBg: "#EFF6FF",
        categoryLabel: "En Acheminement",
        badgeColor: "#1E40AF",
      };
    case "gp_arrive":
      return {
        iconName: "location-outline",
        iconColor: "#059669",
        badgeBg: "#ECFDF5",
        categoryLabel: "Arrivé à destination",
        badgeColor: "#065F46",
      };
    case "gp_livre":
      return {
        iconName: "checkmark-done-circle",
        iconColor: "#059669",
        badgeBg: "#ECFDF5",
        categoryLabel: "Colis Livré",
        badgeColor: "#065F46",
      };
    case "gp_retard":
      return {
        iconName: "time-outline",
        iconColor: "#EA580C",
        badgeBg: "#FFF7ED",
        categoryLabel: "Retard Vol GP",
        badgeColor: "#C2410C",
      };
    case "gp_demande_annulee":
    case "gp_vol_annule":
      return {
        iconName: "close-circle-outline",
        iconColor: "#DC2626",
        badgeBg: "#FEF2F2",
        categoryLabel: "Trajet/Colis Annulé",
        badgeColor: "#991B1B",
      };
    case "gp_demande_modifiee":
      return {
        iconName: "create-outline",
        iconColor: "#0284C7",
        badgeBg: "#F0F9FF",
        categoryLabel: "Demande Mise à jour",
        badgeColor: "#0369A1",
      };

    // ── Statut & Partenaires ──
    case "statut_partenaire":
      return {
        iconName: "sparkles",
        iconColor: "#D97706",
        badgeBg: "#FEF3C7",
        categoryLabel: "Statut Partenaire",
        badgeColor: "#92400E",
      };

    // ── Sécurité & Système ──
    case "security_alert":
      return {
        iconName: "shield",
        iconColor: "#B91C1C",
        badgeBg: "#FEF2F2",
        categoryLabel: "Alerte Sécurité",
        badgeColor: "#991B1B",
      };

    default:
      return {
        iconName: "notifications",
        iconColor: "#1D6B45",
        badgeBg: "#ECFDF5",
        categoryLabel: "Notification",
        badgeColor: "#0B3B24",
      };
  }
}

/**
 * Formatage convivial et relatif de la date en français
 */
export function formatNotificationDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return `Aujourd'hui à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diffDays === 1 || (diffHours < 48 && date.getDate() === now.getDate() - 1)) {
    return `Hier à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Nettoie le titre d'une notification en retirant les éventuels émojis
 * afin de garantir un affichage moderne et sobre avec les icônes vectorielles thématisées.
 */
export function cleanNotificationTitle(title?: string | null): string {
  if (!title) return "";
  return title
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}
