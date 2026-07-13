import { Request, Response } from "express";
import { getActiveTraiteur, getTraiteurDishes } from "../services/traiteurService";

export const getActiveTraiteurController = async (req: Request, res: Response) => {
  try {
    const activeTraiteur = await getActiveTraiteur()

    res.json({
      success: true,
      data: { activeTraiteur },
    });
  } catch (error) {
    console.error("Erreur dans getProductsController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getTraiteurDishesController = async (req: Request, res: Response) => {
  try {
      const traiteurIdString = req.query.traiteur_id as string;
      const dishes = await getTraiteurDishes(traiteurIdString)

    res.json({
      success: true,
      data: { dishes },
    });
  } catch (error) {
    console.error("Erreur dans getProductsController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const createCommandeTraiteurController = async (req: Request, res: Response) => {
  try {
//       client_id?: string;
//   traiteur_id: string;
//   date_evenement: Date | string;
//   nb_personnes: number;
//   adresse: string;
//   type_evenement?: string;
//   notes?: string;
      const traiteurIdString = req.query.traiteur_id as string;
      const client_id = req.query.traiteur_id as string;
      const date_evenement = req.query.traiteur_id as string;
      const type_evenement = req.query.traiteur_id as string;
      const notes = req.query.traiteur_id as string;
      const nb_personnes = req.query.traiteur_id as string;
      const dishes = await getTraiteurDishes(traiteurIdString)

    res.json({
      success: true,
      data: { dishes },
    });
  } catch (error) {
    console.error("Erreur dans getProductsController:", error);
    res.status(500).json({ error: "Server error" });
  }
};