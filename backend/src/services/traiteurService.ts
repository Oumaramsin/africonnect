import { db } from "../db";
import {
  CreateCommandeTraiteurInput,
  CreateDishesOrderInput,
  CreateTraiteurProfileInput,
  CreateDishInput,
} from "../utils/types";

export const getActiveTraiteur = async () => {
  return await db.traiteur.findMany({
    where: {
      is_active: true,
    },
    include: {
      dishes: true,
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
        },
      },
    },
  });
};

export const createOrderTraiteur = async (commande: CreateCommandeTraiteurInput) => {
  return await db.commandeTraiteur.create({
    data: {
      ...commande,
      date_evenement: new Date(commande.date_evenement),
    },
  });
};

export const createDishesOrder = async (commande: CreateDishesOrderInput) => {
  const total = commande.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  return await db.order.create({
    data: {
      client_id: commande.client_id,
      traiteur_id: commande.traiteur_id,
      delivery_type: commande.delivery_type || "delivery",
      delivery_address: commande.delivery_address,
      delivery_date: new Date(commande.delivery_date),
      total_amount: total,
      notes: commande.notes,
      order_items: {
        create: commande.items.map((item) => ({
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

    await tx.profile.update({
      where: { id: userId },
      data: { role: "traiteur" },
    });

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

  return await db.dish.update({
    where: { id: dishId },
    data: { is_archived: true },
  });
};

