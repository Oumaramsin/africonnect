import { Request, Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
import {
  createOrderTraiteur,
  createDishesOrder,
  getActiveTraiteur,
  getTraiteurDishes,
  getTraiteurByUserId,
  createTraiteurProfile,
  updateTraiteurProfile,
  addTraiteurDish,
  updateTraiteurDish,
  deleteTraiteurDish,
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
    const client_id = user?.userId || req.body.client_id;
    
    const {
      traiteur_id,
      date_evenement,
      nb_personnes,
      adresse,
      type_evenement,
      notes,
    } = req.body;

    if (!traiteur_id || !date_evenement || !nb_personnes || !adresse) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires.",
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
    res.status(500).json({ success: false, error: "Server error: " + error.message });
  }
};

export const createDishesOrderController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;
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
    res.status(500).json({ success: false, error: "Server error: " + error.message });
  }
};


export const getTraiteurProfileController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;
    const userId = user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const traiteur = await getTraiteurByUserId(userId);
    res.json({
      success: true,
      isTraiteur: !!traiteur,
      traiteur,
    });
  } catch (error: any) {
    console.error("Erreur dans getTraiteurProfileController:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createTraiteurProfileController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;
    const userId = user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const { name, bio, cuisine_type, delivery_zones, whatsapp, image_url } = req.body;

    if (!name || !bio || !cuisine_type || cuisine_type.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires.",
      });
    }

    const traiteur = await createTraiteurProfile(userId, {
      name,
      bio,
      cuisine_type,
      delivery_zones: delivery_zones || [],
      whatsapp,
      image_url,
    });

    res.status(201).json({
      success: true,
      data: { traiteur },
    });
  } catch (error: any) {
    console.error("Erreur dans createTraiteurProfileController:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateTraiteurProfileController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;
    const userId = user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const { name, bio, cuisine_type, delivery_zones, whatsapp, image_url } = req.body;

    if (!name || !bio || !cuisine_type || cuisine_type.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires.",
      });
    }

    const traiteur = await updateTraiteurProfile(userId, {
      name,
      bio,
      cuisine_type,
      delivery_zones: delivery_zones || [],
      whatsapp,
      image_url,
    });

    res.json({
      success: true,
      data: { traiteur },
    });
  } catch (error: any) {
    console.error("Erreur dans updateTraiteurProfileController:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const addTraiteurDishController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;
    const userId = user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const traiteur = await getTraiteurByUserId(userId);
    if (!traiteur) {
      return res.status(403).json({
        success: false,
        error: "Vous devez configurer votre espace traiteur d'abord.",
      });
    }

    const { name, description, price, cuisine_type, image_urls, is_available } = req.body;

    if (!name || !description || price === undefined || !cuisine_type) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires du plat.",
      });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        error: "Le prix doit être un nombre valide supérieur ou égal à 0.",
      });
    }

    const dish = await addTraiteurDish(traiteur.id, {
      name,
      description,
      price: parsedPrice,
      cuisine_type,
      image_urls,
      is_available,
    });

    res.status(201).json({
      success: true,
      data: { dish },
    });
  } catch (error: any) {
    console.error("Erreur dans addTraiteurDishController:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateTraiteurDishController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;
    const userId = user?.userId;
    const { dishId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const traiteur = await getTraiteurByUserId(userId);
    if (!traiteur) {
      return res.status(403).json({
        success: false,
        error: "Vous devez configurer votre espace traiteur d'abord.",
      });
    }

    const { name, description, price, cuisine_type, image_urls, is_available } = req.body;

    const parsedPrice = price !== undefined ? parseFloat(price) : undefined;
    if (parsedPrice !== undefined && (isNaN(parsedPrice) || parsedPrice < 0)) {
      return res.status(400).json({
        success: false,
        error: "Le prix doit être un nombre valide supérieur ou égal à 0.",
      });
    }

    const dish = await updateTraiteurDish(dishId, traiteur.id, {
      name,
      description,
      price: parsedPrice,
      cuisine_type,
      image_urls,
      is_available,
    });

    res.json({
      success: true,
      data: { dish },
    });
  } catch (error: any) {
    console.error("Erreur dans updateTraiteurDishController:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteTraiteurDishController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;
    const userId = user?.userId;
    const { dishId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const traiteur = await getTraiteurByUserId(userId);
    if (!traiteur) {
      return res.status(403).json({
        success: false,
        error: "Vous devez configurer votre espace traiteur d'abord.",
      });
    }

    await deleteTraiteurDish(dishId, traiteur.id);

    res.json({
      success: true,
      message: "Plat archivé avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans deleteTraiteurDishController:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

