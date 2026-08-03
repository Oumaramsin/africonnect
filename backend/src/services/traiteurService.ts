import { db } from "../db";
import {
  CreateCommandeTraiteurInput,
  CreateDishesOrderInput,
  CreateTraiteurProfileInput,
  CreateDishInput,
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

export const createOrderTraiteur = async (commande: CreateCommandeTraiteurInput) => {
  return await db.$transaction(async (tx) => {
    const traiteur = await tx.traiteur.findUnique({
      where: { id: commande.traiteur_id },
      include: { profile: true },
    });

    const client = commande.client_id
      ? await tx.profile.findUnique({ where: { id: commande.client_id } })
      : null;

    const newCommande = await tx.commandeTraiteur.create({
      data: {
        ...commande,
        date_evenement: new Date(commande.date_evenement),
      },
    });

    if (traiteur?.user_id) {
      await tx.notification.create({
        data: {
          user_id: traiteur.user_id,
          type: "nouvelle_commande",
          titre: "🎉 Nouvelle commande !",
          message: `Commande pour ${commande.nb_personnes} personnes le ${new Date(commande.date_evenement).toLocaleDateString("fr-FR")} à ${commande.adresse}`,
          data: {
            commande_id: newCommande.id,
            date_evenement: commande.date_evenement,
            nb_personnes: commande.nb_personnes,
            type_evenement: commande.type_evenement,
            notes: commande.notes,
          },
        },
      });
    }

    // E-mails automatiques
    if (traiteur?.profile?.email) {
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
        traiteurName: traiteur?.name || "Traiteur",
        traiteurWhatsapp: traiteur?.whatsapp || undefined,
        status: "CRÉE",
        details: `Demande enregistrée pour le ${new Date(commande.date_evenement).toLocaleDateString("fr-FR")} (${commande.nb_personnes} personnes).`,
      }).catch((err) => console.error("Erreur e-mail client:", err));
    }

    return newCommande;
  });
};

export const createDishesOrder = async (commande: CreateDishesOrderInput) => {
  const total = commande.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  return await db.$transaction(async (tx) => {
    const traiteur = await tx.traiteur.findUnique({
      where: { id: commande.traiteur_id },
      include: { profile: true },
    });

    const client = commande.client_id
      ? await tx.profile.findUnique({ where: { id: commande.client_id } })
      : null;

    const parsedDate = new Date(commande.delivery_date);
    const finalDeliveryDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

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
          create: commande.items.map((item) => ({
            dish_id: item.dish_id,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
          })),
        },
      },
      include: {
        order_items: true,
      },
    });

    if (traiteur?.user_id) {
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
        console.error("Impossible de créer la notification traiteur (ignoré):", notifErr);
      }
    }

    // E-mails automatiques
    if (traiteur?.profile?.email) {
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
        traiteurName: traiteur?.name || "Traiteur",
        traiteurWhatsapp: traiteur?.whatsapp || undefined,
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
  data: CreateTraiteurProfileInput
) => {
  return await db.$transaction(async (tx) => {
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
  data: CreateTraiteurProfileInput
) => {
  const traiteur = await getTraiteurByUserId(userId);
  if (!traiteur) {
    throw new Error("Profil traiteur introuvable");
  }

  // Suppression automatique de l'ancienne photo de profil du stockage
  if (data.image_url && traiteur.image_url && data.image_url !== traiteur.image_url) {
    await deleteFromR2(traiteur.image_url);
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
  data: CreateDishInput
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
  data: Partial<CreateDishInput>
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
      await deleteFromR2(oldUrl);
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
      await deleteFromR2(url);
    }
  }

  return await db.dish.update({
    where: { id: dishId },
    data: { is_archived: true },
  });
};

