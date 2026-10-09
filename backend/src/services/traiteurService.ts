import { db } from "../db";
import {
  CreateCommandeTraiteurInput,
  CreateDishesOrderInput,
  CreateTraiteurProfileInput,
  CreateDishInput,
  CreateTraiteurRequestInput,
  UpdateTraiteurRequestInput,
  CreateTraiteurProposalInput,
  TRAITEUR_REQUEST_STATUS,
  TRAITEUR_PROPOSAL_STATUS,
} from "../utils/types";
import { deleteFromR2 } from "./storageService";
import {
  sendNewOrderToTraiteurMail,
  sendOrderNotificationToClientMail,
} from "./emailService";

export const getActiveTraiteur = async () => {
  return await db.traiteur.findMany({
    where: {
      is_active: true,
      dishes: {
        some: {
          is_archived: false,
          is_available: true,
        },
      },
    },
    include: {
      dishes: {
        where: {
          is_archived: false,
          is_available: true,
        },
        orderBy: {
          created_at: "desc",
        },
      },
      profile: true,
    },
  });
};

export const getTraiteurById = async (id: string) => {
  return await db.traiteur.findUnique({
    where: {
      id: id,
    },
    include: {
      dishes: {
        where: {
          is_archived: false,
          is_available: true,
        },
        orderBy: {
          created_at: "desc",
        },
      },
      profile: true,
    },
  });
};

export const createOrderTraiteur = async (
  commande: CreateCommandeTraiteurInput,
) => {
  return await db.$transaction(async (tx) => {
    const traiteur = await tx.traiteur.findUnique({
      where: { id: commande.traiteur_id },
      include: { profile: true },
    });

    if (!traiteur) {
      throw new Error("Traiteur introuvable");
    }

    const client = commande.client_id
      ? await tx.profile.findUnique({ where: { id: commande.client_id } })
      : null;

    const newCommande = await tx.commandeTraiteur.create({
      data: {
        client_id: commande.client_id,
        traiteur_id: commande.traiteur_id,
        date_evenement: new Date(commande.date_evenement),
        nb_personnes: commande.nb_personnes,
        adresse: commande.adresse,
        type_evenement: commande.type_evenement,
        notes: commande.notes,
      },
    });

    if (traiteur.user_id) {
      try {
        await tx.notification.create({
          data: {
            user_id: traiteur.user_id,
            type: "nouvelle_commande",
            titre: "🎉 Nouvelle commande !",
            message: `Commande pour ${commande.nb_personnes} personnes le ${new Date(
              commande.date_evenement,
            ).toLocaleDateString("fr-FR")} à ${commande.adresse}`,
            data: {
              commande_id: newCommande.id,
              date_evenement: commande.date_evenement,
              nb_personnes: commande.nb_personnes,
              type_evenement: commande.type_evenement,
              notes: commande.notes,
            },
          },
        });
      } catch (notifErr) {
        console.error("Erreur notification traiteur:", notifErr);
      }
    }

    // E-mails automatiques (asynchrones non-bloquants)
    if (traiteur.profile?.email) {
      sendNewOrderToTraiteurMail({
        traiteurEmail: traiteur.profile.email,
        traiteurName: traiteur.name,
        clientName: client?.full_name || "Client",
        clientPhone: client?.phone || undefined,
        clientEmail: client?.email || undefined,
        dateEvenement: new Date(commande.date_evenement).toLocaleDateString("fr-FR"),
        details: `Type d'événement: ${commande.type_evenement || "Non spécifié"}\nNombre de personnes: ${commande.nb_personnes}\nAdresse: ${commande.adresse}\nNotes: ${commande.notes || "Aucune"}`,
        type: "DEVIS",
      }).catch((err) => console.error("Erreur e-mail traiteur:", err));
    }

    if (client?.email) {
      sendOrderNotificationToClientMail({
        clientEmail: client.email,
        clientName: client.full_name || "Client",
        traiteurName: traiteur.name || "Traiteur",
        traiteurWhatsapp: traiteur.whatsapp || undefined,
        status: "CRÉE",
        details: `Demande enregistrée pour le ${new Date(
          commande.date_evenement,
        ).toLocaleDateString("fr-FR")} (${commande.nb_personnes} personnes).`,
      }).catch((err) => console.error("Erreur e-mail client:", err));
    }

    return newCommande;
  });
};

export const createDishesOrder = async (commande: CreateDishesOrderInput) => {
  return await db.$transaction(async (tx) => {
    const traiteur = await tx.traiteur.findUnique({
      where: { id: commande.traiteur_id },
      include: { profile: true },
    });

    if (!traiteur) {
      throw new Error("Traiteur introuvable");
    }

    // Vérification de sécurité : vérifier que tous les plats existent et appartiennent à ce traiteur
    const dishIds = commande.items.map((i) => i.dish_id);
    const existingDishes = await tx.dish.findMany({
      where: {
        id: { in: dishIds },
        traiteur_id: commande.traiteur_id,
        is_archived: false,
        is_available: true,
      },
    });

    if (existingDishes.length !== dishIds.length) {
      throw new Error(
        "Un ou plusieurs plats sélectionnés sont indisponibles ou n'appartiennent pas à ce traiteur.",
      );
    }

    // Calcul fiable du total à partir des prix en base de données
    const priceMap = new Map<string, number>();
    existingDishes.forEach((d) => priceMap.set(d.id, Number(d.price)));

    const verifiedItems = commande.items.map((item) => {
      const realPrice = priceMap.get(item.dish_id) || Number(item.unit_price);
      return {
        dish_id: item.dish_id,
        quantity: item.quantity,
        unit_price: realPrice,
      };
    });

    const total = verifiedItems.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    );

    const client = commande.client_id
      ? await tx.profile.findUnique({ where: { id: commande.client_id } })
      : null;

    const parsedDate = new Date(commande.delivery_date);
    const finalDeliveryDate = isNaN(parsedDate.getTime())
      ? new Date()
      : parsedDate;

    const newOrder = await tx.order.create({
      data: {
        client_id: commande.client_id,
        traiteur_id: commande.traiteur_id,
        delivery_type: commande.delivery_type || "delivery",
        delivery_address: commande.delivery_address,
        delivery_date: finalDeliveryDate,
        total_amount: total,
        notes: commande.notes,
        order_items: {
          create: verifiedItems.map((item) => ({
            dish_id: item.dish_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        },
      },
      include: {
        order_items: true,
      },
    });

    if (traiteur.user_id) {
      try {
        await tx.notification.create({
          data: {
            user_id: traiteur.user_id,
            type: "nouvelle_commande_plat",
            titre: "🛒 Nouvelle commande de plats !",
            message: `Commande de plats pour un montant total de ${total.toFixed(2)} €`,
            data: {
              order_id: newOrder.id,
              total_amount: total,
            },
          },
        });
      } catch (notifErr) {
        console.error("Erreur notification traiteur:", notifErr);
      }
    }

    // E-mails automatiques
    if (traiteur.profile?.email) {
      sendNewOrderToTraiteurMail({
        traiteurEmail: traiteur.profile.email,
        traiteurName: traiteur.name,
        clientName: client?.full_name || "Client",
        clientPhone: client?.phone || undefined,
        clientEmail: client?.email || undefined,
        totalAmount: total,
        details: `Commande de plats (${commande.items.length} produit(s)). Adresse: ${commande.delivery_address || "À emporter"}`,
        type: "PLAT",
      }).catch((err) => console.error("Erreur e-mail traiteur:", err));
    }

    if (client?.email) {
      sendOrderNotificationToClientMail({
        clientEmail: client.email,
        clientName: client.full_name || "Client",
        traiteurName: traiteur.name || "Traiteur",
        traiteurWhatsapp: traiteur.whatsapp || undefined,
        status: "CRÉE",
        details: `Commande de plats enregistrée pour un montant total de ${total.toFixed(2)} €`,
        totalAmount: total,
      }).catch((err) => console.error("Erreur e-mail client:", err));
    }

    return newOrder;
  });
};

export const getTraiteurByUserId = async (userId: string) => {
  return await db.traiteur.findFirst({
    where: { user_id: userId },
    include: {
      dishes: {
        where: { is_archived: false },
        orderBy: { created_at: "desc" },
      },
    },
  });
};

export const createTraiteurProfile = async (
  userId: string,
  data: CreateTraiteurProfileInput,
) => {
  return await db.$transaction(async (tx) => {
    const existing = await tx.traiteur.findFirst({
      where: { user_id: userId },
    });
    if (existing) {
      throw new Error("Vous possédez déjà un profil traiteur actif.");
    }

    const traiteur = await tx.traiteur.create({
      data: {
        user_id: userId,
        name: data.name,
        bio: data.bio,
        cuisine_type: data.cuisine_type,
        delivery_zones: data.delivery_zones,
        whatsapp: data.whatsapp || null,
        image_url: data.image_url || null,
        is_active: true,
      },
    });

    const p = await tx.profile.findUnique({ where: { id: userId } });
    if (p && p.role !== "admin") {
      await tx.profile.update({
        where: { id: userId },
        data: { role: "traiteur" },
      });
    }

    return traiteur;
  });
};

export const updateTraiteurProfile = async (
  userId: string,
  data: CreateTraiteurProfileInput,
) => {
  const traiteur = await getTraiteurByUserId(userId);
  if (!traiteur) {
    throw new Error("Profil traiteur introuvable");
  }

  // Suppression automatique de l'ancienne photo de profil du stockage si remplacée
  if (
    data.image_url &&
    traiteur.image_url &&
    data.image_url !== traiteur.image_url
  ) {
    await deleteFromR2(traiteur.image_url).catch((err) =>
      console.warn("Échec suppression ancienne image traiteur:", err),
    );
  }

  return await db.traiteur.update({
    where: { id: traiteur.id },
    data: {
      name: data.name,
      bio: data.bio,
      cuisine_type: data.cuisine_type,
      delivery_zones: data.delivery_zones,
      whatsapp: data.whatsapp || null,
      image_url: data.image_url || null,
    },
  });
};

export const addTraiteurDish = async (
  traiteurId: string,
  data: CreateDishInput,
) => {
  return await db.dish.create({
    data: {
      traiteur_id: traiteurId,
      name: data.name,
      description: data.description,
      price: data.price,
      cuisine_type: data.cuisine_type,
      image_urls: data.image_urls || [],
      is_available: data.is_available ?? true,
    },
  });
};

export const updateTraiteurDish = async (
  dishId: string,
  traiteurId: string,
  data: Partial<CreateDishInput>,
) => {
  const dish = await db.dish.findFirst({
    where: { id: dishId, traiteur_id: traiteurId },
  });

  if (!dish) {
    throw new Error("Plat introuvable ou non autorisé");
  }

  // Suppression automatique des images retirées lors de l'édition du plat
  if (data.image_urls && dish.image_urls) {
    const keptUrls = data.image_urls;
    const removedUrls = dish.image_urls.filter((url) => !keptUrls.includes(url));
    for (const oldUrl of removedUrls) {
      await deleteFromR2(oldUrl).catch((err) =>
        console.warn("Échec suppression image plat:", err),
      );
    }
  }

  return await db.dish.update({
    where: { id: dishId },
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      cuisine_type: data.cuisine_type,
      image_urls: data.image_urls,
      is_available: data.is_available,
    },
  });
};

export const deleteTraiteurDish = async (dishId: string, traiteurId: string) => {
  const dish = await db.dish.findFirst({
    where: { id: dishId, traiteur_id: traiteurId },
  });

  if (!dish) {
    throw new Error("Plat introuvable ou non autorisé");
  }

  // Suppression de toutes les images du plat du stockage
  if (dish.image_urls && dish.image_urls.length > 0) {
    for (const url of dish.image_urls) {
      await deleteFromR2(url).catch((err) =>
        console.warn("Échec suppression image plat:", err),
      );
    }
  }

  return await db.dish.update({
    where: { id: dishId },
    data: { is_archived: true },
  });
};

export const createTraiteurRequest = async (
  clientId: string,
  data: CreateTraiteurRequestInput,
) => {
  return await db.traiteurRequest.create({
    data: {
      client_id: clientId,
      title: data.title || `Recherche traiteur - ${data.event_type}`,
      event_type: data.event_type,
      guest_count: data.guest_count ? Number(data.guest_count) : null,
      event_date: new Date(data.event_date),
      location: data.location,
      food_preferences: data.food_preferences,
      budget: data.budget ? Number(data.budget) : null,
      description: data.description || null,
      status: TRAITEUR_REQUEST_STATUS.OPEN,
    },
    include: {
      client: {
        select: {
          id: true,
          full_name: true,
          phone: true,
          avatar_url: true,
          city: true,
        },
      },
    },
  });
};

export const getAllTraiteurRequests = async () => {
  return await db.traiteurRequest.findMany({
    where: {
      status: TRAITEUR_REQUEST_STATUS.OPEN,
    },
    include: {
      client: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
          city: true,
        },
      },
      proposals: {
        select: {
          id: true,
          traiteur_id: true,
          proposed_price: true,
          status: true,
          created_at: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });
};

export const getMyTraiteurRequests = async (clientId: string) => {
  return await db.traiteurRequest.findMany({
    where: {
      client_id: clientId,
    },
    include: {
      client: {
        select: {
          id: true,
          full_name: true,
          phone: true,
          avatar_url: true,
        },
      },
      proposals: {
        include: {
          traiteur: {
            include: {
              profile: {
                select: {
                  full_name: true,
                  phone: true,
                  avatar_url: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });
};

export const getTraiteurRequestById = async (id: string) => {
  return await db.traiteurRequest.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          full_name: true,
          phone: true,
          avatar_url: true,
          city: true,
        },
      },
      proposals: {
        include: {
          traiteur: {
            include: {
              profile: {
                select: {
                  full_name: true,
                  phone: true,
                  avatar_url: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      },
    },
  });
};

export const cancelTraiteurRequest = async (id: string, clientId: string) => {
  const req = await db.traiteurRequest.findFirst({
    where: { id, client_id: clientId },
  });
  if (!req) {
    throw new Error("Demande introuvable ou non autorisée");
  }
  if (req.status !== TRAITEUR_REQUEST_STATUS.OPEN) {
    throw new Error("Seule une demande active peut être annulée.");
  }
  return await db.traiteurRequest.update({
    where: { id },
    data: { status: TRAITEUR_REQUEST_STATUS.CANCELLED },
  });
};

export const deleteTraiteurRequest = async (id: string, clientId: string) => {
  const req = await db.traiteurRequest.findFirst({
    where: { id, client_id: clientId },
    include: {
      proposals: {
        include: { traiteur: { select: { user_id: true } } },
      },
    },
  });
  if (!req) {
    throw new Error("Demande introuvable ou non autorisée");
  }

  // Prévenir les traiteurs ayant une proposition en attente
  const pendingTraiteurUserIds = Array.from(
    new Set(
      req.proposals
        .filter(
          (p) =>
            p.status === TRAITEUR_PROPOSAL_STATUS.PENDING &&
            p.traiteur?.user_id,
        )
        .map((p) => p.traiteur.user_id as string),
    ),
  );

  // Les propositions sont supprimées en cascade (onDelete: Cascade)
  await db.traiteurRequest.delete({ where: { id } });

  await Promise.all(
    pendingTraiteurUserIds.map((userId) =>
      db.notification
        .create({
          data: {
            user_id: userId,
            type: "traiteur_request_deleted",
            titre: "Annonce supprimée",
            message: `L'annonce "${req.event_type}" à laquelle vous aviez répondu a été supprimée par le client.`,
            data: { requestId: id },
          },
        })
        .catch(console.error),
    ),
  );

  return { id };
};

export const updateTraiteurRequest = async (
  id: string,
  clientId: string,
  data: UpdateTraiteurRequestInput,
) => {
  const req = await db.traiteurRequest.findFirst({
    where: { id, client_id: clientId },
  });
  if (!req) {
    throw new Error("Demande introuvable ou non autorisée");
  }
  if (req.status !== TRAITEUR_REQUEST_STATUS.OPEN) {
    throw new Error("Seules les annonces actives peuvent être modifiées.");
  }

  return await db.traiteurRequest.update({
    where: { id },
    data: {
      title: data.title !== undefined ? data.title : req.title,
      event_type: data.event_type || req.event_type,
      guest_count:
        data.guest_count !== undefined ? data.guest_count : req.guest_count,
      event_date: data.event_date ? new Date(data.event_date) : req.event_date,
      location: data.location || req.location,
      food_preferences: data.food_preferences || req.food_preferences,
      budget: data.budget !== undefined ? data.budget : req.budget,
      description:
        data.description !== undefined ? data.description : req.description,
    },
  });
};

export const createTraiteurProposal = async (
  traiteurUserId: string,
  requestId: string,
  data: CreateTraiteurProposalInput,
) => {
  const traiteur = await db.traiteur.findFirst({
    where: { user_id: traiteurUserId },
    include: { profile: true },
  });

  if (!traiteur) {
    throw new Error(
      "Vous devez être enregistré comme traiteur pour envoyer une proposition.",
    );
  }

  const request = await db.traiteurRequest.findUnique({
    where: { id: requestId },
    include: { client: true },
  });

  if (!request || request.status !== TRAITEUR_REQUEST_STATUS.OPEN) {
    throw new Error("Cette demande n'est plus ouverte aux propositions.");
  }

  if (request.client_id === traiteurUserId) {
    throw new Error("Vous ne pouvez pas envoyer une proposition à votre propre annonce.");
  }

  // Vérifier si une proposition existe déjà
  const existingProposal = await db.traiteurProposal.findFirst({
    where: {
      request_id: requestId,
      traiteur_id: traiteur.id,
    },
  });

  if (existingProposal) {
    // Mise à jour de la proposition existante
    return await db.traiteurProposal.update({
      where: { id: existingProposal.id },
      data: {
        proposed_price: Number(data.proposed_price),
        message: data.message,
        status: TRAITEUR_PROPOSAL_STATUS.PENDING,
      },
    });
  }

  const proposal = await db.traiteurProposal.create({
    data: {
      request_id: requestId,
      traiteur_id: traiteur.id,
      proposed_price: Number(data.proposed_price),
      message: data.message,
      status: TRAITEUR_PROPOSAL_STATUS.PENDING,
    },
    include: {
      traiteur: true,
    },
  });

  // Notifier le client
  if (request.client_id) {
    await db.notification
      .create({
        data: {
          user_id: request.client_id,
          type: "traiteur_proposal_received",
          titre: "Nouveau devis traiteur !",
          message: `${traiteur.name} vous a envoyé une proposition de ${Number(
            data.proposed_price,
          ).toFixed(2)} € pour votre événement "${request.event_type}".`,
          data: {
            requestId: request.id,
            proposalId: proposal.id,
            traiteurId: traiteur.id,
          },
        },
      })
      .catch(console.error);
  }

  return proposal;
};

export const getMyTraiteurProposals = async (traiteurUserId: string) => {
  const traiteur = await db.traiteur.findFirst({
    where: { user_id: traiteurUserId },
  });
  if (!traiteur) return [];

  return await db.traiteurProposal.findMany({
    where: { traiteur_id: traiteur.id },
    include: {
      request: {
        include: {
          client: {
            select: {
              id: true,
              full_name: true,
              phone: true,
              avatar_url: true,
            },
          },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });
};

export const updateTraiteurProposalStatus = async (
  proposalId: string,
  clientId: string,
  status: string,
) => {
  const normalizedStatus =
    status === "acceptee" || status === "accepted"
      ? TRAITEUR_PROPOSAL_STATUS.ACCEPTED
      : TRAITEUR_PROPOSAL_STATUS.REJECTED;

  const proposal = await db.traiteurProposal.findUnique({
    where: { id: proposalId },
    include: {
      request: true,
      traiteur: {
        include: { profile: true },
      },
    },
  });

  if (!proposal || proposal.request.client_id !== clientId) {
    throw new Error("Proposition introuvable ou non autorisée");
  }

  return await db.$transaction(async (tx) => {
    const updated = await tx.traiteurProposal.update({
      where: { id: proposalId },
      data: { status: normalizedStatus },
    });

    if (normalizedStatus === TRAITEUR_PROPOSAL_STATUS.ACCEPTED) {
      await tx.traiteurRequest.update({
        where: { id: proposal.request_id },
        data: { status: TRAITEUR_REQUEST_STATUS.FULFILLED },
      });

      // Notifier le traiteur
      if (proposal.traiteur.user_id) {
        await tx.notification
          .create({
            data: {
              user_id: proposal.traiteur.user_id,
              type: "traiteur_proposal_accepted",
              titre: "Proposition acceptée !",
              message: `Votre devis pour l'événement "${proposal.request.event_type}" a été accepté ! Le client peut désormais vous contacter.`,
              data: {
                requestId: proposal.request_id,
                proposalId: proposal.id,
                clientId: clientId,
              },
            },
          })
          .catch(console.error);
      }
    }

    return updated;
  });
};
