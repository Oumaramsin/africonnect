import { Request, Response } from "express";
import {
  getAuthUserId,
  isUserAdmin,
  isValidUUID,
} from "../utils/types";
import {
  createGpOrder,
  createNewGp,
  deleteGpListing,
  getAllGp,
  getGpById,
  getGpByUserId,
  updateGpListing,
} from "../services/gpService";
import { updateGpListingDelay } from "../services/commandeService";

export const getAllGpController = async (_req: Request, res: Response) => {
  try {
    const gpListings = await getAllGp();
    const gp = gpListings.map((item: any) => ({
      ...item,
      profiles: item.gp || null,
    }));

    res.json({
      success: true,
      data: { gp },
    });
  } catch (error) {
    console.error("Erreur dans getAllGpController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération des annonces GP." });
  }
};

export const getGpByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant d'annonce GP invalide." });
    }

    const gpItem = await getGpById(id);
    if (!gpItem) {
      return res.status(404).json({
        success: false,
        error: "Annonce GP introuvable.",
      });
    }

    const gp = {
      ...gpItem,
      profiles: (gpItem as any).gp || null,
    };

    res.json({
      success: true,
      data: { gp },
    });
  } catch (error) {
    console.error("Erreur dans getGpByIdController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération de l'annonce GP." });
  }
};

export const createGpOrderController = async (req: Request, res: Response) => {
  try {
    // Sécurité IDOR : l'expéditeur est STRICTEMENT l'utilisateur authentifié
    const senderId = getAuthUserId(req);
    if (!senderId) {
      return res.status(401).json({ success: false, error: "Non autorisé. Veuillez vous connecter." });
    }

    const listing_id = req.params.id;
    if (!isValidUUID(listing_id)) {
      return res.status(400).json({ success: false, error: "Identifiant de trajet GP invalide." });
    }

    const {
      weight_kg,
      content_desc,
      declared_value,
      notes,
      total_amount,
    } = req.body;

    if (!weight_kg || !content_desc?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner le poids en kg et la description du contenu du colis.",
      });
    }

    const weight_kgParsed = parseFloat(String(weight_kg).replace(",", "."));
    if (isNaN(weight_kgParsed) || weight_kgParsed <= 0 || weight_kgParsed > 500) {
      return res.status(400).json({
        success: false,
        error: "Le poids doit être un nombre valide supérieur à 0 (max 500 kg).",
      });
    }

    let declared_valueParsed: number | undefined = undefined;
    if (declared_value !== undefined && declared_value !== null && declared_value !== "") {
      const dv = parseFloat(String(declared_value).replace(",", "."));
      if (isNaN(dv) || dv < 0) {
        return res.status(400).json({
          success: false,
          error: "La valeur déclarée doit être un montant positif.",
        });
      }
      declared_valueParsed = dv;
    }

    let total_amountParsed: number | undefined = undefined;
    if (total_amount !== undefined && total_amount !== null && total_amount !== "") {
      const ta = parseFloat(String(total_amount).replace(",", "."));
      if (isNaN(ta) || ta <= 0) {
        return res.status(400).json({
          success: false,
          error: "Le montant total doit être un nombre supérieur à 0.",
        });
      }
      total_amountParsed = ta;
    }

    const gp = await createGpOrder({
      sender_id: senderId,
      listing_id,
      weight_kg: weight_kgParsed,
      declared_value: declared_valueParsed,
      content_desc: content_desc.trim(),
      notes: notes?.trim(),
      total_amount: total_amountParsed,
    });

    res.status(201).json({
      success: true,
      data: { gp },
      message: "Demande de transport GP transmise avec succès au transporteur.",
    });
  } catch (error: any) {
    console.error("Erreur dans createGpOrderController:", error);
    res.status(400).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const createNewGpController = async (req: Request, res: Response) => {
  try {
    // Sécurité IDOR : le transporteur est STRICTEMENT l'utilisateur authentifié
    const gpId = getAuthUserId(req);
    if (!gpId) {
      return res.status(401).json({ success: false, error: "Non autorisé. Veuillez vous connecter." });
    }

    const {
      departure_city,
      departure_country,
      arrival_city,
      arrival_country,
      departure_date,
      arrival_date,
      available_kg,
      price_per_kg,
      flight_type,
      pickup_address,
      pickup_city,
      dropoff_address,
      dropoff_city,
      description,
    } = req.body;

    if (
      !departure_city?.trim() ||
      !departure_country?.trim() ||
      !arrival_city?.trim() ||
      !arrival_country?.trim() ||
      !departure_date ||
      available_kg === undefined ||
      price_per_kg === undefined ||
      !pickup_address?.trim() ||
      !dropoff_address?.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires (villes, pays, dates, kilos, prix et adresses).",
      });
    }

    if (
      departure_country.trim().toLowerCase() ===
      arrival_country.trim().toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        error: "Le pays de départ et le pays d'arrivée doivent être différents.",
      });
    }

    const available_kgParsed = parseFloat(String(available_kg).replace(",", "."));
    const price_per_kgParsed = parseFloat(String(price_per_kg).replace(",", "."));

    if (
      isNaN(available_kgParsed) ||
      available_kgParsed <= 0 ||
      available_kgParsed > 1000 ||
      isNaN(price_per_kgParsed) ||
      price_per_kgParsed <= 0
    ) {
      return res.status(400).json({
        success: false,
        error: "Les kilos disponibles et le prix au kilo doivent être des nombres supérieurs à 0.",
      });
    }

    const depDate = new Date(departure_date);
    if (isNaN(depDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "La date de départ n'est pas valide.",
      });
    }

    let arrDate: Date | null = null;
    if (arrival_date) {
      arrDate = new Date(arrival_date);
      if (isNaN(arrDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: "La date d'arrivée n'est pas valide.",
        });
      }
      if (arrDate < depDate) {
        return res.status(400).json({
          success: false,
          error: "La date d'arrivée ne peut pas être antérieure à la date de départ.",
        });
      }
    }

    const gp = await createNewGp({
      gp_id: gpId,
      departure_city: departure_city.trim(),
      departure_country: departure_country.trim(),
      arrival_city: arrival_city.trim(),
      arrival_country: arrival_country.trim(),
      departure_date: depDate,
      arrival_date: arrDate,
      available_kg: available_kgParsed,
      price_per_kg: price_per_kgParsed,
      flight_type: flight_type || "direct",
      pickup_address: pickup_address.trim(),
      pickup_city: pickup_city?.trim() || departure_city.trim(),
      dropoff_address: dropoff_address.trim(),
      dropoff_city: dropoff_city?.trim() || arrival_city.trim(),
      description: description?.trim() || undefined,
    });

    res.status(201).json({
      success: true,
      data: { gp },
      message: "Annonce de transport GP publiée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans createNewGpController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const getUserGpListingsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const gp_id = getAuthUserId(req);
    if (!gp_id) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const gp = await getGpByUserId(gp_id);
    res.json({
      success: true,
      data: { gp },
    });
  } catch (error) {
    console.error("Erreur dans getUserGpListingsController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération de vos annonces." });
  }
};

export const updateGpListingController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const userId = getAuthUserId(req);
    const isAdmin = isUserAdmin(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant d'annonce GP invalide." });
    }

    const body = req.body;

    if (body.available_kg !== undefined) {
      const parsed = parseFloat(String(body.available_kg).replace(",", "."));
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ success: false, error: "Kilos disponibles invalides." });
      }
      body.available_kg = parsed;
    }

    if (body.price_per_kg !== undefined) {
      const parsed = parseFloat(String(body.price_per_kg).replace(",", "."));
      if (isNaN(parsed) || parsed <= 0) {
        return res.status(400).json({ success: false, error: "Prix au kilo invalide." });
      }
      body.price_per_kg = parsed;
    }

    if (
      body.departure_country &&
      body.arrival_country &&
      body.departure_country.trim().toLowerCase() ===
        body.arrival_country.trim().toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        error: "Le pays de départ et le pays d'arrivée doivent être différents.",
      });
    }

    if (body.pickup_address !== undefined && !body.pickup_address?.trim()) {
      return res.status(400).json({
        success: false,
        error: "L'adresse de dépôt du colis est obligatoire.",
      });
    }

    if (body.dropoff_address !== undefined && !body.dropoff_address?.trim()) {
      return res.status(400).json({
        success: false,
        error: "L'adresse de récupération du colis est obligatoire.",
      });
    }

    const gp = await updateGpListing(id, userId, isAdmin, body);

    res.json({
      success: true,
      data: { gp },
      message: "Annonce GP mise à jour avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateGpListingController:", error);
    res.status(400).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const deleteGpListingController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const userId = getAuthUserId(req);
    const isAdmin = isUserAdmin(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant d'annonce GP invalide." });
    }

    await deleteGpListing(id, userId, isAdmin);

    res.json({
      success: true,
      message: "Annonce supprimée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans deleteGpListingController:", error);
    res.status(400).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const updateGpListingDelayController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const userId = getAuthUserId(req);
    const isAdmin = isUserAdmin(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant d'annonce GP invalide." });
    }

    const { arrival_date, delay_reason } = req.body;

    if (!arrival_date) {
      return res.status(400).json({
        success: false,
        error: "La nouvelle date d'arrivée est requise.",
      });
    }

    const parsedDate = new Date(arrival_date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "La date d'arrivée n'est pas valide.",
      });
    }

    const gp = await updateGpListingDelay(
      id,
      { arrival_date, delay_reason: delay_reason?.trim() },
      userId,
      isAdmin,
    );

    res.json({
      success: true,
      data: { gp },
      message: "Retard d'acheminement signalé à tous les expéditeurs.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateGpListingDelayController:", error);
    res.status(400).json({
      success: false,
      error: error.message || "Erreur lors de l'enregistrement du retard.",
    });
  }
};
