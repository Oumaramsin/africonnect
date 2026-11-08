import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import {
  COMMANDE_TRAITEUR_STATUS,
  DEVIS_STATUS,
  ORDER_PLAT_STATUS,
  GP_REQUEST_STATUS,
  GpDelayInput,
  UpdateClientGpRequestInput,
  DevisConditionsInput,
  DevisConditionsMetadata,
  ACOMPTE_MAX_POURCENTAGE,
  isValidUUID,
  parseDevisConditionsMeta,
  serializeDevisConditionsMeta,
} from "../utils/types";
import { HttpError } from "../utils/validation";
import { hideClientDetailsUntilAccepted } from "../utils/privacy";
import {
  sendOrderNotificationToClientMail,
  sendGpRequestStatusToSenderMail,
  sendOrderCancelledToTraiteurMail,
  sendGpRequestCancelledToGpMail,
  sendDevisChiffreToClientMail,
  sendDevisSignedToTraiteurMail,
  sendAcompteNotificationMail,
  sendGpDelayNotificationMail,
} from "./emailService";

// Coordonnées d'un client transmises au traiteur ou au GP qu'il a lui-même choisi (commande
// directe, colis). Sélection explicite : un nouveau champ du profil n'est jamais exposé par défaut.
const CLIENT_CONTACT_SELECT = {
  id: true,
  full_name: true,
  avatar_url: true,
  phone: true,
  whatsapp: true,
  email: true,
  city: true,
} as const;

// Profil d'un traiteur affiché au client sur les propositions qu'il a reçues
const TRAITEUR_PROFILE_SELECT = {
  id: true,
  full_name: true,
  avatar_url: true,
  phone: true,
} as const;

const CONCURRENT_UPDATE_MESSAGE =
  "Cette commande a été modifiée entre-temps : actualisez la page puis réessayez.";

const DEVIS_CHANGED_ERROR = () =>
  new HttpError(
    409,
    "Le montant du devis a changé depuis votre lecture : vérifiez le nouveau montant avant de signer.",
    "DEVIS_CHANGED",
  );

const DEVIS_ALREADY_ISSUED_ERROR = () =>
  new HttpError(
    409,
    "Un devis a déjà été émis pour cette demande : refusez-le ou contactez le traiteur pour en obtenir un nouveau.",
    "DEVIS_ALREADY_ISSUED",
  );

// Libellés français des statuts, pour des messages d'erreur lisibles
const STATUS_LABELS: Record<string, string> = {
  en_attente: "en attente",
  acceptee: "acceptée",
  refusee: "refusée",
  annulee: "annulée",
  pending: "en attente",
  accepted: "acceptée",
  rejected: "refusée",
  refused: "refusée",
  cancelled: "annulée",
  colis_recu: "colis reçu",
  en_acheminement: "en acheminement",
  arrive: "arrivé",
  livre: "livré",
};
const statusLabel = (status: string | null) => STATUS_LABELS[status || ""] || status || "inconnu";

const transitionError = (from: string | null, to: string) =>
  new HttpError(409, `Changement de statut impossible : « ${statusLabel(from)} » → « ${statusLabel(to)} ».`);

/*
 * Transitions de statut autorisées, par rôle. Les statuts finaux (refusé, annulé, livré) n'ont
 * aucune transition sortante. Le propriétaire est le traiteur de la commande ou le GP de l'annonce ;
 * l'administrateur dispose en plus de l'annulation.
 */
const allowedCommandeTraiteurTargets = (
  current: string | null,
  devisStatus: string | null,
  isAdmin: boolean,
): string[] => {
  const from = current || COMMANDE_TRAITEUR_STATUS.EN_ATTENTE;
  const targets: string[] = [];
  if (from === COMMANDE_TRAITEUR_STATUS.EN_ATTENTE) {
    targets.push(COMMANDE_TRAITEUR_STATUS.ACCEPTEE, COMMANDE_TRAITEUR_STATUS.REFUSEE);
  }
  // Une commande acceptée ne repasse jamais en attente ; elle ne peut plus être refusée une fois le
  // devis signé par les deux parties (engagement mutuel).
  if (from === COMMANDE_TRAITEUR_STATUS.ACCEPTEE && devisStatus !== DEVIS_STATUS.SIGNE_PAR_LES_DEUX) {
    targets.push(COMMANDE_TRAITEUR_STATUS.REFUSEE);
  }
  if (
    isAdmin &&
    (from === COMMANDE_TRAITEUR_STATUS.EN_ATTENTE || from === COMMANDE_TRAITEUR_STATUS.ACCEPTEE)
  ) {
    targets.push(COMMANDE_TRAITEUR_STATUS.ANNULEE);
  }
  return targets;
};

const allowedOrderPlatTargets = (current: string | null, isAdmin: boolean): string[] => {
  const from = current || ORDER_PLAT_STATUS.PENDING;
  const targets: string[] = [];
  if (from === ORDER_PLAT_STATUS.PENDING) {
    targets.push(ORDER_PLAT_STATUS.ACCEPTED, ORDER_PLAT_STATUS.REJECTED);
  }
  // Le traiteur peut se désister d'une commande acceptée (le client est prévenu), jamais la remettre en attente
  if (from === ORDER_PLAT_STATUS.ACCEPTED) {
    targets.push(ORDER_PLAT_STATUS.REJECTED);
  }
  if (isAdmin && (from === ORDER_PLAT_STATUS.PENDING || from === ORDER_PLAT_STATUS.ACCEPTED)) {
    targets.push(ORDER_PLAT_STATUS.CANCELLED);
  }
  return targets;
};

const GP_CLOSED_STATUSES: (string | null)[] = [
  GP_REQUEST_STATUS.CANCELLED,
  GP_REQUEST_STATUS.REFUSED,
  GP_REQUEST_STATUS.REJECTED,
  GP_REQUEST_STATUS.LIVRE,
];

const allowedGpRequestTargets = (current: string | null, isAdmin: boolean): string[] => {
  const from = current || GP_REQUEST_STATUS.PENDING;
  const targets: string[] = [];
  if (from === GP_REQUEST_STATUS.PENDING) {
    targets.push(GP_REQUEST_STATUS.ACCEPTED, GP_REQUEST_STATUS.REFUSED, GP_REQUEST_STATUS.REJECTED);
  } else if (from === GP_REQUEST_STATUS.ACCEPTED) {
    // Désistement possible tant que le colis n'a pas été remis au GP
    targets.push(GP_REQUEST_STATUS.COLIS_RECU, GP_REQUEST_STATUS.REFUSED, GP_REQUEST_STATUS.REJECTED);
  } else if (from === GP_REQUEST_STATUS.COLIS_RECU) {
    targets.push(GP_REQUEST_STATUS.EN_ACHEMINEMENT);
  } else if (from === GP_REQUEST_STATUS.EN_ACHEMINEMENT) {
    targets.push(GP_REQUEST_STATUS.ARRIVE);
  } else if (from === GP_REQUEST_STATUS.ARRIVE) {
    targets.push(GP_REQUEST_STATUS.LIVRE);
  }
  if (isAdmin && !GP_CLOSED_STATUSES.includes(from)) {
    targets.push(GP_REQUEST_STATUS.CANCELLED);
  }
  return targets;
};

const samePrice = (stored: Prisma.Decimal | null, expected: number): boolean =>
  stored !== null && Math.round(Number(stored) * 100) === Math.round(expected * 100);

/** Un devis est « émis » dès qu'un prix a été fixé ou que le circuit de signature a démarré. */
const isDevisIssued = (commande: { prix_devis: Prisma.Decimal | null; devis_status: string | null }) =>
  commande.prix_devis !== null ||
  (commande.devis_status !== null && commande.devis_status !== DEVIS_STATUS.DRAFT);

export const getRecentOrderByClientId = async (client_id: string) => {
  return await db.order.findMany({
    where: {
      client_id: client_id,
    },
    take: 5,
    include: {
      order_items: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });
};

export const getAllOrderById = async (id: string) => {
  const profile = await db.profile.findUnique({
    where: {
      id: id,
    },
    include: {
      gp_requests: {
        orderBy: {
          created_at: "desc",
        },
        include: {
          listing: true,
        },
      },
      commandes: {
        orderBy: {
          created_at: "desc",
        },
        include: {
          traiteur: true,
          client: { select: CLIENT_CONTACT_SELECT },
        },
      },
      orders: {
        orderBy: {
          created_at: "desc",
        },
        include: {
          traiteur: true,
          order_items: {
            include: {
              dish: true,
            },
          },
        },
      },

      traiteurs: {
        include: {
          orders: {
            orderBy: {
              created_at: "desc",
            },
            include: {
              client: { select: CLIENT_CONTACT_SELECT },
              order_items: {
                include: {
                  dish: true,
                },
              },
            },
          },
          commandes: {
            orderBy: {
              created_at: "desc",
            },
            include: {
              client: { select: CLIENT_CONTACT_SELECT },
              traiteur: true,
            },
          },
          proposals: {
            orderBy: {
              created_at: "desc",
            },
            include: {
              request: {
                include: {
                  client: { select: CLIENT_CONTACT_SELECT },
                },
              },
            },
          },
        },
      },

      gp_listings: {
        include: {
          requests: {
            orderBy: {
              created_at: "desc",
            },
            include: {
              sender: { select: CLIENT_CONTACT_SELECT },
              listing: true,
            },
          },
        },
      },

      traiteur_requests: {
        orderBy: {
          created_at: "desc",
        },
        include: {
          proposals: {
            orderBy: {
              created_at: "desc",
            },
            include: {
              traiteur: {
                include: {
                  profile: { select: TRAITEUR_PROFILE_SELECT },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!profile) return profile;

  // Propositions envoyées en tant que traiteur : coordonnées et adresse du client uniquement
  // pour les propositions acceptées (prénom + initiale et ville sinon).
  return {
    ...profile,
    traiteurs: profile.traiteurs.map((traiteur) => ({
      ...traiteur,
      proposals: traiteur.proposals.map(hideClientDetailsUntilAccepted),
    })),
  };
};

export const updateCommandeTraiteurStatus = async (
  id: string,
  statut: string,
  message_traiteur?: string,
  currentUserId?: string,
  isAdmin?: boolean,
) => {
  return await db.$transaction(async (tx) => {
    const existing = await tx.commandeTraiteur.findUnique({
      where: { id },
      include: {
        traiteur: true,
      },
    });

    if (!existing) {
      throw new Error("Commande traiteur introuvable");
    }

    // Sécurité Authorization : seul le traiteur concerné ou l'admin peut accepter/refuser
    if (!isAdmin && existing.traiteur?.user_id !== currentUserId) {
      throw new Error("Accès refusé. Vous n'êtes pas le traiteur assigné à cette commande.");
    }

    // Une commande annulée par le client ou refusée (devis décliné) est clôturée définitivement
    if (
      existing.statut === COMMANDE_TRAITEUR_STATUS.ANNULEE ||
      existing.statut === COMMANDE_TRAITEUR_STATUS.REFUSEE
    ) {
      throw new Error("Cette commande est clôturée et ne peut plus changer de statut.");
    }

    // Statut déjà en place (double clic, relance) : réponse identique, sans nouvelle notification
    if (existing.statut === statut) {
      return await tx.commandeTraiteur.findUniqueOrThrow({
        where: { id },
        include: { client: { select: CLIENT_CONTACT_SELECT }, traiteur: true },
      });
    }

    if (!allowedCommandeTraiteurTargets(existing.statut, existing.devis_status, Boolean(isAdmin)).includes(statut)) {
      throw transitionError(existing.statut, statut);
    }

    // Mise à jour conditionnelle : échoue si le client a annulé ou si le devis a changé entre-temps
    const changed = await tx.commandeTraiteur.updateMany({
      where: { id, statut: existing.statut, devis_status: existing.devis_status },
      data: {
        statut,
        message_traiteur: message_traiteur || null,
      },
    });
    if (changed.count !== 1) {
      throw new HttpError(409, CONCURRENT_UPDATE_MESSAGE);
    }

    const commande = await tx.commandeTraiteur.findUniqueOrThrow({
      where: { id },
      include: {
        client: { select: CLIENT_CONTACT_SELECT },
        traiteur: true,
      },
    });

    if (commande.client_id) {
      const isAccepted = statut === COMMANDE_TRAITEUR_STATUS.ACCEPTEE;
      const isCancelled = statut === COMMANDE_TRAITEUR_STATUS.ANNULEE;
      const dateStr = commande.date_evenement
        ? new Date(commande.date_evenement).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "";

      // Notification conforme au statut réellement appliqué (acceptée, refusée ou annulée)
      try {
        await tx.notification.create({
          data: {
            user_id: commande.client_id,
            type: isAccepted ? "commande_acceptee" : isCancelled ? "commande_annulee" : "commande_refusee",
            titre: isAccepted ? "Commande acceptée !" : isCancelled ? "Commande annulée" : "Commande refusée",
            message: isAccepted
              ? `Votre commande du ${dateStr} a été acceptée.`
              : isCancelled
                ? message_traiteur
                  ? `Votre commande du ${dateStr} a été annulée par l'équipe Dabari. Motif : ${message_traiteur}`
                  : `Votre commande du ${dateStr} a été annulée par l'équipe Dabari.`
                : message_traiteur
                  ? `Votre commande du ${dateStr} a été refusée. Motif : ${message_traiteur}`
                  : `Votre commande du ${dateStr} a été refusée.`,
            data: { commande_id: id },
          },
        });
      } catch (notifErr) {
        console.error("Erreur notification client:", notifErr);
      }

      // E-mail uniquement pour l'acceptation et le refus (pas de modèle pour l'annulation)
      if (commande.client?.email && !isCancelled) {
        sendOrderNotificationToClientMail({
          clientEmail: commande.client.email,
          clientName: commande.client.full_name || "Client",
          traiteurName: commande.traiteur?.name || "Traiteur",
          traiteurWhatsapp: commande.traiteur?.whatsapp || undefined,
          status: isAccepted ? "ACCEPTÉE" : "REFUSÉE",
          details: `Événement prévu le ${dateStr} pour ${commande.nb_personnes || 1} personne(s).`,
          messageTraiteur: message_traiteur,
        }).catch((err) => console.error("Erreur envoi email client:", err));
      }
    }

    // Marquer les notifications non lues du traiteur concernant cette commande comme lues
    if (existing.traiteur?.user_id) {
      try {
        const notifs = await tx.notification.findMany({
          where: {
            user_id: existing.traiteur.user_id,
            is_read: false,
          },
          take: 50,
        });
        const notifIds = notifs
          .filter((n) => {
            const d = n.data as any;
            return d && (d.commande_id === id || d.id === id);
          })
          .map((n) => n.id);
        if (notifIds.length > 0) {
          await tx.notification.updateMany({
            where: { id: { in: notifIds } },
            data: { is_read: true },
          });
        }
      } catch (err) {
        console.error("Erreur marquage notification traiteur lue:", err);
      }
    }

    return commande;
  });
};

export const updateOrderPlatStatus = async (
  id: string,
  status: string,
  message?: string,
  currentUserId?: string,
  isAdmin?: boolean,
) => {
  return await db.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { id },
      include: {
        traiteur: true,
      },
    });

    if (!existing) {
      throw new Error("Commande de plats introuvable");
    }

    // Sécurité Authorization : seul le traiteur concerné ou l'admin peut modifier le statut
    if (!isAdmin && existing.traiteur?.user_id !== currentUserId) {
      throw new Error("Accès refusé. Vous n'êtes pas le traiteur assigné à cette commande.");
    }

    if (
      existing.status === ORDER_PLAT_STATUS.CANCELLED ||
      existing.status === ORDER_PLAT_STATUS.REJECTED
    ) {
      throw new Error("Cette commande est clôturée et ne peut plus changer de statut.");
    }

    const orderInclude = {
      client: { select: CLIENT_CONTACT_SELECT },
      traiteur: true,
      order_items: {
        include: {
          dish: true,
        },
      },
    } as const;

    // Statut déjà en place (double clic, relance) : réponse identique, sans nouvelle notification
    if (existing.status === status) {
      return await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    }

    if (!allowedOrderPlatTargets(existing.status, Boolean(isAdmin)).includes(status)) {
      throw transitionError(existing.status, status);
    }

    // Mise à jour conditionnelle : échoue si le client a annulé ou modifié la commande entre-temps
    const changed = await tx.order.updateMany({
      where: { id, status: existing.status },
      data: {
        status,
        notes: message?.trim() ? message.trim() : undefined,
      },
    });
    if (changed.count !== 1) {
      throw new HttpError(409, CONCURRENT_UPDATE_MESSAGE);
    }

    const order = await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });

    if (order.client_id) {
      const isAccepted = status === ORDER_PLAT_STATUS.ACCEPTED;
      const isCancelled = status === ORDER_PLAT_STATUS.CANCELLED;
      try {
        await tx.notification.create({
          data: {
            user_id: order.client_id,
            type: isAccepted ? "order_acceptee" : isCancelled ? "order_annulee" : "order_refusee",
            titre: isAccepted ? "Commande acceptée !" : isCancelled ? "Commande annulée" : "Commande refusée",
            message: isAccepted
              ? message?.trim()
                ? `Le traiteur a accepté votre commande de plats ! Note : ${message.trim()}`
                : "Le traiteur a accepté votre commande de plats !"
              : isCancelled
                ? message?.trim()
                  ? `Votre commande de plats a été annulée par l'équipe Dabari. Motif : ${message.trim()}`
                  : "Votre commande de plats a été annulée par l'équipe Dabari."
                : message?.trim()
                  ? `Le traiteur ne peut malheureusement pas honorer votre commande. Motif : ${message.trim()}`
                  : "Le traiteur ne peut malheureusement pas honorer votre commande.",
            data: { order_id: id },
          },
        });
      } catch (notifErr) {
        console.error("Erreur notification commande plat:", notifErr);
      }

      if (order.client?.email && !isCancelled) {
        const dishSummary = order.order_items
          .map(
            (item) =>
              `- ${item.dish?.name || "Plat"} x${item.quantity} (${(
                Number(item.unit_price) * item.quantity
              ).toFixed(2)} €)`,
          )
          .join("\n");

        sendOrderNotificationToClientMail({
          clientEmail: order.client.email,
          clientName: order.client.full_name || "Client",
          traiteurName: order.traiteur?.name || "Traiteur",
          traiteurWhatsapp: order.traiteur?.whatsapp || undefined,
          status: isAccepted ? "ACCEPTÉE" : "REFUSÉE",
          details: dishSummary || "Plats commandés sur la carte du traiteur",
          totalAmount: order.total_amount
            ? Number(order.total_amount)
            : undefined,
        }).catch((err) => console.error("Erreur envoi email client:", err));
      }
    }

    // Marquer les notifications non lues du traiteur concernant cette commande de plats comme lues
    if (existing.traiteur?.user_id) {
      try {
        const notifs = await tx.notification.findMany({
          where: {
            user_id: existing.traiteur.user_id,
            is_read: false,
          },
          take: 50,
        });
        const notifIds = notifs
          .filter((n) => {
            const d = n.data as any;
            return d && (d.order_id === id || d.id === id);
          })
          .map((n) => n.id);
        if (notifIds.length > 0) {
          await tx.notification.updateMany({
            where: { id: { in: notifIds } },
            data: { is_read: true },
          });
        }
      } catch (err) {
        console.error("Erreur marquage notification plat traiteur lue:", err);
      }
    }

    return order;
  });
};

export const updateGpRequestStatus = async (
  id: string,
  status: string,
  message?: string,
  currentUserId?: string,
  isAdmin?: boolean,
) => {
  return await db.$transaction(async (tx) => {
    const oldRequest = await tx.gpRequest.findUnique({
      where: { id },
      include: {
        listing: true,
      },
    });

    if (!oldRequest) {
      throw new Error("Demande GP introuvable");
    }

    // Sécurité Authorization : seul le GP propriétaire de l'annonce ou l'admin peut modifier le statut
    if (!isAdmin && oldRequest.listing?.gp_id !== currentUserId) {
      throw new Error("Accès refusé. Vous n'êtes pas le transporteur de cette annonce.");
    }

    // Statuts finaux : une demande annulée, refusée ou livrée ne peut plus être relancée
    // (sinon les kilos recrédités lors de l'annulation seraient comptés deux fois).
    if (GP_CLOSED_STATUSES.includes(oldRequest.status)) {
      throw new Error("Cette demande est clôturée et ne peut plus changer de statut.");
    }

    const requestInclude = {
      sender: { select: CLIENT_CONTACT_SELECT },
      listing: {
        include: {
          gp: { select: CLIENT_CONTACT_SELECT },
        },
      },
    } as const;

    // Statut déjà en place (double clic, relance) : réponse identique, sans nouvelle notification
    if (oldRequest.status === status) {
      return await tx.gpRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });
    }

    // Progression étape par étape (pas de saut de « en attente » à « livré »)
    if (!allowedGpRequestTargets(oldRequest.status, Boolean(isAdmin)).includes(status)) {
      throw transitionError(oldRequest.status, status);
    }

    // Mise à jour conditionnelle AVANT de recréditer les kilos : de deux changements concurrents
    // (annulation du client, refus du GP...), un seul passe et les kilos ne sont rendus qu'une fois.
    const changed = await tx.gpRequest.updateMany({
      where: { id, status: oldRequest.status },
      data: {
        status,
        notes: message?.trim() ? message.trim() : undefined,
      },
    });
    if (changed.count !== 1) {
      throw new HttpError(409, "Cette demande a été modifiée entre-temps : actualisez la page puis réessayez.");
    }

    const request = await tx.gpRequest.findUniqueOrThrow({ where: { id }, include: requestInclude });

    // Si la demande est rejetée/annulée, réincrémenter les kilos disponibles
    // (l'ancien statut n'était pas final : garanti par la table des transitions)
    const isCancelledOrRefused =
      status === GP_REQUEST_STATUS.REJECTED ||
      status === GP_REQUEST_STATUS.REFUSED ||
      status === GP_REQUEST_STATUS.CANCELLED;

    if (isCancelledOrRefused && request.listing_id && request.weight_kg) {
      await tx.gpListing.update({
        where: { id: request.listing_id },
        data: {
          available_kg: {
            increment: request.weight_kg,
          },
        },
      });
    }

    if (request.sender_id) {
      let notifType = "gp_status";
      let notifTitre = "Mise à jour de votre colis GP";
      let notifMsg = `Statut de votre colis mis à jour : ${status}`;

      if (status === GP_REQUEST_STATUS.ACCEPTED) {
        notifType = "gp_acceptee";
        notifTitre = "Demande GP acceptée !";
        notifMsg = message?.trim()
          ? `Le GP a accepté votre demande de transport. Note : ${message.trim()}`
          : "Le GP a accepté votre demande de transport. Vous pouvez convenir du dépôt du colis.";
      } else if (status === GP_REQUEST_STATUS.COLIS_RECU) {
        notifType = "gp_colis_recu";
        notifTitre = "Colis réceptionné !";
        notifMsg =
          "Votre transporteur GP a bien récupéré et vérifié votre colis.";
      } else if (status === GP_REQUEST_STATUS.EN_ACHEMINEMENT) {
        notifType = "gp_acheminement";
        notifTitre = "Colis en cours d'acheminement !";
        notifMsg =
          "Votre colis est en transit / en vol vers le pays de destination.";
      } else if (status === GP_REQUEST_STATUS.ARRIVE) {
        notifType = "gp_arrive";
        notifTitre = "Colis arrivé à destination !";
        notifMsg =
          "Votre transporteur est arrivé. Le colis est prêt pour la remise ou le retrait.";
      } else if (status === GP_REQUEST_STATUS.LIVRE) {
        notifType = "gp_livre";
        notifTitre = "Colis livré et récupéré !";
        notifMsg =
          "Votre colis a été remis au destinataire. La mission de transport est terminée.";
      } else if (
        status === GP_REQUEST_STATUS.REJECTED ||
        status === GP_REQUEST_STATUS.REFUSED
      ) {
        notifType = "gp_refusee";
        notifTitre = "Demande GP refusée";
        notifMsg = message
          ? `Le GP a refusé la demande. Motif : ${message}`
          : "Le GP a refusé votre demande de transport.";
      } else if (status === GP_REQUEST_STATUS.CANCELLED) {
        notifType = "gp_annulee";
        notifTitre = "Demande GP annulée";
        notifMsg = message?.trim()
          ? `Votre demande de transport a été annulée par l'équipe Dabari. Motif : ${message.trim()}`
          : "Votre demande de transport a été annulée par l'équipe Dabari.";
      }

      try {
        await tx.notification.create({
          data: {
            user_id: request.sender_id,
            type: notifType,
            titre: notifTitre,
            message: notifMsg,
            data: { request_id: id, status },
          },
        });
      } catch (notifErr) {
        console.error("Erreur notification GP statut:", notifErr);
      }

      // E-mail seulement pour l'acceptation et le refus : les étapes de suivi (colis reçu,
      // acheminement...) et l'annulation ne sont plus annoncées comme une « demande acceptée ».
      const emailStatus: "ACCEPTÉE" | "REFUSÉE" | null =
        status === GP_REQUEST_STATUS.ACCEPTED
          ? "ACCEPTÉE"
          : status === GP_REQUEST_STATUS.REJECTED || status === GP_REQUEST_STATUS.REFUSED
            ? "REFUSÉE"
            : null;
      if (request.sender?.email && emailStatus) {
        sendGpRequestStatusToSenderMail({
          senderEmail: request.sender.email,
          senderName: request.sender.full_name || "Expéditeur",
          gpName: request.listing?.gp?.full_name || "GP Transporteur",
          gpPhone: request.listing?.gp?.phone || undefined,
          status: emailStatus,
          departureCity:
            request.departure_city ||
            request.listing?.departure_city ||
            undefined,
          arrivalCity:
            request.arrival_city || request.listing?.arrival_city || undefined,
          weightKg: request.weight_kg ? Number(request.weight_kg) : undefined,
          totalAmount: request.total_amount
            ? Number(request.total_amount)
            : undefined,
          messageGp: message,
        }).catch((err) => console.error("Erreur e-mail expéditeur:", err));
      }
    }

    // Marquer les notifications non lues du GP concernant cette demande comme lues
    if (oldRequest.listing?.gp_id) {
      try {
        const notifs = await tx.notification.findMany({
          where: {
            user_id: oldRequest.listing.gp_id,
            is_read: false,
          },
          take: 50,
        });
        const notifIds = notifs
          .filter((n) => {
            const d = n.data as any;
            return d && (d.request_id === id || d.id === id);
          })
          .map((n) => n.id);
        if (notifIds.length > 0) {
          await tx.notification.updateMany({
            where: { id: { in: notifIds } },
            data: { is_read: true },
          });
        }
      } catch (err) {
        console.error("Erreur marquage notification GP lue:", err);
      }
    }

    return request;
  });
};

export const updateClientCommandeTraiteur = async (
  id: string,
  client_id: string,
  data: {
    date_evenement?: string;
    nb_personnes?: number;
    adresse?: string;
    type_evenement?: string;
    notes?: string;
  },
) => {
  const existing = await db.commandeTraiteur.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("Commande traiteur introuvable");
  }

  if (existing.client_id !== client_id) {
    throw new Error("Vous n'êtes pas autorisé à modifier cette commande");
  }

  if (existing.statut !== COMMANDE_TRAITEUR_STATUS.EN_ATTENTE) {
    throw new Error(
      "Cette commande ne peut plus être modifiée car elle a déjà été confirmée ou traitée.",
    );
  }

  // Le devis émis porte sur la demande telle qu'elle a été lue par le traiteur : la modifier
  // rendrait le montant (et une éventuelle signature) incohérents.
  if (isDevisIssued(existing)) {
    throw DEVIS_ALREADY_ISSUED_ERROR();
  }

  const isTooLong = (value: unknown, max: number) =>
    value !== undefined && value !== null && (typeof value !== "string" || value.length > max);
  if (
    isTooLong(data.adresse, 300) ||
    isTooLong(data.type_evenement, 100) ||
    isTooLong(data.notes, 3000)
  ) {
    throw new Error("Certains champs sont invalides ou trop longs.");
  }

  if (data.nb_personnes !== undefined) {
    const nb = Number(data.nb_personnes);
    if (!Number.isInteger(nb) || nb <= 0 || nb > 10000) {
      throw new Error("Le nombre de personnes doit être un nombre valide entre 1 et 10 000.");
    }
  }

  if (data.date_evenement) {
    const eventDate = new Date(data.date_evenement);
    if (isNaN(eventDate.getTime())) {
      throw new Error("Date d'événement invalide.");
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate < today) {
      throw new Error(
        "La date de l'événement ne peut pas être antérieure à aujourd'hui.",
      );
    }
  }

  // Mise à jour conditionnelle : échoue si le traiteur a accepté, refusé ou chiffré un devis
  // entre la lecture et l'écriture (la modification ne doit jamais écraser un devis émis).
  const changed = await db.commandeTraiteur.updateMany({
    where: {
      id,
      client_id,
      statut: COMMANDE_TRAITEUR_STATUS.EN_ATTENTE,
      prix_devis: null,
      OR: [{ devis_status: null }, { devis_status: DEVIS_STATUS.DRAFT }],
    },
    data: {
      date_evenement: data.date_evenement
        ? new Date(data.date_evenement)
        : undefined,
      nb_personnes:
        data.nb_personnes !== undefined ? Number(data.nb_personnes) : undefined,
      adresse: data.adresse?.trim() ? data.adresse.trim() : undefined,
      type_evenement:
        data.type_evenement !== undefined
          ? data.type_evenement?.trim()
          : undefined,
      notes: data.notes !== undefined ? data.notes?.trim() : undefined,
    },
  });

  if (changed.count !== 1) {
    const current = await db.commandeTraiteur.findUnique({
      where: { id },
      select: { prix_devis: true, devis_status: true },
    });
    if (current && isDevisIssued(current)) {
      throw DEVIS_ALREADY_ISSUED_ERROR();
    }
    throw new HttpError(
      409,
      "Cette commande ne peut plus être modifiée car elle a déjà été confirmée ou traitée.",
    );
  }

  return await db.commandeTraiteur.findUniqueOrThrow({
    where: { id },
    include: {
      traiteur: true,
      client: { select: CLIENT_CONTACT_SELECT },
    },
  });
};

export const updateClientOrderPlat = async (
  id: string,
  client_id: string,
  data: {
    delivery_type?: string;
    delivery_address?: string;
    notes?: string;
    items?: { dish_id: string; quantity: number }[];
  },
) => {
  return await db.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { id },
      include: {
        order_items: true,
      },
    });

    if (!existing) {
      throw new Error("Commande de plats introuvable");
    }

    if (existing.client_id !== client_id) {
      throw new Error("Vous n'êtes pas autorisé à modifier cette commande");
    }

    if (existing.status !== ORDER_PLAT_STATUS.PENDING) {
      throw new Error(
        "Cette commande ne peut plus être modifiée car elle a déjà été confirmée ou traitée.",
      );
    }

    // Mise à jour conditionnelle sans effet : verrouille la commande tant qu'elle est en attente.
    // Une acceptation ou un refus concurrent du traiteur attend la fin de cette modification, ou
    // l'a déjà emporté (aucune ligne mise à jour) : la commande n'est alors plus modifiable.
    const claimed = await tx.order.updateMany({
      where: { id, client_id, status: ORDER_PLAT_STATUS.PENDING },
      data: { status: ORDER_PLAT_STATUS.PENDING },
    });
    if (claimed.count !== 1) {
      throw new HttpError(
        409,
        "Cette commande ne peut plus être modifiée car elle a déjà été confirmée ou traitée.",
      );
    }

    if (
      data.delivery_type !== undefined &&
      data.delivery_type !== "delivery" &&
      data.delivery_type !== "pickup"
    ) {
      throw new Error("Mode de livraison invalide.");
    }

    if (
      (data.delivery_address !== undefined &&
        (typeof data.delivery_address !== "string" || data.delivery_address.length > 300)) ||
      (data.notes !== undefined && (typeof data.notes !== "string" || data.notes.length > 2000))
    ) {
      throw new Error("L'adresse (300 caractères max) ou les notes (2 000 caractères max) sont invalides.");
    }

    let newTotalAmount = existing.total_amount;

    if (data.items !== undefined && (!Array.isArray(data.items) || data.items.length > 100)) {
      throw new Error("Liste de plats invalide.");
    }

    if (data.items && data.items.length > 0) {
      let sum = 0;
      const validItems: {
        dish_id: string;
        quantity: number;
        unit_price: number;
      }[] = [];
      const seenDishIds = new Set<string>();

      for (const item of data.items) {
        const quantity = Number(item?.quantity);
        if (!item || !isValidUUID(item.dish_id) || !Number.isInteger(quantity) || quantity < 0 || quantity > 1000) {
          throw new Error("Plat ou quantité invalide dans la commande.");
        }
        if (seenDishIds.has(item.dish_id)) {
          throw new Error("Un même plat ne peut apparaître qu'une fois dans la commande.");
        }
        seenDishIds.add(item.dish_id);

        if (quantity > 0) {
          const dish = await tx.dish.findUnique({
            where: { id: item.dish_id },
          });
          // Le plat doit appartenir au traiteur de la commande (pas de mélange entre traiteurs)
          if (!dish || dish.is_archived || !dish.is_available || dish.traiteur_id !== existing.traiteur_id) {
            throw new Error(`Plat indisponible ou introuvable (ID: ${item.dish_id})`);
          }
          const unitPrice = Number(dish.price);
          sum += unitPrice * quantity;
          validItems.push({
            dish_id: dish.id,
            quantity,
            unit_price: unitPrice,
          });
        }
      }

      if (validItems.length === 0) {
        throw new Error("La commande doit comporter au moins un plat.");
      }

      await tx.orderItem.deleteMany({
        where: { order_id: id },
      });

      for (const vItem of validItems) {
        await tx.orderItem.create({
          data: {
            order_id: id,
            dish_id: vItem.dish_id,
            quantity: vItem.quantity,
            unit_price: vItem.unit_price,
          },
        });
      }

      newTotalAmount = sum as any;
    }

    return await tx.order.update({
      where: { id },
      data: {
        delivery_type:
          data.delivery_type !== undefined ? data.delivery_type : undefined,
        delivery_address:
          data.delivery_address !== undefined
            ? data.delivery_address.trim()
            : undefined,
        notes: data.notes !== undefined ? data.notes.trim() : undefined,
        total_amount: newTotalAmount !== undefined ? newTotalAmount : undefined,
      },
      include: {
        traiteur: true,
        order_items: {
          include: {
            dish: true,
          },
        },
      },
    });
  });
};

export const updateClientGpRequest = async (
  id: string,
  sender_id: string,
  data: UpdateClientGpRequestInput,
) => {
  return await db.$transaction(async (tx) => {
    const existing = await tx.gpRequest.findUnique({
      where: { id },
      include: {
        listing: true,
      },
    });

    if (!existing) {
      throw new Error("Demande GP introuvable");
    }

    if (existing.sender_id !== sender_id) {
      throw new Error("Vous n'êtes pas autorisé à modifier cette demande");
    }

    if (existing.status !== GP_REQUEST_STATUS.PENDING) {
      throw new Error(
        "Cette demande ne peut plus être modifiée car elle a déjà été confirmée ou traitée.",
      );
    }

    // Verrou sur la demande tant qu'elle est en attente (même principe que les commandes de plats) :
    // un changement de statut concurrent du GP ne peut pas s'intercaler dans l'ajustement des kilos.
    const claimed = await tx.gpRequest.updateMany({
      where: { id, sender_id, status: GP_REQUEST_STATUS.PENDING },
      data: { status: GP_REQUEST_STATUS.PENDING },
    });
    if (claimed.count !== 1) {
      throw new HttpError(
        409,
        "Cette demande ne peut plus être modifiée car elle a déjà été confirmée ou traitée.",
      );
    }

    const isInvalidText = (value: unknown, max: number) =>
      value !== undefined && value !== null && (typeof value !== "string" || value.length > max);
    if (
      isInvalidText(data.content_desc, 1000) ||
      isInvalidText(data.notes, 2000) ||
      isInvalidText(data.recipient_name, 120) ||
      isInvalidText(data.recipient_phone, 30)
    ) {
      throw new Error("Certains champs sont invalides ou trop longs.");
    }

    let newWeight = existing.weight_kg;
    let newTotalAmount = existing.total_amount;

    if (data.weight_kg !== undefined) {
      const updatedWeight = Number(data.weight_kg);
      if (isNaN(updatedWeight) || updatedWeight < 0.5 || updatedWeight > 500) {
        throw new Error("Le poids du colis doit être compris entre 0,5 kg et 500 kg.");
      }
      const oldWeight = Number(existing.weight_kg || 0);
      const diff = updatedWeight - oldWeight;

      if (existing.listing_id && existing.listing) {
        const available = Number(existing.listing.available_kg || 0);
        const maxAllowed = Number((oldWeight + available).toFixed(1));
        const capacityError = `Le transporteur n'a que ${available} kg restants de disponible. Le poids maximum autorisé pour votre colis est de ${maxAllowed} kg.`;
        if (diff > 0 && diff > available) {
          throw new Error(capacityError);
        }

        if (diff > 0) {
          // Décrémentation conditionnelle atomique : pas de survente en cas de requêtes concurrentes
          const reserved = await tx.gpListing.updateMany({
            where: { id: existing.listing_id, available_kg: { gte: diff } },
            data: { available_kg: { decrement: diff } },
          });
          if (reserved.count === 0) {
            throw new Error(capacityError);
          }
        } else if (diff < 0) {
          await tx.gpListing.update({
            where: { id: existing.listing_id },
            data: { available_kg: { increment: -diff } },
          });
        }

        const pricePerKg = Number(existing.listing.price_per_kg || 0);
        newTotalAmount = (updatedWeight * pricePerKg) as any;
      }
      newWeight = updatedWeight as any;
    }

    if (data.content_desc !== undefined && !data.content_desc.trim()) {
      throw new Error("La description du contenu est obligatoire.");
    }

    if (data.declared_value !== undefined) {
      const parsedVal = Number(data.declared_value);
      if (isNaN(parsedVal) || parsedVal < 0) {
        throw new Error("La valeur déclarée est obligatoire et doit être supérieure ou égale à 0.");
      }
    }

    return await tx.gpRequest.update({
      where: { id },
      data: {
        weight_kg: newWeight,
        total_amount: newTotalAmount,
        content_desc:
          data.content_desc !== undefined ? data.content_desc.trim() : undefined,
        declared_value:
          data.declared_value !== undefined ? Number(data.declared_value) : undefined,
        notes: data.notes !== undefined ? data.notes.trim() : undefined,
        recipient_name:
          data.recipient_name !== undefined ? (data.recipient_name?.trim() || null) : undefined,
        recipient_phone:
          data.recipient_phone !== undefined ? (data.recipient_phone?.trim() || null) : undefined,
      },
      include: {
        listing: true,
      },
    });
  });
};

export const cancelClientOrder = async (
  type: "traiteur" | "order" | "gp",
  id: string,
  user_id: string,
) => {
  return await db.$transaction(async (tx) => {
    if (type === "traiteur") {
      const commande = await tx.commandeTraiteur.findUnique({
        where: { id },
        include: {
          traiteur: { include: { profile: true } },
          client: true,
        },
      });
      if (!commande) throw new Error("Commande introuvable");
      if (commande.client_id !== user_id)
        throw new Error("Action non autorisée");
      if (commande.statut !== COMMANDE_TRAITEUR_STATUS.EN_ATTENTE)
        throw new Error("Impossible d'annuler une commande déjà traitée");

      // Conditionnelle : si le traiteur vient d'accepter ou de refuser, l'annulation échoue
      const cancelled = await tx.commandeTraiteur.updateMany({
        where: { id, client_id: user_id, statut: COMMANDE_TRAITEUR_STATUS.EN_ATTENTE },
        data: { statut: COMMANDE_TRAITEUR_STATUS.ANNULEE },
      });
      if (cancelled.count !== 1) {
        throw new HttpError(409, "Impossible d'annuler : le traiteur vient de traiter cette commande. Actualisez la page.");
      }
      const updated = await tx.commandeTraiteur.findUniqueOrThrow({ where: { id } });

      if (commande.traiteur?.user_id) {
        try {
          await tx.notification.create({
            data: {
              user_id: commande.traiteur.user_id,
              type: "commande_annulee",
              titre: "Commande annulée par le client",
              message: `Le client ${commande.client?.full_name || ""} a annulé sa commande pour le ${new Date(commande.date_evenement).toLocaleDateString("fr-FR")}.`,
              data: { commande_id: id },
            },
          });
        } catch (notifErr) {
          console.error("Erreur notification annulation commande:", notifErr);
        }
      }

      if (commande.traiteur?.profile?.email) {
        sendOrderCancelledToTraiteurMail({
          traiteurEmail: commande.traiteur.profile.email,
          traiteurName: commande.traiteur.name || "Chef Traiteur",
          clientName: commande.client?.full_name || "Client",
          orderType: "DEVIS",
          dateEvenement: new Date(commande.date_evenement).toLocaleDateString("fr-FR"),
          details: `Type d'événement: ${commande.type_evenement || "Non spécifié"}\nNombre de personnes: ${commande.nb_personnes}`,
        }).catch((err) => console.error("Erreur email annulation commande traiteur:", err));
      }

      return updated;
    } else if (type === "order") {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          traiteur: { include: { profile: true } },
          client: true,
          order_items: { include: { dish: true } },
        },
      });
      if (!order) throw new Error("Commande introuvable");
      if (order.client_id !== user_id) throw new Error("Action non autorisée");
      if (order.status !== ORDER_PLAT_STATUS.PENDING)
        throw new Error("Impossible d'annuler une commande déjà traitée");

      // Conditionnelle : si le traiteur vient d'accepter ou de refuser, l'annulation échoue
      const cancelled = await tx.order.updateMany({
        where: { id, client_id: user_id, status: ORDER_PLAT_STATUS.PENDING },
        data: { status: ORDER_PLAT_STATUS.CANCELLED },
      });
      if (cancelled.count !== 1) {
        throw new HttpError(409, "Impossible d'annuler : le traiteur vient de traiter cette commande. Actualisez la page.");
      }
      const updated = await tx.order.findUniqueOrThrow({ where: { id } });

      if (order.traiteur?.user_id) {
        try {
          await tx.notification.create({
            data: {
              user_id: order.traiteur.user_id,
              type: "order_annulee",
              titre: "Commande de plats annulée",
              message: `Le client ${order.client?.full_name || ""} a annulé sa commande de plats (${Number(order.total_amount).toFixed(2)} €).`,
              data: { order_id: id },
            },
          });
        } catch (notifErr) {
          console.error("Erreur notification annulation plat:", notifErr);
        }
      }

      if (order.traiteur?.profile?.email) {
        sendOrderCancelledToTraiteurMail({
          traiteurEmail: order.traiteur.profile.email,
          traiteurName: order.traiteur.name || "Chef Traiteur",
          clientName: order.client?.full_name || "Client",
          orderType: "PLAT",
          totalAmount: order.total_amount ? Number(order.total_amount) : undefined,
          details: `Commande de plats (${order.order_items.length} produit(s))`,
        }).catch((err) => console.error("Erreur email annulation commande plats:", err));
      }

      return updated;
    } else if (type === "gp") {
      const request = await tx.gpRequest.findUnique({
        where: { id },
        include: {
          listing: { include: { gp: true } },
          sender: true,
        },
      });
      if (!request) throw new Error("Demande GP introuvable");
      if (request.sender_id !== user_id)
        throw new Error("Action non autorisée");
      if (request.status !== GP_REQUEST_STATUS.PENDING)
        throw new Error("Impossible d'annuler une demande déjà traitée");

      // Statut d'abord, de façon conditionnelle : un double clic ou un refus simultané du GP ne
      // peut pas recréditer deux fois les kilos ; l'incrément n'a lieu que si l'annulation passe.
      const cancelled = await tx.gpRequest.updateMany({
        where: { id, sender_id: user_id, status: GP_REQUEST_STATUS.PENDING },
        data: { status: GP_REQUEST_STATUS.CANCELLED },
      });
      if (cancelled.count !== 1) {
        throw new HttpError(409, "Impossible d'annuler : cette demande vient d'être traitée. Actualisez la page.");
      }

      if (request.listing_id && request.weight_kg) {
        await tx.gpListing.update({
          where: { id: request.listing_id },
          data: {
            available_kg: {
              increment: request.weight_kg,
            },
          },
        });
      }

      const updated = await tx.gpRequest.findUniqueOrThrow({ where: { id } });

      if (request.listing?.gp_id) {
        try {
          await tx.notification.create({
            data: {
              user_id: request.listing.gp_id,
              type: "gp_demande_annulee",
              titre: "Demande de colis annulée",
              message: `L'expéditeur ${request.sender?.full_name || ""} a annulé sa demande (${request.weight_kg} kg) sur votre trajet. Vos kilos ont été recrédités.`,
              data: { request_id: id, listing_id: request.listing_id },
            },
          });
        } catch (notifErr) {
          console.error("Erreur notification annulation GP:", notifErr);
        }
      }

      if (request.listing?.gp?.email) {
        sendGpRequestCancelledToGpMail({
          gpEmail: request.listing.gp.email,
          gpName: request.listing.gp.full_name || "Transporteur GP",
          senderName: request.sender?.full_name || "Expéditeur",
          weightKg: Number(request.weight_kg),
          departureCity: request.listing.departure_city,
          arrivalCity: request.listing.arrival_city,
        }).catch((err) => console.error("Erreur email annulation GP:", err));
      }

      return updated;
    }
    throw new Error("Type de commande inconnu");
  });
};

export const getSingleOrderPlat = async (id: string, user_id?: string) => {
  return await db.order.findFirst({
    where: user_id
      ? {
          id,
          OR: [{ client_id: user_id }, { traiteur: { user_id } }],
        }
      : { id },
    include: {
      traiteur: {
        include: {
          dishes: {
            where: { is_archived: false, is_available: true },
          },
        },
      },
      order_items: {
        include: { dish: true },
      },
    },
  });
};

export const getSingleCommandeTraiteur = async (
  id: string,
  user_id?: string,
) => {
  return await db.commandeTraiteur.findFirst({
    where: user_id
      ? {
          id,
          OR: [{ client_id: user_id }, { traiteur: { user_id } }],
        }
      : { id },
    include: { traiteur: true },
  });
};

export const getSingleGpRequest = async (id: string, user_id?: string) => {
  return await db.gpRequest.findFirst({
    where: user_id
      ? {
          id,
          OR: [{ sender_id: user_id }, { listing: { gp_id: user_id } }],
        }
      : { id },
    include: { listing: true },
  });
};

export const updateGpRequestDelay = async (
  id: string,
  data: GpDelayInput,
  userId?: string,
  isAdmin?: boolean,
) => {
  return await db.$transaction(async (tx) => {
    const existing = await tx.gpRequest.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            gp: true,
          },
        },
        sender: true,
      },
    });

    if (!existing) {
      throw new Error("Demande GP introuvable");
    }

    // Sécurité : une demande dont l'annonce ou le transporteur a disparu n'est modifiable que par un admin
    if (!isAdmin && (!existing.listing?.gp_id || existing.listing.gp_id !== userId)) {
      throw new Error("Vous n'êtes pas autorisé à modifier cette demande");
    }

    const newArrivalDate = new Date(data.arrival_date);
    if (isNaN(newArrivalDate.getTime())) {
      throw new Error("Date d'arrivée invalide.");
    }

    const updatedRequest = await tx.gpRequest.update({
      where: { id },
      data: {
        arrival_date: newArrivalDate,
        is_delayed: true,
        delay_reason:
          data.delay_reason || "Retard d'acheminement signalé par le transporteur",
      },
      include: {
        sender: { select: CLIENT_CONTACT_SELECT },
        listing: {
          include: {
            gp: { select: CLIENT_CONTACT_SELECT },
          },
        },
      },
    });

    if (existing.listing_id) {
      await tx.gpListing.update({
        where: { id: existing.listing_id },
        data: {
          arrival_date: newArrivalDate,
          is_delayed: true,
          delay_reason:
            data.delay_reason || "Retard d'acheminement signalé",
        },
      });
    }

    if (existing.sender_id) {
      const dateFormatted = newArrivalDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      try {
        await tx.notification.create({
          data: {
            user_id: existing.sender_id,
            type: "gp_retard",
            titre: "Retard signalé sur votre colis GP",
            message: `Le transporteur a signalé un décalage. Nouvelle date d'arrivée estimée : ${dateFormatted}.${
              data.delay_reason ? ` Motif : ${data.delay_reason}` : ""
            }`,
            data: {
              request_id: id,
              new_arrival_date: data.arrival_date,
              delay_reason: data.delay_reason,
            },
          },
        });
      } catch (notifErr) {
        console.error("Erreur notification retard GP:", notifErr);
      }

      if (existing.sender?.email) {
        sendGpDelayNotificationMail({
          senderEmail: existing.sender.email,
          senderName: existing.sender.full_name || "Expéditeur",
          gpName: existing.listing?.gp?.full_name || "Transporteur GP",
          newArrivalDate: dateFormatted,
          delayReason: data.delay_reason,
          departureCity: existing.listing?.departure_city,
          arrivalCity: existing.listing?.arrival_city,
        }).catch((err) => console.error("Erreur email retard GP colis:", err));
      }
    }

    return updatedRequest;
  });
};

export const updateGpListingDelay = async (
  listingId: string,
  data: GpDelayInput,
  gpId?: string,
  isAdmin?: boolean,
) => {
  return await db.$transaction(async (tx) => {
    const listing = await tx.gpListing.findUnique({
      where: { id: listingId },
      include: {
        gp: true,
        requests: {
          include: { sender: true },
        },
      },
    });

    if (!listing) {
      throw new Error("Annonce GP introuvable");
    }

    // Sécurité : une annonce orpheline (transporteur supprimé) n'est modifiable que par un admin
    if (!isAdmin && (!listing.gp_id || listing.gp_id !== gpId)) {
      throw new Error("Vous n'êtes pas autorisé à modifier cette annonce");
    }

    const newArrivalDate = new Date(data.arrival_date);
    if (isNaN(newArrivalDate.getTime())) {
      throw new Error("Date d'arrivée invalide.");
    }

    const updatedListing = await tx.gpListing.update({
      where: { id: listingId },
      data: {
        arrival_date: newArrivalDate,
        is_delayed: true,
        delay_reason:
          data.delay_reason || "Retard de vol / acheminement signalé",
      },
    });

    await tx.gpRequest.updateMany({
      where: { listing_id: listingId },
      data: {
        arrival_date: newArrivalDate,
        is_delayed: true,
        delay_reason:
          data.delay_reason || "Retard de vol / acheminement signalé",
      },
    });

    const dateFormatted = newArrivalDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    for (const req of listing.requests) {
      if (req.sender_id) {
        try {
          await tx.notification.create({
            data: {
              user_id: req.sender_id,
              type: "gp_retard",
              titre: "Retard signalé sur votre trajet GP",
              message: `Le transporteur a signalé un décalage. Nouvelle date d'arrivée estimée : ${dateFormatted}.${
                data.delay_reason ? ` Motif : ${data.delay_reason}` : ""
              }`,
              data: {
                request_id: req.id,
                listing_id: listingId,
                new_arrival_date: data.arrival_date,
                delay_reason: data.delay_reason,
              },
            },
          });
        } catch (notifErr) {
          console.error("Erreur notification retard listing:", notifErr);
        }

        if (req.sender?.email) {
          sendGpDelayNotificationMail({
            senderEmail: req.sender.email,
            senderName: req.sender.full_name || "Expéditeur",
            gpName: listing.gp?.full_name || "Transporteur GP",
            newArrivalDate: dateFormatted,
            delayReason: data.delay_reason,
            departureCity: listing.departure_city,
            arrivalCity: listing.arrival_city,
          }).catch((err) => console.error("Erreur email retard listing GP:", err));
        }
      }
    }

    return updatedListing;
  });
};

export const setupCommandeTraiteurDevis = async (
  commandeId: string,
  userId: string,
  isAdmin: boolean,
  data: {
    prix_devis: number;
    conditions?: DevisConditionsInput;
    auto_sign?: boolean;
    traiteur_signature?: string;
  }
) => {
  return await db.$transaction(async (tx) => {
    const commande = await tx.commandeTraiteur.findUnique({
      where: { id: commandeId },
      include: {
        traiteur: true,
        client: { select: CLIENT_CONTACT_SELECT },
      },
    });

    if (!commande) {
      throw new Error("Commande de devis introuvable.");
    }

    if (!isAdmin && commande.traiteur?.user_id !== userId) {
      throw new Error("Seul le chef traiteur en charge peut chiffrer ce devis.");
    }

    if (data.prix_devis <= 0) {
      throw new Error("Le montant du devis doit être supérieur à 0 €.");
    }

    // Un devis signé par les deux parties, refusé ou une commande close ne peut plus être re-chiffré
    if (
      commande.devis_status === DEVIS_STATUS.SIGNE_PAR_LES_DEUX ||
      commande.devis_status === DEVIS_STATUS.REFUSE ||
      commande.statut === COMMANDE_TRAITEUR_STATUS.ANNULEE ||
      commande.statut === COMMANDE_TRAITEUR_STATUS.REFUSEE
    ) {
      throw new Error("Ce devis est clôturé (signé, refusé ou annulé) et ne peut plus être modifié.");
    }

    const currentMeta = parseDevisConditionsMeta(commande.conditions_devis);
    // Un acompte déclaré réglé a été calculé sur le montant en vigueur : le devis est figé
    if (currentMeta.acompte_paye) {
      throw new HttpError(
        409,
        "Un acompte a déjà été déclaré réglé pour ce devis : il ne peut plus être re-chiffré.",
      );
    }

    // Conditions reconstruites côté serveur : du traiteur, seuls le texte, le type d'acompte et le
    // pourcentage sont repris ; le montant est recalculé et l'état du règlement vient de la base.
    const acompteType = data.conditions?.acompte_type ?? currentMeta.acompte_type ?? "optionnel";
    const pourcentage =
      acompteType === "aucun"
        ? 0
        : data.conditions?.acompte_pourcentage ??
          Math.min(currentMeta.acompte_pourcentage ?? 30, ACOMPTE_MAX_POURCENTAGE);
    const conditionsMeta: DevisConditionsMetadata = {
      texte: data.conditions?.texte ?? currentMeta.texte,
      acompte_type: acompteType,
      acompte_pourcentage: pourcentage,
      acompte_montant: acompteType === "aucun" ? 0 : Math.round(data.prix_devis * pourcentage) / 100,
      acompte_paye: currentMeta.acompte_paye,
      acompte_paye_at: currentMeta.acompte_paye_at,
      acompte_transaction_ref: currentMeta.acompte_transaction_ref,
      acompte_choix_jour_j: currentMeta.acompte_choix_jour_j,
    };

    const now = new Date();
    const shouldAutoSign = Boolean(data.auto_sign && data.traiteur_signature?.trim());

    // Mise à jour conditionnelle : échoue si le client a signé, refusé, annulé ou réglé l'acompte
    // entre la lecture et l'écriture (le nouveau chiffrage ne doit rien écraser silencieusement).
    const changed = await tx.commandeTraiteur.updateMany({
      where: {
        id: commandeId,
        statut: commande.statut,
        devis_status: commande.devis_status,
        prix_devis: commande.prix_devis,
        conditions_devis: commande.conditions_devis,
      },
      data: {
        prix_devis: data.prix_devis,
        conditions_devis: serializeDevisConditionsMeta(conditionsMeta),
        devis_status: shouldAutoSign
          ? DEVIS_STATUS.SIGNE_TRAITEUR
          : DEVIS_STATUS.EN_ATTENTE_SIGNATURES,
        client_signed_at: null,
        client_signature: null,
        traiteur_signed_at: shouldAutoSign ? now : null,
        traiteur_signature: shouldAutoSign ? data.traiteur_signature?.trim() : null,
      },
    });
    if (changed.count !== 1) {
      throw new HttpError(409, "Le devis a été modifié entre-temps : actualisez la page puis réessayez.");
    }

    const updated = await tx.commandeTraiteur.findUniqueOrThrow({
      where: { id: commandeId },
      include: {
        traiteur: true,
        client: { select: CLIENT_CONTACT_SELECT },
      },
    });

    if (commande.client_id) {
      try {
        await tx.notification.create({
          data: {
            user_id: commande.client_id,
            type: "devis_chiffre",
            titre: "Nouveau devis à examiner !",
            message: `Le chef ${commande.traiteur?.name || "traiteur"} a fixé son tarif à ${data.prix_devis} € pour votre événement.${shouldAutoSign ? " Le traiteur a d'ores et déjà signé le devis." : ""} Vous pouvez l'examiner et le signer en ligne !`,
            data: {
              commande_id: commandeId,
              prix_devis: data.prix_devis,
            },
          },
        });
      } catch (err) {
        console.error("Erreur notification devis:", err);
      }

      if (commande.client?.email) {
        sendDevisChiffreToClientMail({
          clientEmail: commande.client.email,
          clientName: commande.client.full_name || "Client",
          traiteurName: commande.traiteur?.name || "Chef Traiteur",
          prixDevis: data.prix_devis,
          dateEvenement: commande.date_evenement
            ? new Date(commande.date_evenement).toLocaleDateString("fr-FR")
            : undefined,
          shouldAutoSign,
        }).catch((err) => console.error("Erreur email devis chiffré client:", err));
      }
    }

    return updated;
  });
};

export const refuseCommandeTraiteurDevis = async (
  commandeId: string,
  userId: string,
  isAdmin: boolean,
  motif?: string,
) => {
  return await db.$transaction(async (tx) => {
    const commande = await tx.commandeTraiteur.findUnique({
      where: { id: commandeId },
      include: {
        traiteur: true,
        client: { select: CLIENT_CONTACT_SELECT },
      },
    });

    if (!commande) {
      throw new Error("Commande de devis introuvable.");
    }

    const isClient = commande.client_id === userId;
    if (!isClient && !isAdmin) {
      throw new Error("Seul le client peut décliner cette proposition de devis.");
    }

    // Un devis signé par les deux parties engage le client (pas de droit de rétractation)
    if (commande.devis_status === DEVIS_STATUS.SIGNE_PAR_LES_DEUX) {
      throw new Error("Ce devis a été signé par les deux parties et ne peut plus être décliné.");
    }
    if (
      commande.devis_status === DEVIS_STATUS.REFUSE ||
      commande.statut === COMMANDE_TRAITEUR_STATUS.ANNULEE ||
      commande.statut === COMMANDE_TRAITEUR_STATUS.REFUSEE
    ) {
      throw new Error("Ce devis est déjà clôturé.");
    }
    // Refuser le devis passerait la commande à « refusée » : ce n'est pas un moyen d'annuler une
    // commande déjà acceptée par le traiteur.
    if (commande.statut === COMMANDE_TRAITEUR_STATUS.ACCEPTEE) {
      throw new HttpError(
        409,
        "Cette commande a déjà été acceptée par le traiteur : contactez-le pour l'annuler.",
      );
    }

    // Mise à jour conditionnelle : échoue si le traiteur a accepté, re-chiffré ou signé entre-temps
    const changed = await tx.commandeTraiteur.updateMany({
      where: {
        id: commandeId,
        statut: commande.statut,
        devis_status: commande.devis_status,
        prix_devis: commande.prix_devis,
      },
      data: {
        statut: COMMANDE_TRAITEUR_STATUS.REFUSEE,
        devis_status: DEVIS_STATUS.REFUSE,
        message_traiteur: motif
          ? `Devis décliné par le client : ${motif.trim()}`
          : "Devis décliné par le client.",
      },
    });
    if (changed.count !== 1) {
      throw new HttpError(409, "Le devis a été modifié entre-temps : actualisez la page puis réessayez.");
    }

    const updated = await tx.commandeTraiteur.findUniqueOrThrow({
      where: { id: commandeId },
      include: {
        traiteur: true,
        client: { select: CLIENT_CONTACT_SELECT },
      },
    });

    if (commande.traiteur?.user_id) {
      try {
        await tx.notification.create({
          data: {
            user_id: commande.traiteur.user_id,
            type: "devis_refuse",
            titre: "Proposition de devis déclinée",
            message: `Le client ${commande.client?.full_name || "partenaire"} a décliné votre offre de devis de ${Number(commande.prix_devis || 0)} €.${motif ? ` Motif : ${motif.trim()}` : ""}`,
            data: {
              commande_id: commandeId,
              motif: motif || null,
            },
          },
        });
      } catch (err) {
        console.error("Erreur notification refus devis:", err);
      }
    }

    return updated;
  });
};

export const signCommandeTraiteurDevis = async (
  commandeId: string,
  userId: string,
  isAdmin: boolean,
  signature: string,
  expectedPrice?: number,
) => {
  return await db.$transaction(async (tx) => {
    const commande = await tx.commandeTraiteur.findUnique({
      where: { id: commandeId },
      include: {
        traiteur: { include: { profile: { select: { email: true } } } },
        client: { select: CLIENT_CONTACT_SELECT },
      },
    });

    if (!commande) {
      throw new Error("Commande de devis introuvable.");
    }

    const isClient = commande.client_id === userId;
    const isTraiteur = commande.traiteur?.user_id === userId;

    if (!isClient && !isTraiteur && !isAdmin) {
      throw new Error("Vous n'êtes pas partie prenante à ce devis.");
    }

    if (!commande.prix_devis || Number(commande.prix_devis) <= 0) {
      throw new Error("Ce devis n'a pas encore été chiffré par le traiteur.");
    }

    // Impossible de signer (et donc de réactiver) un devis refusé ou une commande close
    if (
      commande.devis_status === DEVIS_STATUS.REFUSE ||
      commande.devis_status === DEVIS_STATUS.SIGNE_PAR_LES_DEUX ||
      commande.statut === COMMANDE_TRAITEUR_STATUS.ANNULEE ||
      commande.statut === COMMANDE_TRAITEUR_STATUS.REFUSEE
    ) {
      throw new Error("Ce devis est clôturé (déjà signé, refusé ou annulé) et ne peut plus être signé.");
    }

    if (!signature || signature.trim().length === 0) {
      throw new Error("Une signature valide est requise.");
    }

    // Le signataire s'engage sur le montant qu'il a lu : s'il a changé depuis, la signature est refusée
    if (expectedPrice !== undefined && !samePrice(commande.prix_devis, expectedPrice)) {
      throw DEVIS_CHANGED_ERROR();
    }

    const now = new Date();
    let newDevisStatus: string = commande.devis_status || DEVIS_STATUS.DRAFT;
    let newStatut: string | null = commande.statut;

    const updateData: {
      client_signed_at?: Date;
      client_signature?: string;
      traiteur_signed_at?: Date;
      traiteur_signature?: string;
      devis_status?: string;
      statut?: string | null;
    } = {};

    if (isClient || (isAdmin && !isTraiteur)) {
      updateData.client_signed_at = now;
      updateData.client_signature = signature.trim();

      if (commande.traiteur_signed_at) {
        newDevisStatus = DEVIS_STATUS.SIGNE_PAR_LES_DEUX;
        newStatut = COMMANDE_TRAITEUR_STATUS.ACCEPTEE;
      } else {
        newDevisStatus = DEVIS_STATUS.SIGNE_CLIENT;
      }
    } else if (isTraiteur) {
      updateData.traiteur_signed_at = now;
      updateData.traiteur_signature = signature.trim();

      if (commande.client_signed_at) {
        newDevisStatus = DEVIS_STATUS.SIGNE_PAR_LES_DEUX;
        newStatut = COMMANDE_TRAITEUR_STATUS.ACCEPTEE;
      } else {
        newDevisStatus = DEVIS_STATUS.SIGNE_TRAITEUR;
      }
    }

    updateData.devis_status = newDevisStatus;
    updateData.statut = newStatut;

    // Mise à jour conditionnelle sur l'état lu (statut, étape de signature, montant) : un nouveau
    // chiffrage, un refus, une annulation ou la signature simultanée de l'autre partie font échouer
    // l'écriture au lieu d'être écrasés.
    const changed = await tx.commandeTraiteur.updateMany({
      where: {
        id: commandeId,
        statut: commande.statut,
        devis_status: commande.devis_status,
        prix_devis: commande.prix_devis,
      },
      data: updateData,
    });
    if (changed.count !== 1) {
      throw DEVIS_CHANGED_ERROR();
    }

    const updated = await tx.commandeTraiteur.findUniqueOrThrow({
      where: { id: commandeId },
      include: {
        traiteur: true,
        client: { select: CLIENT_CONTACT_SELECT },
      },
    });

    const otherUserId = isClient ? commande.traiteur?.user_id : commande.client_id;
    if (otherUserId) {
      try {
        const isFullySigned = newDevisStatus === DEVIS_STATUS.SIGNE_PAR_LES_DEUX;
        await tx.notification.create({
          data: {
            user_id: otherUserId,
            type: isFullySigned ? "devis_valide" : "devis_signature_requise",
            titre: isFullySigned ? "Devis 100% signé et validé !" : "Signature apposée sur le devis",
            message: isFullySigned
              ? `Le devis pour l'événement du ${new Date(commande.date_evenement).toLocaleDateString("fr-FR")} a été signé par les deux parties. Prestation confirmée !`
              : `${isClient ? "Le client" : "Le traiteur"} a signé le devis. Veuillez apposer votre signature pour finaliser l'accord.`,
            data: {
              commande_id: commandeId,
              devis_status: newDevisStatus,
            },
          },
        });
      } catch (err) {
        console.error("Erreur notif signature:", err);
      }
    }

    // Marquer les notifications non lues de l'utilisateur qui signe comme lues pour cette commande
    if (userId) {
      try {
        const notifs = await tx.notification.findMany({
          where: {
            user_id: userId,
            is_read: false,
          },
          take: 50,
        });
        const notifIds = notifs
          .filter((n) => {
            const d = n.data as any;
            return d && (d.commande_id === commandeId || d.id === commandeId);
          })
          .map((n) => n.id);
        if (notifIds.length > 0) {
          await tx.notification.updateMany({
            where: { id: { in: notifIds } },
            data: { is_read: true },
          });
        }
      } catch (err) {
        console.error("Erreur marquage notification signature lue:", err);
      }
    }

    // Si le client a signé le devis, avertir le traiteur par email
    if (isClient && commande.traiteur?.profile?.email) {
      sendDevisSignedToTraiteurMail({
        traiteurEmail: commande.traiteur.profile.email,
        traiteurName: commande.traiteur.name,
        clientName: commande.client?.full_name || "Client",
        prixDevis: Number(commande.prix_devis),
        dateEvenement: commande.date_evenement
          ? new Date(commande.date_evenement).toLocaleDateString("fr-FR")
          : undefined,
      }).catch((err) => console.error("Erreur email signature traiteur:", err));
    }

    return updated;
  });
};

/** Effet d'une action d'acompte : `inchange` quand l'état demandé était déjà en place. */
export type AcompteOutcome = "verse" | "jour_j" | "annule" | "conteste" | "inchange";

/**
 * Gestion déclarative de l'acompte : aucun paiement réel n'est encaissé par l'API. Le client (ou un
 * administrateur) déclare l'acompte réglé, choisit le règlement le jour J ou remet en attente ; le
 * traiteur du devis (ou un administrateur) peut signaler qu'il n'a pas reçu un acompte déclaré réglé
 * (« contester_acompte »), y compris sur un devis signé par les deux. La référence de transaction est
 * toujours générée par le serveur et une action sans effet ne notifie personne.
 */
export const payerAcompteCommandeTraiteurDevis = async (
  commandeId: string,
  userId: string,
  isAdmin: boolean,
  action: "verser" | "refuser_acompte" | "annuler_reglement" | "contester_acompte",
) => {
  return await db.$transaction(async (tx) => {
    const responseInclude = {
      traiteur: true,
      client: { select: CLIENT_CONTACT_SELECT },
    } as const;
    const commande = await tx.commandeTraiteur.findUnique({
      where: { id: commandeId },
      include: responseInclude,
    });

    if (!commande) {
      throw new Error("Commande de devis introuvable.");
    }

    // Seul le client (qui règle l'acompte) ou un administrateur peut changer le statut de l'acompte :
    // le traiteur ne doit pas pouvoir déclarer payé ou réinitialiser un acompte à la place du client.
    // Seule exception : le traiteur du devis signale un acompte déclaré réglé qu'il n'a pas reçu.
    const isClient = commande.client_id === userId;
    const isTraiteurOfDevis = Boolean(commande.traiteur?.user_id) && commande.traiteur?.user_id === userId;
    if (action === "contester_acompte") {
      if (!isTraiteurOfDevis && !isAdmin) {
        throw new Error("Seul le traiteur de ce devis peut signaler un acompte non reçu.");
      }
    } else if (!isClient && !isAdmin) {
      throw new Error("Seul le client peut gérer le règlement de l'acompte.");
    }

    if (!commande.prix_devis || Number(commande.prix_devis) <= 0) {
      throw new Error("Ce devis n'a pas encore été chiffré par le traiteur.");
    }

    if (
      commande.devis_status === DEVIS_STATUS.REFUSE ||
      commande.statut === COMMANDE_TRAITEUR_STATUS.ANNULEE ||
      commande.statut === COMMANDE_TRAITEUR_STATUS.REFUSEE
    ) {
      throw new Error("Ce devis est clôturé : l'acompte ne peut plus être modifié.");
    }

    const meta = parseDevisConditionsMeta(commande.conditions_devis);
    const next: DevisConditionsMetadata = { ...meta };
    let outcome: AcompteOutcome = "inchange";

    if (action === "contester_acompte") {
      // Acompte déjà « à régler » (double clic, relance, client revenu en arrière) : rien à signaler
      if (!meta.acompte_paye) {
        return { commande, outcome };
      }
      next.acompte_paye = false;
      next.acompte_paye_at = null;
      next.acompte_transaction_ref = null;
      next.acompte_choix_jour_j = false;
      next.acompte_conteste_at = new Date().toISOString();
      outcome = "conteste";
    } else if (action === "verser") {
      // Déjà réglé (double clic, relance) : commande renvoyée telle quelle, sans notification ni e-mail
      if (meta.acompte_paye) {
        return { commande, outcome };
      }
      if (meta.acompte_type === "aucun" || !((meta.acompte_montant ?? 0) > 0)) {
        throw new Error("Aucun acompte n'est prévu pour ce devis.");
      }
      next.acompte_paye = true;
      next.acompte_paye_at = new Date().toISOString();
      // Référence générée par le serveur : celle éventuellement envoyée par le client est ignorée
      next.acompte_transaction_ref = `DAB-ACP-${Date.now().toString(36).toUpperCase()}-${crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase()}`;
      next.acompte_choix_jour_j = false;
      // Nouvelle déclaration après un signalement du traiteur : le signalement est clos
      next.acompte_conteste_at = null;
      outcome = "verse";
    } else if (meta.acompte_paye) {
      // « refuser_acompte » est aussi envoyé par les applications pour annuler le règlement déclaré
      if (commande.devis_status === DEVIS_STATUS.SIGNE_PAR_LES_DEUX) {
        throw new HttpError(409, "Le devis est signé : contactez le support pour annuler l'acompte.");
      }
      next.acompte_paye = false;
      next.acompte_paye_at = null;
      next.acompte_transaction_ref = null;
      next.acompte_choix_jour_j = false;
      outcome = "annule";
    } else if (action === "refuser_acompte") {
      if (meta.acompte_type === "obligatoire") {
        throw new Error("L'acompte est obligatoire pour ce devis.");
      }
      if (!meta.acompte_choix_jour_j) {
        next.acompte_choix_jour_j = true;
        outcome = "jour_j";
      }
    } else if (meta.acompte_choix_jour_j) {
      // « annuler_reglement » d'un choix de règlement le jour J
      next.acompte_choix_jour_j = false;
      outcome = "annule";
    }

    if (outcome === "inchange") {
      return { commande, outcome };
    }

    // Mise à jour conditionnelle sur les conditions lues : un nouveau chiffrage ou une autre action
    // concurrente ne sont jamais écrasés par une version périmée des conditions.
    const changed = await tx.commandeTraiteur.updateMany({
      where: {
        id: commandeId,
        statut: commande.statut,
        devis_status: commande.devis_status,
        conditions_devis: commande.conditions_devis,
      },
      data: {
        conditions_devis: serializeDevisConditionsMeta(next),
      },
    });
    if (changed.count !== 1) {
      throw new HttpError(409, "Le devis a été modifié entre-temps : actualisez la page puis réessayez.");
    }

    const updated = await tx.commandeTraiteur.findUniqueOrThrow({
      where: { id: commandeId },
      include: responseInclude,
    });

    // Signalement du traiteur : le client est prévenu ; sinon, l'autre partie que l'auteur de l'action.
    // La notification fait partie de la transaction (le push ne part qu'après validation) : si elle
    // échoue, l'action est annulée plutôt que laissée sans prévenir personne.
    const recipientUserId =
      outcome === "conteste" ? commande.client_id : isClient ? commande.traiteur?.user_id : commande.client_id;
    if (recipientUserId) {
      const montant = next.acompte_montant || 0;
      const auteur = isClient ? "Le client" : "Le traiteur";
      const dateEvenement = commande.date_evenement
        ? new Date(commande.date_evenement).toLocaleDateString("fr-FR")
        : null;
      const notice: Record<Exclude<AcompteOutcome, "inchange">, { type: string; titre: string; message: string }> = {
        verse: {
          type: "devis_acompte_verse",
          titre: "Acompte déclaré réglé",
          message: `${auteur} indique avoir réglé l'acompte de ${montant} € directement auprès de vous. Pensez à vérifier sa bonne réception.`,
        },
        jour_j: {
          type: "devis_acompte_refuse",
          titre: "Règlement prévu le jour J",
          message: `${auteur} a convenu d'un règlement du solde le jour de l'événement.`,
        },
        conteste: {
          type: "devis_acompte_conteste",
          titre: "Acompte non reçu par le traiteur",
          message: `${commande.traiteur?.name || "Le traiteur"} indique ne pas avoir reçu l'acompte de ${montant} € que vous avez déclaré réglé${
            dateEvenement ? ` pour l'événement du ${dateEvenement}` : ""
          }. Vérifiez votre règlement avec lui ; vous pourrez le déclarer de nouveau une fois réglé.`,
        },
        annule: {
          type: "devis_acompte_annule",
          titre: "Règlement d'acompte réinitialisé",
          message: "Le statut de l'acompte a été réinitialisé en attente.",
        },
      };
      const { type, titre, message } = notice[outcome as Exclude<AcompteOutcome, "inchange">];
      await tx.notification.create({
        data: {
          user_id: recipientUserId,
          type,
          titre,
          message,
          data: { commande_id: commandeId, acompte_montant: montant, action },
        },
      });
    }

    // Si acompte versé, envoyer email au traiteur
    if (outcome === "verse" && commande.traiteur?.user_id) {
      const traiteurProfile = await tx.profile.findUnique({
        where: { id: commande.traiteur.user_id },
        select: { email: true },
      });
      if (traiteurProfile?.email) {
        sendAcompteNotificationMail({
          traiteurEmail: traiteurProfile.email,
          traiteurName: commande.traiteur.name,
          clientName: commande.client?.full_name || "Client",
          acompteMontant: next.acompte_montant || 0,
          dateEvenement: commande.date_evenement
            ? new Date(commande.date_evenement).toLocaleDateString("fr-FR")
            : undefined,
          transactionRef: next.acompte_transaction_ref || undefined,
        }).catch((err) => console.error("Erreur email acompte traiteur:", err));
      }
    }

    return { commande: updated, outcome };
  });
};
