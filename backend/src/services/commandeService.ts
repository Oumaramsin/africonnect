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
  message_traiteur?: string,
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
          .map(
            (item) =>
              `- ${item.dish?.name || "Plat"} x${item.quantity} (${(Number(item.unit_price) * item.quantity).toFixed(2)} €)`,
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

    return order;
  });
};

export const updateGpRequestStatus = async (
  id: string,
  status: string,
  message?: string,
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
      (status === "rejected" ||
        status === "refused" ||
        status === "cancelled") &&
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
          titre: isAccepted
            ? "✅ Demande GP acceptée !"
            : "❌ Demande GP refusée",
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

  if (existing.statut !== "en_attente") {
    throw new Error(
      "Cette commande ne peut plus être modifiée car elle a déjà été confirmée ou traitée.",
    );
  }

  if (data.date_evenement) {
    const eventDate = new Date(data.date_evenement);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate < today) {
      throw new Error(
        "La date de l'événement ne peut pas être antérieure à aujourd'hui.",
      );
    }
  }

  return await db.commandeTraiteur.update({
    where: { id },
    data: {
      date_evenement: data.date_evenement
        ? new Date(data.date_evenement)
        : undefined,
      nb_personnes:
        data.nb_personnes !== undefined ? Number(data.nb_personnes) : undefined,
      adresse: data.adresse !== undefined ? data.adresse : undefined,
      type_evenement:
        data.type_evenement !== undefined ? data.type_evenement : undefined,
      notes: data.notes !== undefined ? data.notes : undefined,
    },
    include: {
      traiteur: true,
      client: true,
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

    if (existing.status !== "pending") {
      throw new Error(
        "Cette commande ne peut plus être modifiée car elle a déjà été confirmée ou traitée.",
      );
    }

    let newTotalAmount = existing.total_amount;

    if (data.items && data.items.length > 0) {
      let sum = 0;
      const validItems: {
        dish_id: string;
        quantity: number;
        unit_price: number;
      }[] = [];

      for (const item of data.items) {
        if (item.quantity > 0) {
          const dish = await tx.dish.findUnique({
            where: { id: item.dish_id },
          });
          if (!dish) {
            throw new Error(`Plat introuvable (ID: ${item.dish_id})`);
          }
          const unitPrice = Number(dish.price);
          sum += unitPrice * item.quantity;
          validItems.push({
            dish_id: dish.id,
            quantity: item.quantity,
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
            ? data.delivery_address
            : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
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
  data: {
    weight_kg?: number;
    content_desc?: string;
    declared_value?: number;
    notes?: string;
  },
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

    if (existing.status !== "pending") {
      throw new Error(
        "Cette demande ne peut plus être modifiée car elle a déjà été confirmée ou traitée.",
      );
    }

    let newWeight = existing.weight_kg;
    let newTotalAmount = existing.total_amount;

    if (data.weight_kg !== undefined && data.weight_kg > 0) {
      const oldWeight = Number(existing.weight_kg || 0);
      const updatedWeight = Number(data.weight_kg);
      const diff = updatedWeight - oldWeight;

      if (existing.listing_id && existing.listing) {
        const available = Number(existing.listing.available_kg || 0);
        if (diff > 0 && diff > available) {
          throw new Error(
            `Le transporteur n'a que ${available} kg restants de disponible.`,
          );
        }

        await tx.gpListing.update({
          where: { id: existing.listing_id },
          data: {
            available_kg: {
              decrement: diff,
            },
          },
        });

        const pricePerKg = Number(existing.listing.price_per_kg || 0);
        newTotalAmount = (updatedWeight * pricePerKg) as any;
      }
      newWeight = updatedWeight as any;
    }

    return await tx.gpRequest.update({
      where: { id },
      data: {
        weight_kg: newWeight,
        total_amount: newTotalAmount,
        content_desc:
          data.content_desc !== undefined ? data.content_desc : undefined,
        declared_value:
          data.declared_value !== undefined ? data.declared_value : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
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
      });
      if (!commande) throw new Error("Commande introuvable");
      if (commande.client_id !== user_id)
        throw new Error("Action non autorisée");
      if (commande.statut !== "en_attente")
        throw new Error("Impossible d'annuler une commande déjà traitée");

      return await tx.commandeTraiteur.update({
        where: { id },
        data: { statut: "annulee" },
      });
    } else if (type === "order") {
      const order = await tx.order.findUnique({
        where: { id },
      });
      if (!order) throw new Error("Commande introuvable");
      if (order.client_id !== user_id) throw new Error("Action non autorisée");
      if (order.status !== "pending")
        throw new Error("Impossible d'annuler une commande déjà traitée");

      return await tx.order.update({
        where: { id },
        data: { status: "cancelled" },
      });
    } else if (type === "gp") {
      const request = await tx.gpRequest.findUnique({
        where: { id },
        include: { listing: true },
      });
      if (!request) throw new Error("Demande GP introuvable");
      if (request.sender_id !== user_id)
        throw new Error("Action non autorisée");
      if (request.status !== "pending")
        throw new Error("Impossible d'annuler une demande déjà traitée");

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

      return await tx.gpRequest.update({
        where: { id },
        data: { status: "cancelled" },
      });
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
