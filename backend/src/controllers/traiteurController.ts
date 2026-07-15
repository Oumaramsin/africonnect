import { Request, Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
import {
  createDishesOrder,
  createOrderTraiteur,
  getActiveTraiteur,
  getTraiteurDishes,
} from "../services/traiteurService";

export const getActiveTraiteurController = async (
  req: Request,
  res: Response,
) => {
  try {
    const activeTraiteur = await getActiveTraiteur();

    res.json({
      success: true,
      data: { activeTraiteur },
    });
  } catch (error) {
    console.error("Erreur dans getActiveTraiteurController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getTraiteurDishesController = async (
  req: Request,
  res: Response,
) => {
  try {
    const traiteurIdString = req.query.traiteur_id as string;
    const dishes = await getTraiteurDishes(traiteurIdString);

    res.json({
      success: true,
      data: { dishes },
    });
  } catch (error) {
    console.error("Erreur dans getTraiteurDishesController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const createCommandeTraiteurController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;

    // Récupère l'ID client du token JWT de connexion ou du body
    const client_id = user?.userId || req.body.client_id;

    const {
      traiteur_id,
      date_evenement,
      nb_personnes,
      adresse,
      type_evenement,
      notes,
    } = req.body;

    // Validation des données requises
    if (!traiteur_id || !date_evenement || !nb_personnes || !adresse) {
      return res.status(400).json({
        success: false,
        error:
          "Veuillez renseigner tous les champs obligatoires (traiteur_id, date_evenement, nb_personnes, adresse).",
      });
    }

    const nbPersonnesParsed = parseInt(nb_personnes);
    if (isNaN(nbPersonnesParsed) || nbPersonnesParsed <= 0) {
      return res.status(400).json({
        success: false,
        error: "Le nombre de personnes doit être un nombre supérieur à 0.",
      });
    }

    const commande = await createOrderTraiteur({
      client_id,
      traiteur_id,
      date_evenement,
      nb_personnes: nbPersonnesParsed,
      adresse,
      type_evenement,
      notes,
    });

    res.status(201).json({
      success: true,
      data: { commande },
    });
  } catch (error: any) {
    console.error("Erreur dans createCommandeTraiteurController:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error: " + error.message });
  }
};

export const createDishesOrderController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;

    // Récupère l'ID client du token JWT de connexion ou du body
    const client_id = user?.userId || req.body.client_id;

    const {
      traiteur_id,
      delivery_type,
      delivery_address,
      delivery_date,
      notes,
      items,
    } = req.body;

    if (!traiteur_id || !delivery_type || !delivery_address || !delivery_date) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires.",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Votre commande doit contenir au moins un plat.",
      });
    }

    const commande = await createDishesOrder({
      client_id,
      traiteur_id,
      delivery_type,
      delivery_address,
      delivery_date,
      notes,
      items,
    });

    res.status(201).json({
      success: true,
      data: { commande },
    });
  } catch (error: any) {
    console.error("Erreur dans createDishesOrderController:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error: " + error.message });
  }
};
