import { db } from "../db";
import { CreateCommandeTraiteurInput } from "../utils/types";

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

export const CreateOrderTraiteur = async (commande : CreateCommandeTraiteurInput) => {
  return await db.commandeTraiteur.create({
    data:commande
  });
};
