import { db } from "../db";

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
    }

    return commande;
  });
};

export const updateOrderPlatStatus = async (id: string, status: string) => {
  return await db.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id },
      data: { status },
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
    const request = await tx.gpRequest.update({
      where: { id },
      data: { status },
    });

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
    }

    return request;
  });
};
