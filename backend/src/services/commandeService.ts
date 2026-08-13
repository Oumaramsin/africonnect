import { db } from "../db";
import {
  sendOrderNotificationToClientMail,
  sendGpRequestStatusToSenderMail,
} from "./emailService";

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
  return await db.profile.findUnique({
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
              client: true,
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
              client: true,
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
              sender: true,
              listing: true,
            },
          },
        },
      },
    },
  });
};

export const updateCommandeTraiteurStatus = async (
  id: string,
  statut: string,
  message_traiteur?: string
) => {
  return await db.$transaction(async (tx) => {
    const commande = await tx.commandeTraiteur.update({
      where: { id },
      data: {
        statut,
        message_traiteur: message_traiteur || null,
      },
      include: {
        client: true,
        traiteur: true,
      },
    });

    if (commande.client_id) {
      const isAccepted = statut === "acceptee";
      const dateStr = commande.date_evenement
        ? new Date(commande.date_evenement).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "";

      await tx.notification.create({
        data: {
          user_id: commande.client_id,
          type: isAccepted ? "commande_acceptee" : "commande_refusee",
          titre: isAccepted ? "✅ Commande acceptée !" : "❌ Commande refusée",
          message: isAccepted
            ? `Votre commande du ${dateStr} a été acceptée.`
            : message_traiteur
            ? `Votre commande du ${dateStr} a été refusée. Motif : ${message_traiteur}`
            : `Votre commande du ${dateStr} a été refusée.`,
          data: { commande_id: id },
        },
      });

      if (commande.client?.email) {
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

    return commande;
  });
};

export const updateOrderPlatStatus = async (id: string, status: string) => {
  return await db.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id },
      data: { status },
      include: {
        client: true,
        traiteur: true,
        order_items: {
          include: {
            dish: true,
          },
        },
      },
    });

    if (order.client_id) {
      const isAccepted = status === "accepted";
      await tx.notification.create({
        data: {
          user_id: order.client_id,
          type: isAccepted ? "order_acceptee" : "order_refusee",
          titre: isAccepted ? "✅ Commande acceptée !" : "❌ Commande refusée",
          message: isAccepted
            ? "Le traiteur a accepté votre commande de plats !"
            : "Le traiteur ne peut malheureusement pas honorer votre commande.",
          data: { order_id: id },
        },
      });

      if (order.client?.email) {
        const dishSummary = order.order_items
          .map((item) => `- ${item.dish?.name || "Plat"} x${item.quantity} (${(Number(item.unit_price) * item.quantity).toFixed(2)} €)`)
          .join("\n");

        sendOrderNotificationToClientMail({
          clientEmail: order.client.email,
          clientName: order.client.full_name || "Client",
          traiteurName: order.traiteur?.name || "Traiteur",
          traiteurWhatsapp: order.traiteur?.whatsapp || undefined,
          status: isAccepted ? "ACCEPTÉE" : "REFUSÉE",
          details: dishSummary || "Plats commandés sur la carte du traiteur",
          totalAmount: order.total_amount ? Number(order.total_amount) : undefined,
        }).catch((err) => console.error("Erreur envoi email client:", err));
      }
    }

    return order;
  });
};

export const updateGpRequestStatus = async (
  id: string,
  status: string,
  message?: string
) => {
  return await db.$transaction(async (tx) => {
    const oldRequest = await tx.gpRequest.findUnique({
      where: { id },
    });

    const request = await tx.gpRequest.update({
      where: { id },
      data: { status },
      include: {
        sender: true,
        listing: {
          include: {
            gp: true,
          },
        },
      },
    });

    if (
      (status === "rejected" || status === "refused" || status === "cancelled") &&
      oldRequest &&
      oldRequest.status !== "rejected" &&
      oldRequest.status !== "refused" &&
      request.listing_id &&
      request.weight_kg
    ) {
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
      const isAccepted = status === "accepted";
      await tx.notification.create({
        data: {
          user_id: request.sender_id,
          type: isAccepted ? "gp_acceptee" : "gp_refusee",
          titre: isAccepted ? "✅ Demande GP acceptée !" : "❌ Demande GP refusée",
          message: isAccepted
            ? "Le GP a accepté votre demande de transport de colis !"
            : message
            ? `Le GP a refusé votre demande de transport. Motif : ${message}`
            : "Le GP a refusé votre demande de transport.",
          data: { request_id: id },
        },
      });

      if (request.sender?.email) {
        sendGpRequestStatusToSenderMail({
          senderEmail: request.sender.email,
          senderName: request.sender.full_name || "Expéditeur",
          gpName: request.listing?.gp?.full_name || "GP Transporteur",
          gpPhone: request.listing?.gp?.phone || undefined,
          status: isAccepted ? "ACCEPTÉE" : "REFUSÉE",
          departureCity: request.departure_city || request.listing?.departure_city || undefined,
          arrivalCity: request.arrival_city || request.listing?.arrival_city || undefined,
          weightKg: request.weight_kg ? Number(request.weight_kg) : undefined,
          totalAmount: request.total_amount ? Number(request.total_amount) : undefined,
          messageGp: message,
        }).catch((err) => console.error("Erreur e-mail expéditeur:", err));
      }
    }

    return request;
  });
};
