import { Request, Response } from "express";
import { isOptionalTextWithin, isRequiredTextWithin, isStringArrayWithin, sendErrorResponse } from "../utils/validation";
import { isValidUUID } from "../utils/types";
import { isOwnStorageUrl } from "../services/storageService";
import {
  deleteTraiteur,
  updateStateTraiteur,
  createTraiteurFromUser,
  updateStateGp,
  deleteGp,
  createGpFromUser,
  getAdminOverview,
  setAdmin,
} from "../services/adminService";

export const getAdminOverviewController = async (
  req: Request,
  res: Response,
) => {
  try {
    const overview = await getAdminOverview();
    res.json({
      success: true,
      data: overview,
    });
  } catch (error: any) {
    sendErrorResponse(res, error, "Erreur serveur.");
  }
};

export const updateStateTraiteurController = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = req.body.traiteur_id;
    const is_active: boolean = req.body.is_active;
    if (!isValidUUID(id) || typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        error:
          "Veuillez renseigner tous les champs obligatoires (traiteur_id et is_active).",
      });
    }
    const traiteur = await updateStateTraiteur(id, is_active);

    res.json({
      success: true,
      data: { traiteur },
    });
  } catch (error) {
    console.error("Erreur dans updateStateTraiteur:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteTraiteurController = async (req: Request, res: Response) => {
  try {
    const id = req.body.traiteur_id;
    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error:
          "Veuillez renseigner tous les champs obligatoires (traiteur_id).",
      });
    }
    const traiteur = await deleteTraiteur(id);

    res.json({
      success: true,
      data: { traiteur },
    });
  } catch (error) {
    console.error("Erreur dans deleteTraiteurController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const createTraiteurFromUserController = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      user_id,
      name,
      bio,
      cuisine_type,
      delivery_zones,
      whatsapp,
      image_url,
    } = req.body;

    if (
      !isValidUUID(user_id) ||
      !isRequiredTextWithin(name, 100) ||
      !isRequiredTextWithin(bio, 2000) ||
      !isStringArrayWithin(cuisine_type, 20, 60) ||
      cuisine_type.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Veuillez renseigner tous les champs obligatoires (user_id, name, bio, cuisine_type).",
      });
    }

    if (
      (delivery_zones !== undefined && delivery_zones !== null && !isStringArrayWithin(delivery_zones, 50, 100)) ||
      !isOptionalTextWithin(whatsapp, 30) ||
      (image_url && !isOwnStorageUrl(image_url))
    ) {
      return res.status(400).json({
        success: false,
        error: "Zones de livraison, WhatsApp ou image invalides.",
      });
    }

    const traiteur = await createTraiteurFromUser(user_id, {
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
    console.error("Erreur dans createTraiteurFromUserController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
  }
};


export const updateStateGpController = async (req: Request, res: Response) => {
  try {
    const id = req.body.gp_id;
    const is_active: boolean = req.body.is_active;

    if (!isValidUUID(id) || typeof is_active !== "boolean") {
      return res.status(400).json({
        success: false,
        error:
          "Veuillez renseigner tous les champs obligatoires (gp_id et is_active).",
      });
    }

    const gp = await updateStateGp(id, is_active);

    res.json({
      success: true,
      data: { gp },
    });
  } catch (error) {
    console.error("Erreur dans updateStateGpController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const setAdminController = async (req: Request, res: Response) => {
  try {
    const { id, is_admin } = req.body;
    const currentAdmin = (req as any).user;

    if (!isValidUUID(id) || (is_admin !== undefined && typeof is_admin !== "boolean")) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires (id).",
      });
    }

    // Empêcher un administrateur de se retirer accidentellement ses propres droits
    if (currentAdmin?.userId === id && is_admin === false) {
      return res.status(400).json({
        success: false,
        error: "Vous ne pouvez pas retirer vos propres droits d'administrateur.",
      });
    }

    const result = await setAdmin(id, is_admin);

    res.json({
      success: true,
      data: result,
      message: result.is_admin
        ? "L'utilisateur a été promu administrateur avec succès."
        : `Droits administrateur retirés. Rôle rétabli : ${result.role}.`,
    });
  } catch (error: any) {
    console.error("Erreur dans setAdminController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
  }
};

export const deleteGpController = async (req: Request, res: Response) => {
  try {
    const id = req.body.gp_id;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires (gp_id).",
      });
    }

    const gp = await deleteGp(id);

    res.json({
      success: true,
      data: { gp },
    });
  } catch (error) {
    console.error("Erreur dans deleteGpController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const createGpFromUserController = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      user_id,
      departure_city,
      departure_country,
      arrival_city,
      arrival_country,
      departure_date,
      available_kg,
      price_per_kg,
    } = req.body;

    if (
      !isValidUUID(user_id) ||
      !isRequiredTextWithin(departure_city, 100) ||
      !isRequiredTextWithin(departure_country, 100) ||
      !isRequiredTextWithin(arrival_city, 100) ||
      !isRequiredTextWithin(arrival_country, 100) ||
      !departure_date ||
      isNaN(new Date(departure_date).getTime()) ||
      !available_kg ||
      !price_per_kg
    ) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires.",
      });
    }

    const available_kgParsed = parseFloat(available_kg);
    const price_per_kgParsed = parseFloat(price_per_kg);

    if (
      isNaN(available_kgParsed) ||
      available_kgParsed <= 0 ||
      isNaN(price_per_kgParsed) ||
      price_per_kgParsed <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Les poids et prix doivent être des nombres supérieurs à 0.",
      });
    }

    const gp = await createGpFromUser(user_id, {
      departure_city,
      departure_country,
      arrival_city,
      arrival_country,
      departure_date,
      available_kg: available_kgParsed,
      price_per_kg: price_per_kgParsed,
    });

    res.status(201).json({
      success: true,
      data: { gp },
    });
  } catch (error: any) {
    console.error("Erreur dans createGpFromUserController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
  }
};

