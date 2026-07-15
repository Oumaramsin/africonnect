import { db } from "../db";
import {
  CreateCommandeTraiteurInput,
  CreateDishesOrderInput,
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

export const getTraiteurDishes = async (id: string) => {
  return await db.dish.findMany({
    where: {
      traiteur_id: id,
    },
  });
};

export const createOrderTraiteur = async (
  commande: CreateCommandeTraiteurInput,
) => {
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
    0,
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
