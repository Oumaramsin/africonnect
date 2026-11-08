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
  COMMANDE_TRAITEUR_STATUS,
  DEVIS_STATUS,
  NEGOCIATION_MAX_CONTRE_OFFRES,
  NegociationEntry,
  buildDevisConditions,
  countCounterOffers,
  hasPendingCounterOffer,
  parseDevisConditionsMeta,
  parseNegociation,
  serializeDevisConditionsMeta,
} from "../utils/types";
import { HttpError } from "../utils/validation";
import {
  hideClientDetailsUntilAccepted,
  LOCATION_PLACEHOLDER,
  toCoarseLocation,
  toPublicClient,
} from "../utils/privacy";
import { deleteFromR2, isOwnStorageUrl } from "./storageService";
import {
  sendNewOrderToTraiteurMail,
  sendOrderNotificationToClientMail,
} from "./emailService";

// Données de profil exposées publiquement (pages traiteurs consultables sans compte) :
// jamais l'e-mail, le téléphone personnel ni le rôle.
const PUBLIC_PROFILE_SELECT = {
  id: true,
  full_name: true,
  avatar_url: true,
} as const;

// Coordonnées d'un client transmises au traiteur dont la proposition a été acceptée
const CLIENT_CONTACT_SELECT = {
  id: true,
  full_name: true,
  avatar_url: true,
  phone: true,
  whatsapp: true,
  email: true,
  city: true,
} as const;

const MAX_DISH_IMAGES = 10;

/** Montant lisible dans une notification : « 1 800 € », « 1 650,50 € ». */
const formatEuros = (value: number) =>
  `${value.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

/** Extrait d'un message libre repris dans une notification (découpé sans couper un emoji). */
const excerpt = (text: string, max = 140) => {
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : text;
};

/** Minuit (heure du serveur) du jour courant. */
const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Offres montrées sur une annonce : celles d'un traiteur suspendu ou dont le compte est supprimé ne
 * sont plus affichées tant qu'elles sont en attente (elles ne sont plus acceptables).
 */
const VISIBLE_PROPOSALS = {
  OR: [
    { status: { not: TRAITEUR_PROPOSAL_STATUS.PENDING } },
    { traiteur: { is_active: true } },
  ],
};

/**
 * Les images doivent provenir de notre stockage (endpoint /upload). Les valeurs déjà enregistrées
 * restent acceptées telles quelles pour ne pas bloquer l'édition des fiches existantes.
 */
const assertAllowedImageUrls = (urls: string[], alreadyStored: string[] = []) => {
  if (urls.length > MAX_DISH_IMAGES) {
    throw new Error(`${MAX_DISH_IMAGES} images maximum.`);
  }
  for (const url of urls) {
    if (!isOwnStorageUrl(url) && !alreadyStored.includes(url)) {
      throw new Error("Image invalide : veuillez téléverser vos photos via l'application.");
    }
  }
};

/**
 * Supprime un média du stockage uniquement s'il n'est plus référencé par aucun autre plat
 * ni profil traiteur (évite d'effacer l'image d'un autre utilisateur ou d'un autre plat).
 */
const deleteImageIfUnused = async (
  url: string,
  exclude: { dishId?: string; traiteurId?: string },
) => {
  const [dishRefs, traiteurRefs] = await Promise.all([
    db.dish.count({
      where: {
        image_urls: { has: url },
        ...(exclude.dishId ? { NOT: { id: exclude.dishId } } : {}),
      },
    }),
    db.traiteur.count({
      where: {
        image_url: url,
        ...(exclude.traiteurId ? { NOT: { id: exclude.traiteurId } } : {}),
      },
    }),
  ]);
  if (dishRefs + traiteurRefs === 0) {
    await deleteFromR2(url);
  }
};

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
      profile: { select: PUBLIC_PROFILE_SELECT },
    },
  });
};

export const getTraiteurById = async (id: string) => {
  // Traiteur suspendu ou compte supprimé : fiche retirée du site (404)
  return await db.traiteur.findFirst({
    where: {
      id: id,
      is_active: true,
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
      profile: { select: PUBLIC_PROFILE_SELECT },
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

    if (!traiteur.is_active) {
      throw new Error("Ce traiteur n'accepte pas de commandes actuellement.");
    }

    if (commande.client_id && traiteur.user_id === commande.client_id) {
      throw new HttpError(400, "Vous ne pouvez pas demander un devis à votre propre profil traiteur.");
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
            titre: "Nouvelle commande !",
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

    if (!traiteur.is_active) {
      throw new Error("Ce traiteur n'accepte pas de commandes actuellement.");
    }

    if (commande.client_id && traiteur.user_id === commande.client_id) {
      throw new HttpError(400, "Vous ne pouvez pas commander vos propres plats.");
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

    // Le prix envoyé par le client n'est jamais utilisé : seul le tarif en base fait foi
    const verifiedItems = commande.items.map((item) => {
      const realPrice = priceMap.get(item.dish_id) ?? 0;
      return {
        dish_id: item.dish_id,
        quantity: parseInt(String(item.quantity), 10),
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
    if (isNaN(parsedDate.getTime())) {
      throw new Error("Date ou heure de livraison invalide.");
    }
    if (parsedDate.getTime() < Date.now() - 5 * 60 * 1000) {
      throw new Error("L'heure de livraison ne peut pas être antérieure à l'heure actuelle.");
    }
    const finalDeliveryDate = parsedDate;

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
            titre: "Nouvelle commande de plats !",
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

/** Identifiant du profil traiteur de l'utilisateur (null s'il n'en a pas), sans charger les plats. */
export const getTraiteurIdByUserId = async (userId: string): Promise<string | null> => {
  const traiteur = await db.traiteur.findFirst({
    where: { user_id: userId },
    select: { id: true },
  });
  return traiteur?.id ?? null;
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

    if (data.image_url) {
      assertAllowedImageUrls([data.image_url]);
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

  if (data.image_url) {
    assertAllowedImageUrls([data.image_url], traiteur.image_url ? [traiteur.image_url] : []);
  }

  const updated = await db.traiteur.update({
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

  // Suppression automatique de l'ancienne photo de profil du stockage si remplacée
  if (
    data.image_url &&
    traiteur.image_url &&
    data.image_url !== traiteur.image_url
  ) {
    await deleteImageIfUnused(traiteur.image_url, { traiteurId: traiteur.id }).catch((err) =>
      console.warn("Échec suppression ancienne image traiteur:", err),
    );
  }

  return updated;
};

export const addTraiteurDish = async (
  traiteurId: string,
  data: CreateDishInput,
) => {
  assertAllowedImageUrls(data.image_urls || []);

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

  if (data.image_urls) {
    assertAllowedImageUrls(data.image_urls, dish.image_urls || []);
  }

  const updated = await db.dish.update({
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

  // Suppression automatique des images retirées lors de l'édition du plat
  if (data.image_urls && dish.image_urls) {
    const keptUrls = data.image_urls;
    const removedUrls = dish.image_urls.filter((url) => !keptUrls.includes(url));
    for (const oldUrl of removedUrls) {
      await deleteImageIfUnused(oldUrl, { dishId }).catch((err) =>
        console.warn("Échec suppression image plat:", err),
      );
    }
  }

  return updated;
};

export const deleteTraiteurDish = async (dishId: string, traiteurId: string) => {
  const dish = await db.dish.findFirst({
    where: { id: dishId, traiteur_id: traiteurId },
  });

  if (!dish) {
    throw new Error("Plat introuvable ou non autorisé");
  }

  const archived = await db.dish.update({
    where: { id: dishId },
    data: { is_archived: true },
  });

  // Suppression de toutes les images du plat du stockage
  if (dish.image_urls && dish.image_urls.length > 0) {
    for (const url of dish.image_urls) {
      await deleteImageIfUnused(url, { dishId }).catch((err) =>
        console.warn("Échec suppression image plat:", err),
      );
    }
  }

  return archived;
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

/**
 * Demandes ouvertes consultées par un traiteur : du client, seuls le prénom + initiale du nom et la
 * ville ; lieu de l'événement réduit à une forme approximative ; seule la proposition du traiteur
 * appelant est renvoyée (jamais les prix des concurrents).
 */
export const getAllTraiteurRequests = async (ownTraiteurId: string | null, viewerUserId?: string) => {
  const requests = await db.traiteurRequest.findMany({
    where: {
      status: TRAITEUR_REQUEST_STATUS.OPEN,
      // Événement passé : plus aucune offre n'a de sens
      event_date: { gte: startOfToday() },
    },
    take: 300,
    select: {
      id: true,
      title: true,
      event_type: true,
      guest_count: true,
      event_date: true,
      location: true,
      food_preferences: true,
      budget: true,
      description: true,
      status: true,
      created_at: true,
      client_id: true,
      client: {
        select: {
          full_name: true,
          city: true,
        },
      },
      proposals: {
        where: { traiteur_id: { in: ownTraiteurId ? [ownTraiteurId] : [] } },
        select: {
          id: true,
          traiteur_id: true,
          proposed_price: true,
          message: true,
          conditions_devis: true,
          negociation: true,
          status: true,
          created_at: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return requests.map(({ client, location, client_id, ...request }) => ({
    ...request,
    // Annonce publiée par le traiteur lui-même : il ne peut pas y répondre
    is_own: Boolean(viewerUserId) && client_id === viewerUserId,
    location: toCoarseLocation(location) ?? LOCATION_PLACEHOLDER,
    client: toPublicClient(client),
  }));
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
        where: VISIBLE_PROPOSALS,
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

export const getTraiteurRequestById = async (
  id: string,
  requesterId: string,
  isAdmin: boolean,
) => {
  const request = await db.traiteurRequest.findUnique({
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
        where: VISIBLE_PROPOSALS,
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

  if (!request || isAdmin || request.client_id === requesterId) {
    return request;
  }

  // Vue restreinte pour les autres utilisateurs : jamais les propositions (prix, messages) des
  // traiteurs concurrents ; coordonnées et adresse du client seulement si la proposition du
  // traiteur appelant a été acceptée.
  const ownTraiteurId = await getTraiteurIdByUserId(requesterId);
  const ownProposals = request.proposals.filter(
    (proposal) => ownTraiteurId !== null && proposal.traiteur_id === ownTraiteurId,
  );
  if (ownProposals.some((proposal) => proposal.status === TRAITEUR_PROPOSAL_STATUS.ACCEPTED)) {
    return { ...request, proposals: ownProposals };
  }

  const { client_id: _clientId, client, location, ...publicRequest } = request;
  return {
    ...publicRequest,
    location: toCoarseLocation(location) ?? LOCATION_PLACEHOLDER,
    client: toPublicClient(client),
    proposals: ownProposals,
  };
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

  return await db.$transaction(async (tx) => {
    // Verrou de l'annonce (le même que l'envoi d'un devis) : aucune offre n'arrive pendant la modification
    const stillOpen = await tx.traiteurRequest.updateMany({
      where: { id, client_id: clientId, status: TRAITEUR_REQUEST_STATUS.OPEN },
      data: { status: TRAITEUR_REQUEST_STATUS.OPEN },
    });
    if (stillOpen.count !== 1) {
      throw new HttpError(409, "Seules les annonces actives peuvent être modifiées.");
    }
    // Les devis reçus ont été signés sur l'annonce telle qu'elle était (date, invités, lieu, menu) : la
    // modifier ferait signer au client un devis sur des termes que le traiteur n'a pas acceptés.
    const pendingOffers = await tx.traiteurProposal.count({
      where: {
        request_id: id,
        status: TRAITEUR_PROPOSAL_STATUS.PENDING,
        traiteur: { is_active: true },
      },
    });
    if (pendingOffers > 0) {
      throw new HttpError(
        409,
        "Vous avez déjà reçu des devis signés pour cette annonce : elle ne peut plus être modifiée. Négociez avec les traiteurs, ou annulez-la et publiez-en une nouvelle.",
      );
    }

    return await tx.traiteurRequest.update({
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
  });
};

export const createTraiteurProposal = async (
  traiteurUserId: string,
  requestId: string,
  data: CreateTraiteurProposalInput,
) => {
  const traiteur = await db.traiteur.findFirst({
    where: { user_id: traiteurUserId },
  });

  if (!traiteur) {
    throw new Error(
      "Vous devez être enregistré comme traiteur pour envoyer une proposition.",
    );
  }

  if (!traiteur.is_active) {
    throw new Error(
      "Votre compte traiteur est suspendu : vous ne pouvez pas envoyer de proposition.",
    );
  }

  const request = await db.traiteurRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, client_id: true, event_type: true },
  });

  if (!request || request.status !== TRAITEUR_REQUEST_STATUS.OPEN) {
    throw new Error("Cette demande n'est plus ouverte aux propositions.");
  }

  if (request.client_id === traiteurUserId) {
    throw new Error("Vous ne pouvez pas envoyer une proposition à votre propre annonce.");
  }

  // La proposition est un devis signé par le traiteur : prix, conditions d'acompte (montant calculé
  // ici) et signature, repris tels quels dans le devis créé quand le client la signe pour l'accepter.
  const price = Number(data.proposed_price);
  const devisFields = {
    proposed_price: price,
    message: data.message,
    conditions_devis: serializeDevisConditionsMeta(buildDevisConditions(price, data.conditions)),
    traiteur_signature: data.traiteur_signature.trim(),
    traiteur_signed_at: new Date(),
  };

  const { proposal, previousPrice } = await db.$transaction(async (tx) => {
    // Mise à jour conditionnelle sans effet : verrouille la demande tant qu'elle est ouverte. Les
    // envois de devis, étapes de négociation et acceptations d'une même annonce sont ainsi sérialisés.
    const stillOpen = await tx.traiteurRequest.updateMany({
      where: { id: requestId, status: TRAITEUR_REQUEST_STATUS.OPEN },
      data: { status: TRAITEUR_REQUEST_STATUS.OPEN },
    });
    if (stillOpen.count !== 1) {
      throw new HttpError(409, "Cette demande n'est plus ouverte aux propositions.");
    }

    // Une seule offre par traiteur et par annonce. Une fois envoyée, elle n'est remplacée que par un
    // nouveau devis signé répondant à une contre-proposition du client.
    const existingProposal = await tx.traiteurProposal.findFirst({
      where: {
        request_id: requestId,
        traiteur_id: traiteur.id,
      },
    });

    if (existingProposal) {
      if (existingProposal.status === TRAITEUR_PROPOSAL_STATUS.ACCEPTED) {
        throw new HttpError(409, "Votre proposition a déjà été acceptée : elle ne peut plus être modifiée.");
      }
      if (existingProposal.status === TRAITEUR_PROPOSAL_STATUS.REJECTED) {
        throw new HttpError(409, "Le client a décliné votre devis pour cette annonce.");
      }
      const negociation = parseNegociation(existingProposal.negociation);
      if (!hasPendingCounterOffer(negociation)) {
        throw new HttpError(
          409,
          "Vous avez déjà envoyé un devis pour cette annonce. Vous pourrez en proposer un nouveau si le client vous fait une contre-proposition.",
        );
      }
      const oldPrice = Number(existingProposal.proposed_price);
      // Réponse à une demande de prix plus bas : le nouveau devis ne peut pas être plus cher
      if (price > oldPrice) {
        throw new HttpError(
          400,
          `Votre nouveau devis ne peut pas dépasser le précédent (${formatEuros(oldPrice)}) : le client vous a demandé un prix plus bas.`,
        );
      }
      const entry: NegociationEntry = {
        type: "nouveau_devis",
        auteur: "traiteur",
        prix: price,
        prix_precedent: oldPrice,
        message: null,
        at: new Date().toISOString(),
      };
      // Conditionnelle : un refus du client enregistré entre-temps l'emporte (l'offre n'est pas rouverte)
      const replaced = await tx.traiteurProposal.updateMany({
        where: { id: existingProposal.id, status: TRAITEUR_PROPOSAL_STATUS.PENDING },
        data: { ...devisFields, negociation: [...negociation, entry] },
      });
      if (replaced.count !== 1) {
        throw new HttpError(409, "Le client vient de répondre à votre devis : actualisez la page.");
      }
      const updated = await tx.traiteurProposal.findUniqueOrThrow({
        where: { id: existingProposal.id },
      });
      return { proposal: updated, previousPrice: oldPrice as number | null };
    }

    const created = await tx.traiteurProposal.create({
      data: {
        request_id: requestId,
        traiteur_id: traiteur.id,
        ...devisFields,
        status: TRAITEUR_PROPOSAL_STATUS.PENDING,
      },
      include: {
        traiteur: true,
      },
    });
    return { proposal: created, previousPrice: null as number | null };
  });

  // Notifier le client : nouvelle offre, ou nouveau devis en réponse à sa contre-proposition
  if (request.client_id) {
    const notifData = { requestId: request.id, proposalId: proposal.id, traiteurId: traiteur.id };
    await db.notification
      .create({
        data:
          previousPrice === null
            ? {
                user_id: request.client_id,
                type: "traiteur_proposal_received",
                titre: "Nouveau devis traiteur !",
                message: `${traiteur.name} vous a envoyé un devis signé de ${formatEuros(price)} pour votre événement "${request.event_type}". Signez-le pour l'accepter.`,
                data: notifData,
              }
            : {
                user_id: request.client_id,
                type: "traiteur_nouveau_devis",
                titre: "Nouveau devis reçu",
                message: `${traiteur.name} répond à votre contre-proposition par un nouveau devis signé de ${formatEuros(price)} (au lieu de ${formatEuros(previousPrice)}) pour votre événement "${request.event_type}". Signez-le pour l'accepter.`,
                data: notifData,
              },
      })
      .catch(console.error);
  }

  return proposal;
};

/**
 * Verrouille une annonce encore ouverte pour une étape de négociation (même verrou que l'envoi d'un
 * devis et l'acceptation) : les étapes d'une même annonce sont traitées l'une après l'autre.
 */
const lockOpenRequest = async (
  tx: Pick<typeof db, "traiteurRequest">,
  requestId: string,
) => {
  const stillOpen = await tx.traiteurRequest.updateMany({
    where: { id: requestId, status: TRAITEUR_REQUEST_STATUS.OPEN },
    data: { status: TRAITEUR_REQUEST_STATUS.OPEN },
  });
  if (stillOpen.count !== 1) {
    throw new HttpError(409, "Cette demande n'est plus ouverte : la négociation est terminée.");
  }
};

/**
 * Contre-proposition du client sur une offre en attente : un montant plus bas que le devis en cours,
 * avec un message facultatif. Le devis signé du traiteur reste valable (le client peut toujours le
 * signer) jusqu'à sa réponse : prix maintenu, ou nouveau devis signé qui le remplace.
 */
export const createCounterOffer = async (
  proposalId: string,
  clientId: string,
  input: { prix: number; message: string | null; expectedPrice?: number },
) => {
  const proposal = await db.traiteurProposal.findUnique({
    where: { id: proposalId },
    select: { request: { select: { id: true, client_id: true } } },
  });
  if (!proposal || proposal.request.client_id !== clientId) {
    throw new HttpError(404, "Proposition introuvable ou non autorisée.");
  }

  return await db.$transaction(async (tx) => {
    await lockOpenRequest(tx, proposal.request.id);

    const current = await tx.traiteurProposal.findUniqueOrThrow({
      where: { id: proposalId },
      include: {
        request: { select: { event_type: true } },
        traiteur: { select: { user_id: true, is_active: true } },
      },
    });
    if (current.status !== TRAITEUR_PROPOSAL_STATUS.PENDING) {
      throw new HttpError(409, "Cette offre a déjà été acceptée ou déclinée.");
    }
    if (!current.traiteur.is_active || !current.traiteur.user_id) {
      throw new HttpError(409, "Ce traiteur n'est plus disponible sur Dabari.");
    }
    const currentPrice = Number(current.proposed_price);
    if (
      input.expectedPrice !== undefined &&
      Math.round(currentPrice * 100) !== Math.round(input.expectedPrice * 100)
    ) {
      throw new HttpError(409, "Le traiteur a modifié son devis entre-temps : relisez le nouveau montant.");
    }
    const negociation = parseNegociation(current.negociation);
    if (hasPendingCounterOffer(negociation)) {
      throw new HttpError(409, "Votre contre-proposition attend déjà la réponse du traiteur.");
    }
    if (countCounterOffers(negociation) >= NEGOCIATION_MAX_CONTRE_OFFRES) {
      throw new HttpError(
        409,
        `Vous avez déjà fait ${NEGOCIATION_MAX_CONTRE_OFFRES} contre-propositions sur cette offre : vous pouvez maintenant la signer ou la décliner.`,
      );
    }
    if (input.prix >= currentPrice) {
      throw new HttpError(400, `Proposez un montant inférieur au devis actuel (${formatEuros(currentPrice)}).`);
    }

    const entry: NegociationEntry = {
      type: "contre_offre",
      auteur: "client",
      prix: input.prix,
      prix_precedent: currentPrice,
      message: input.message,
      at: new Date().toISOString(),
    };
    // Conditionnelle : un refus enregistré entre-temps (sans verrou sur l'annonce) l'emporte
    const changed = await tx.traiteurProposal.updateMany({
      where: { id: proposalId, status: TRAITEUR_PROPOSAL_STATUS.PENDING },
      data: { negociation: [...negociation, entry] },
    });
    if (changed.count !== 1) {
      throw new HttpError(409, "Cette offre a déjà été acceptée ou déclinée.");
    }

    if (current.traiteur.user_id) {
      await tx.notification.create({
        data: {
          user_id: current.traiteur.user_id,
          type: "traiteur_contre_offre",
          titre: "Contre-proposition reçue",
          message: `Le client propose ${formatEuros(input.prix)} au lieu de ${formatEuros(currentPrice)} pour l'événement "${current.request.event_type}".${
            input.message ? ` Son message : « ${excerpt(input.message)} »` : ""
          } Maintenez votre prix ou envoyez-lui un nouveau devis.`,
          data: { requestId: current.request_id, proposalId },
        },
      });
    }

    return await tx.traiteurProposal.findUniqueOrThrow({ where: { id: proposalId } });
  });
};

/**
 * Réponse du traiteur à une contre-proposition : il maintient son devis (prix et signature inchangés),
 * avec un message facultatif. Le client peut alors le signer, le décliner ou proposer un autre prix
 * (dans la limite des contre-propositions autorisées).
 */
export const keepProposalPrice = async (
  proposalId: string,
  traiteurUserId: string,
  input: { message: string | null },
) => {
  const proposal = await db.traiteurProposal.findUnique({
    where: { id: proposalId },
    select: { request_id: true, traiteur: { select: { user_id: true } } },
  });
  if (!proposal || proposal.traiteur.user_id !== traiteurUserId) {
    throw new HttpError(404, "Proposition introuvable ou non autorisée.");
  }

  return await db.$transaction(async (tx) => {
    await lockOpenRequest(tx, proposal.request_id);

    const current = await tx.traiteurProposal.findUniqueOrThrow({
      where: { id: proposalId },
      include: {
        request: { select: { client_id: true, event_type: true } },
        traiteur: { select: { id: true, name: true, is_active: true } },
      },
    });
    if (!current.traiteur.is_active) {
      throw new HttpError(403, "Votre compte traiteur est suspendu : vous ne pouvez pas répondre.");
    }
    if (current.status !== TRAITEUR_PROPOSAL_STATUS.PENDING) {
      throw new HttpError(409, "Le client a déjà accepté ou décliné votre devis.");
    }
    const negociation = parseNegociation(current.negociation);
    if (!hasPendingCounterOffer(negociation)) {
      throw new HttpError(409, "Aucune contre-proposition n'attend votre réponse.");
    }

    const currentPrice = Number(current.proposed_price);
    const entry: NegociationEntry = {
      type: "prix_maintenu",
      auteur: "traiteur",
      prix: currentPrice,
      prix_precedent: null,
      message: input.message,
      at: new Date().toISOString(),
    };
    const changed = await tx.traiteurProposal.updateMany({
      where: { id: proposalId, status: TRAITEUR_PROPOSAL_STATUS.PENDING },
      data: { negociation: [...negociation, entry] },
    });
    if (changed.count !== 1) {
      throw new HttpError(409, "Le client a déjà accepté ou décliné votre devis.");
    }

    if (current.request.client_id) {
      const canCounterAgain = countCounterOffers(negociation) < NEGOCIATION_MAX_CONTRE_OFFRES;
      await tx.notification.create({
        data: {
          user_id: current.request.client_id,
          type: "traiteur_prix_maintenu",
          titre: "Le traiteur maintient son prix",
          message: `${current.traiteur.name} maintient son devis à ${formatEuros(currentPrice)} pour votre événement "${current.request.event_type}".${
            input.message ? ` Son message : « ${excerpt(input.message)} »` : ""
          } ${canCounterAgain ? "Vous pouvez le signer, le décliner ou proposer un autre prix." : "Vous pouvez le signer ou le décliner."}`,
          data: { requestId: current.request_id, proposalId, traiteurId: current.traiteur.id },
        },
      });
    }

    return await tx.traiteurProposal.findUniqueOrThrow({ where: { id: proposalId } });
  });
};

export const getMyTraiteurProposals = async (traiteurUserId: string) => {
  const traiteur = await db.traiteur.findFirst({
    where: { user_id: traiteurUserId },
  });
  if (!traiteur) return [];

  const proposals = await db.traiteurProposal.findMany({
    where: { traiteur_id: traiteur.id },
    include: {
      request: {
        include: {
          client: { select: CLIENT_CONTACT_SELECT },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });
  // Coordonnées et adresse du client uniquement pour les propositions acceptées
  return proposals.map(hideClientDetailsUntilAccepted);
};

export const updateTraiteurProposalStatus = async (
  proposalId: string,
  clientId: string,
  status: string,
  acceptance: { clientSignature?: string; expectedPrice?: number; expectedSignedAt?: string | null } = {},
) => {
  const normalizedStatus =
    status === "acceptee" || status === "accepted"
      ? TRAITEUR_PROPOSAL_STATUS.ACCEPTED
      : TRAITEUR_PROPOSAL_STATUS.REJECTED;
  const isAcceptance = normalizedStatus === TRAITEUR_PROPOSAL_STATUS.ACCEPTED;

  const proposal = await db.traiteurProposal.findUnique({
    where: { id: proposalId },
    include: {
      request: true,
      traiteur: {
        select: { user_id: true, is_active: true },
      },
    },
  });

  if (!proposal || proposal.request.client_id !== clientId) {
    throw new Error("Proposition introuvable ou non autorisée");
  }

  if (proposal.status !== TRAITEUR_PROPOSAL_STATUS.PENDING) {
    throw new Error("Cette proposition a déjà été traitée.");
  }

  const clientSignature = acceptance.clientSignature?.trim() ?? "";
  if (isAcceptance) {
    if (proposal.request.status !== TRAITEUR_REQUEST_STATUS.OPEN) {
      throw new Error("Cette demande n'est plus ouverte : impossible d'accepter une autre proposition.");
    }
    // Traiteur suspendu ou compte supprimé : son offre n'engage plus personne
    if (!proposal.traiteur.is_active || !proposal.traiteur.user_id) {
      throw new HttpError(409, "Ce traiteur n'est plus disponible sur Dabari : son offre ne peut plus être acceptée.");
    }
    // Accepter l'offre, c'est signer le devis : sans signature du client, rien n'est accepté
    if (!clientSignature) {
      throw new HttpError(400, "Signez le devis pour accepter cette offre.");
    }
    // Le client s'engage sur le montant qu'il a lu : s'il a changé depuis, la signature est refusée
    if (
      acceptance.expectedPrice !== undefined &&
      Math.round(Number(proposal.proposed_price) * 100) !== Math.round(acceptance.expectedPrice * 100)
    ) {
      throw new HttpError(
        409,
        "Cette offre a été modifiée entre-temps : relisez le nouveau montant avant de signer.",
      );
    }
    // … et sur la version du devis qu'il a lue (date de signature du traiteur) : un nouveau devis, même
    // au même prix (acompte, contenu), invalide une signature donnée sur l'ancien
    if (acceptance.expectedSignedAt !== undefined) {
      const seen = acceptance.expectedSignedAt ? new Date(acceptance.expectedSignedAt).getTime() : null;
      const current = proposal.traiteur_signed_at ? proposal.traiteur_signed_at.getTime() : null;
      if (seen !== current) {
        throw new HttpError(
          409,
          "Le traiteur a envoyé un nouveau devis entre-temps : relisez-le avant de signer.",
        );
      }
    }
  }

  const result = await db.$transaction(async (tx) => {
    if (isAcceptance) {
      // Fermeture conditionnelle de la demande : de deux acceptations simultanées (deux propositions
      // différentes ou double clic), une seule passe ; l'autre échoue sans rien modifier.
      const closed = await tx.traiteurRequest.updateMany({
        where: {
          id: proposal.request_id,
          client_id: clientId,
          status: TRAITEUR_REQUEST_STATUS.OPEN,
        },
        data: { status: TRAITEUR_REQUEST_STATUS.FULFILLED },
      });
      if (closed.count !== 1) {
        throw new HttpError(
          409,
          "Cette demande n'est plus ouverte : une proposition a déjà été acceptée. Actualisez la page.",
        );
      }
    }

    // La proposition doit être encore en attente et inchangée (prix et signature lus) au moment de la décision
    const changed = await tx.traiteurProposal.updateMany({
      where: {
        id: proposalId,
        status: TRAITEUR_PROPOSAL_STATUS.PENDING,
        proposed_price: proposal.proposed_price,
        traiteur_signed_at: proposal.traiteur_signed_at,
      },
      data: { status: normalizedStatus },
    });
    if (changed.count !== 1) {
      throw new HttpError(
        409,
        "Cette proposition a été modifiée ou déjà traitée entre-temps. Actualisez la page puis réessayez.",
      );
    }
    const updated = await tx.traiteurProposal.findUniqueOrThrow({
      where: { id: proposalId },
    });

    const eventType = proposal.request.event_type;
    let commandeId: string | null = null;
    let devisFullySigned = false;
    if (isAcceptance) {
      // L'offre retenue devient le devis officiel, signé par le client à l'instant et par le traiteur
      // lors de l'envoi de sa proposition : prix, conditions d'acompte, date, invités et lieu repris.
      const prixDevis = Number(proposal.proposed_price);
      const conditions = buildDevisConditions(prixDevis, parseDevisConditionsMeta(proposal.conditions_devis));
      const traiteurSigned = Boolean(proposal.traiteur_signature?.trim() && proposal.traiteur_signed_at);
      devisFullySigned = traiteurSigned;
      const souhaits = [
        `Menu souhaité : ${proposal.request.food_preferences}`,
        proposal.request.description?.trim(),
      ]
        .filter(Boolean)
        .join("\n");

      const commande = await tx.commandeTraiteur.create({
        data: {
          client_id: clientId,
          traiteur_id: proposal.traiteur_id,
          date_evenement: proposal.request.event_date,
          nb_personnes: Math.max(1, proposal.request.guest_count ?? 1),
          adresse: proposal.request.location,
          type_evenement: eventType,
          notes: souhaits.slice(0, 3000),
          message_traiteur: proposal.message.slice(0, 3000),
          prix_devis: proposal.proposed_price,
          conditions_devis: serializeDevisConditionsMeta(conditions),
          client_signature: clientSignature,
          client_signed_at: new Date(),
          // Anciennes propositions non signées : le traiteur signera le devis ensuite
          traiteur_signature: traiteurSigned ? proposal.traiteur_signature : null,
          traiteur_signed_at: traiteurSigned ? proposal.traiteur_signed_at : null,
          devis_status: traiteurSigned ? DEVIS_STATUS.SIGNE_PAR_LES_DEUX : DEVIS_STATUS.SIGNE_CLIENT,
          statut: traiteurSigned ? COMMANDE_TRAITEUR_STATUS.ACCEPTEE : COMMANDE_TRAITEUR_STATUS.EN_ATTENTE,
        },
        select: { id: true },
      });
      commandeId = commande.id;

      if (proposal.traiteur.user_id) {
        await tx.notification.create({
          data: {
            user_id: proposal.traiteur.user_id,
            type: "traiteur_proposal_accepted",
            titre: traiteurSigned ? "Devis accepté et signé !" : "Proposition acceptée !",
            message: traiteurSigned
              ? `Le client a accepté et signé votre devis de ${formatEuros(prixDevis)} pour l'événement "${eventType}". La prestation est confirmée.`
              : `Le client a accepté et signé votre proposition de ${formatEuros(prixDevis)} pour l'événement "${eventType}". Signez le devis pour confirmer la prestation.`,
            data: {
              commande_id: commande.id,
              requestId: proposal.request_id,
              proposalId: proposal.id,
            },
          },
        });
      }

      // Les autres offres en attente sur cette annonce ne sont pas retenues : leurs traiteurs sont prévenus
      const others = await tx.traiteurProposal.findMany({
        where: {
          request_id: proposal.request_id,
          status: TRAITEUR_PROPOSAL_STATUS.PENDING,
          id: { not: proposalId },
        },
        select: { id: true, traiteur: { select: { user_id: true } } },
      });
      if (others.length > 0) {
        await tx.traiteurProposal.updateMany({
          where: { id: { in: others.map((other) => other.id) } },
          data: { status: TRAITEUR_PROPOSAL_STATUS.REJECTED },
        });
        // Une notification à la fois (et non createMany) : le push n'est envoyé qu'une fois la
        // transaction validée (il relit la notification), jamais si l'acceptation échoue ensuite
        for (const other of others) {
          if (!other.traiteur.user_id) continue;
          await tx.notification.create({
            data: {
              user_id: other.traiteur.user_id,
              type: "traiteur_proposal_rejected",
              titre: "Offre non retenue",
              message: `Le client a retenu une autre offre pour l'événement "${eventType}". Merci pour votre proposition !`,
              data: { requestId: proposal.request_id, proposalId: other.id },
            },
          });
        }
      }
    } else if (proposal.traiteur.user_id) {
      // Offre déclinée par le client : le traiteur est prévenu
      await tx.notification.create({
        data: {
          user_id: proposal.traiteur.user_id,
          type: "traiteur_proposal_rejected",
          titre: "Offre déclinée",
          message: `Le client a décliné votre proposition pour l'événement "${eventType}".`,
          data: { requestId: proposal.request_id, proposalId: proposal.id },
        },
      });
    }

    return { ...updated, commande_id: commandeId, devis_fully_signed: devisFullySigned };
  });

  // Hors transaction et sans incidence sur la décision : les notifications reçues par le client pour
  // cette proposition sont marquées lues (une erreur ici n'annule pas l'acceptation déjà validée)
  try {
    const notifs = await db.notification.findMany({
      where: { user_id: clientId, is_read: false },
      select: { id: true, data: true },
      take: 50,
    });
    const notifIds = notifs
      .filter((n) => {
        const d = n.data as { proposalId?: unknown; requestId?: unknown } | null;
        return Boolean(d) && (d?.proposalId === proposalId || d?.requestId === proposal.request_id);
      })
      .map((n) => n.id);
    if (notifIds.length > 0) {
      await db.notification.updateMany({
        where: { id: { in: notifIds } },
        data: { is_read: true },
      });
    }
  } catch (e) {
    console.error("Erreur marquage notification proposal lue:", e);
  }

  return result;
};
