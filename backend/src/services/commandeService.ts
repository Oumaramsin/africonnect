import { db } from "../db";
import {
  COMMANDE_TRAITEUR_STATUS,
  DEVIS_STATUS,
  ORDER_PLAT_STATUS,
  GP_REQUEST_STATUS,
  GpDelayInput,
  UpdateClientGpRequestInput,
  DevisConditionsMetadata,
  parseDevisConditionsMeta,
  serializeDevisConditionsMeta,
} from "../utils/types";
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
          client: true,
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
                  client: true,
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
              sender: true,
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
                  profile: true,
                },
              },
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
    if (!isAdmin && currentUserId && existing.traiteur?.user_id !== currentUserId) {
      throw new Error("Accès refusé. Vous n'êtes pas le traiteur assigné à cette commande.");
    }

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
      const isAccepted = statut === COMMANDE_TRAITEUR_STATUS.ACCEPTEE;
      const dateStr = commande.date_evenement
        ? new Date(commande.date_evenement).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "";

      try {
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
      } catch (notifErr) {
        console.error("Erreur notification client:", notifErr);
      }

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

export const updateOrderPlatStatus = async (
  id: string,
  status: string,
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
    if (!isAdmin && currentUserId && existing.traiteur?.user_id !== currentUserId) {
      throw new Error("Accès refusé. Vous n'êtes pas le traiteur assigné à cette commande.");
    }

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
      const isAccepted = status === ORDER_PLAT_STATUS.ACCEPTED;
      try {
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
      } catch (notifErr) {
        console.error("Erreur notification commande plat:", notifErr);
      }

      if (order.client?.email) {
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
    if (
      !isAdmin &&
      currentUserId &&
      oldRequest.listing?.gp_id !== currentUserId
    ) {
      throw new Error("Accès refusé. Vous n'êtes pas le transporteur de cette annonce.");
    }

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

    // Si la demande est rejetée/annulée, réincrémenter les kilos disponibles
    const isCancelledOrRefused =
      status === GP_REQUEST_STATUS.REJECTED ||
      status === GP_REQUEST_STATUS.REFUSED ||
      status === GP_REQUEST_STATUS.CANCELLED;

    const wasNotCancelledOrRefused =
      oldRequest.status !== GP_REQUEST_STATUS.REJECTED &&
      oldRequest.status !== GP_REQUEST_STATUS.REFUSED &&
      oldRequest.status !== GP_REQUEST_STATUS.CANCELLED;

    if (
      isCancelledOrRefused &&
      wasNotCancelledOrRefused &&
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
      let notifType = "gp_status";
      let notifTitre = "Mise à jour de votre colis GP";
      let notifMsg = `Statut de votre colis mis à jour : ${status}`;

      if (status === GP_REQUEST_STATUS.ACCEPTED) {
        notifType = "gp_acceptee";
        notifTitre = "✅ Demande GP acceptée !";
        notifMsg =
          "Le GP a accepté votre demande de transport. Vous pouvez convenir du dépôt du colis.";
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

      if (request.sender?.email) {
        const emailStatus: "ACCEPTÉE" | "REFUSÉE" =
          status === GP_REQUEST_STATUS.REJECTED ||
          status === GP_REQUEST_STATUS.REFUSED
            ? "REFUSÉE"
            : "ACCEPTÉE";
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

  return await db.commandeTraiteur.update({
    where: { id },
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

    if (existing.status !== ORDER_PLAT_STATUS.PENDING) {
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
          if (!dish || dish.is_archived || !dish.is_available) {
            throw new Error(`Plat indisponible ou introuvable (ID: ${item.dish_id})`);
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
          data.content_desc !== undefined ? data.content_desc.trim() : undefined,
        declared_value:
          data.declared_value !== undefined ? data.declared_value : undefined,
        notes: data.notes !== undefined ? data.notes.trim() : undefined,
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
        include: { traiteur: true, client: true },
      });
      if (!commande) throw new Error("Commande introuvable");
      if (commande.client_id !== user_id)
        throw new Error("Action non autorisée");
      if (commande.statut !== COMMANDE_TRAITEUR_STATUS.EN_ATTENTE)
        throw new Error("Impossible d'annuler une commande déjà traitée");

      const updated = await tx.commandeTraiteur.update({
        where: { id },
        data: { statut: COMMANDE_TRAITEUR_STATUS.ANNULEE },
      });

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

      return updated;
    } else if (type === "order") {
      const order = await tx.order.findUnique({
        where: { id },
        include: { traiteur: true, client: true },
      });
      if (!order) throw new Error("Commande introuvable");
      if (order.client_id !== user_id) throw new Error("Action non autorisée");
      if (order.status !== ORDER_PLAT_STATUS.PENDING)
        throw new Error("Impossible d'annuler une commande déjà traitée");

      const updated = await tx.order.update({
        where: { id },
        data: { status: ORDER_PLAT_STATUS.CANCELLED },
      });

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

      return updated;
    } else if (type === "gp") {
      const request = await tx.gpRequest.findUnique({
        where: { id },
        include: { listing: true, sender: true },
      });
      if (!request) throw new Error("Demande GP introuvable");
      if (request.sender_id !== user_id)
        throw new Error("Action non autorisée");
      if (request.status !== GP_REQUEST_STATUS.PENDING)
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

      const updated = await tx.gpRequest.update({
        where: { id },
        data: { status: GP_REQUEST_STATUS.CANCELLED },
      });

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

    if (
      !isAdmin &&
      userId &&
      existing.listing?.gp_id &&
      existing.listing.gp_id !== userId
    ) {
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
        sender: true,
        listing: {
          include: {
            gp: true,
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
        requests: {
          include: { sender: true },
        },
      },
    });

    if (!listing) {
      throw new Error("Annonce GP introuvable");
    }

    if (!isAdmin && gpId && listing.gp_id && listing.gp_id !== gpId) {
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
    conditions_devis?: string;
    auto_sign?: boolean;
    traiteur_signature?: string;
  }
) => {
  return await db.$transaction(async (tx) => {
    const commande = await tx.commandeTraiteur.findUnique({
      where: { id: commandeId },
      include: {
        traiteur: true,
        client: true,
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

    const now = new Date();
    const shouldAutoSign = Boolean(data.auto_sign && data.traiteur_signature?.trim());

    const updated = await tx.commandeTraiteur.update({
      where: { id: commandeId },
      data: {
        prix_devis: data.prix_devis,
        conditions_devis: data.conditions_devis || commande.conditions_devis,
        devis_status: shouldAutoSign
          ? DEVIS_STATUS.SIGNE_TRAITEUR
          : DEVIS_STATUS.EN_ATTENTE_SIGNATURES,
        client_signed_at: null,
        client_signature: null,
        traiteur_signed_at: shouldAutoSign ? now : null,
        traiteur_signature: shouldAutoSign ? data.traiteur_signature?.trim() : null,
      },
      include: {
        traiteur: true,
        client: true,
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
        client: true,
      },
    });

    if (!commande) {
      throw new Error("Commande de devis introuvable.");
    }

    const isClient = commande.client_id === userId;
    if (!isClient && !isAdmin) {
      throw new Error("Seul le client peut décliner cette proposition de devis.");
    }

    const updated = await tx.commandeTraiteur.update({
      where: { id: commandeId },
      data: {
        statut: "refusee",
        devis_status: DEVIS_STATUS.REFUSE,
        message_traiteur: motif
          ? `Devis décliné par le client : ${motif.trim()}`
          : "Devis décliné par le client.",
      },
      include: {
        traiteur: true,
        client: true,
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
  signature: string
) => {
  return await db.$transaction(async (tx) => {
    const commande = await tx.commandeTraiteur.findUnique({
      where: { id: commandeId },
      include: {
        traiteur: true,
        client: true,
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

    if (!signature || signature.trim().length === 0) {
      throw new Error("Une signature valide est requise.");
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

    const updated = await tx.commandeTraiteur.update({
      where: { id: commandeId },
      data: updateData,
      include: {
        traiteur: true,
        client: true,
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

    return updated;
  });
};

export const payerAcompteCommandeTraiteurDevis = async (
  commandeId: string,
  userId: string,
  isAdmin: boolean,
  action: "verser" | "refuser_acompte" | "annuler_reglement",
  transactionRef?: string,
) => {
  return await db.$transaction(async (tx) => {
    const commande = await tx.commandeTraiteur.findUnique({
      where: { id: commandeId },
      include: {
        traiteur: true,
        client: true,
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

    const meta = parseDevisConditionsMeta(commande.conditions_devis);

    if (action === "verser") {
      meta.acompte_paye = true;
      meta.acompte_paye_at = new Date().toISOString();
      meta.acompte_transaction_ref =
        transactionRef || `DAB-SEC-${Date.now().toString(36).toUpperCase()}`;
      meta.acompte_choix_jour_j = false;
    } else if (action === "refuser_acompte") {
      meta.acompte_paye = false;
      meta.acompte_choix_jour_j = true;
    } else if (action === "annuler_reglement") {
      meta.acompte_paye = false;
      meta.acompte_paye_at = null;
      meta.acompte_transaction_ref = null;
      meta.acompte_choix_jour_j = false;
    }

    const updated = await tx.commandeTraiteur.update({
      where: { id: commandeId },
      data: {
        conditions_devis: serializeDevisConditionsMeta(meta),
      },
      include: {
        traiteur: true,
        client: true,
      },
    });

    const recipientUserId = isClient ? commande.traiteur?.user_id : commande.client_id;
    if (recipientUserId) {
      try {
        const montant = meta.acompte_montant || 0;
        await tx.notification.create({
          data: {
            user_id: recipientUserId,
            type:
              action === "verser"
                ? "devis_acompte_verse"
                : action === "refuser_acompte"
                ? "devis_acompte_refuse"
                : "devis_acompte_annule",
            titre:
              action === "verser"
                ? "Acompte sous séquestre validé !"
                : action === "refuser_acompte"
                ? "Règlement prévu le jour J"
                : "Règlement d'acompte réinitialisé",
            message:
              action === "verser"
                ? `${isClient ? "Le client" : "Le traiteur"} a validé le règlement de l'acompte (${montant} €) sous séquestre Dabari. Prestation confirmée !`
                : action === "refuser_acompte"
                ? `${isClient ? "Le client" : "Le traiteur"} a convenu d'un règlement du solde le jour de l'événement.`
                : "Le statut de l'acompte a été réinitialisé en attente.",
            data: {
              commande_id: commandeId,
              acompte_montant: montant,
              action,
            },
          },
        });
      } catch (notifErr) {
        console.error("Erreur notification acompte:", notifErr);
      }
    }

    return updated;
  });
};
