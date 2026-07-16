import { Request, Response } from "express";
import {
  deleteTraiteur,
  getAllTraiteur,
  updateStateTraiteur,
  createTraiteurFromUser,
  getAllGp,
  updateStateGp,
  deleteGp,
  createGpFromUser,
} from "../services/adminService";

export const getAllTraiteurController = async (req: Request, res: Response) => {
  try {
    const traiteur = await getAllTraiteur();

    res.json({
      success: true,
      data: { traiteur },
    });
  } catch (error) {
    console.error("Erreur dans getAllTraiteurController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateStateTraiteurController = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = req.body.traiteur_id;
    const is_active: boolean = req.body.is_active;
    if (!id || is_active === undefined) {
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
    if (!id) {
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
      !user_id ||
      !name ||
      !bio ||
      !cuisine_type ||
      cuisine_type.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Veuillez renseigner tous les champs obligatoires (user_id, name, bio, cuisine_type).",
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
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllGpController = async (req: Request, res: Response) => {
  try {
    const gp = await getAllGp();

    res.json({
      success: true,
      data: { gp },
    });
  } catch (error) {
    console.error("Erreur dans getAllGpController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateStateGpController = async (req: Request, res: Response) => {
  try {
    const id = req.body.gp_id;
    const is_active: boolean = req.body.is_active;

    if (!id || is_active === undefined) {
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

export const deleteGpController = async (req: Request, res: Response) => {
  try {
    const id = req.body.gp_id;

    if (!id) {
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
      !user_id ||
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
    res.status(500).json({ success: false, error: error.message });
  }
};

// export const createNewUserController = async (req: Request, res: Response) => {
//   try {
//     const user = await createNewUser();

//     res.json({
//       success: true,
//       data: { user },
//     });
//   } catch (error) {
//     console.error("Erreur dans getAllTraiteurController:", error);
//     res.status(500).json({ error: "Server error" });
//   }
// };
