import { Request, Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
import { createGpOrder, createNewGp, getAllGp } from "../services/gpService";

export const getAllGpController = async (req: Request, res: Response) => {
  try {
    const gp = await getAllGp();

    res.json({
      success: true,
      data: { gp },
    });
  } catch (error) {
    console.error("Erreur dans getRecentOrderByClientIdController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const createGpOrderController = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;

    const sender_id = user?.userId || req.body.gp_id;

    const {
      listing_id,
      weight_kg,
      content_desc,
      declared_value,
      notes,
      total_amount,
    } = req.body;

    if (
      !listing_id ||
      !weight_kg ||
      !content_desc ||
      !declared_value ||
      !total_amount
    ) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires.",
      });
    }

    const total_amountParsed = parseFloat(total_amount);
    const declared_valueParsed = parseFloat(declared_value);
    const weight_kgParsed = parseFloat(weight_kg);
    if (
      isNaN(total_amountParsed) ||
      total_amountParsed <= 0 ||
      isNaN(weight_kgParsed) ||
      weight_kgParsed <= 0 ||
      isNaN(declared_valueParsed) ||
      declared_valueParsed <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Les montants doit être un nombre supérieur à 0.",
      });
    }
    const gp = await createGpOrder({
      sender_id,
      listing_id,
      weight_kg: weight_kgParsed,
      declared_value: declared_valueParsed,
      content_desc,
      notes,
      total_amount: total_amountParsed,
    });

    res.json({
      success: true,
      data: { gp },
    });
  } catch (error) {
    console.error("Erreur dans createGpOrderController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const createNewGpController = async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;

    const gp_id = user?.userId || req.body.gp_id;

    const {
      departure_city,
      departure_country,
      arrival_city,
      arrival_country,
      departure_date,
      available_kg,
      price_per_kg,
    } = req.body;

    if (
      !departure_city ||
      !departure_country ||
      !arrival_city ||
      !arrival_country ||
      !departure_date ||
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
        error: "Le nombre de personnes doit être un nombre supérieur à 0.",
      });
    }
    const gp = await createNewGp({
      gp_id,
      departure_city,
      departure_country,
      arrival_city,
      arrival_country,
      departure_date,
      available_kg: available_kgParsed,
      price_per_kg: price_per_kgParsed,
    });

    res.json({
      success: true,
      data: { gp },
    });
  } catch (error) {
    console.error("Erreur dans createNewGpController:", error);
    res.status(500).json({ error: "Server error" });
  }
};
