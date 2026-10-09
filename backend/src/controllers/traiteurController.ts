import { Request, Response } from "express";
import {
  getAuthUserId,
  isValidUUID,
} from "../utils/types";
import {
  createOrderTraiteur,
  createDishesOrder,
  getActiveTraiteur,
  getTraiteurById,
  getTraiteurByUserId,
  createTraiteurProfile,
  updateTraiteurProfile,
  addTraiteurDish,
  updateTraiteurDish,
  deleteTraiteurDish,
  createTraiteurRequest,
  getAllTraiteurRequests,
  getMyTraiteurRequests,
  getTraiteurRequestById,
  cancelTraiteurRequest,
  deleteTraiteurRequest,
  updateTraiteurRequest,
  createTraiteurProposal,
  getMyTraiteurProposals,
  updateTraiteurProposalStatus,
} from "../services/traiteurService";

export const getActiveTraiteurController = async (
  _req: Request,
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
    res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération des traiteurs." });
  }
};

export const getTraiteurByIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de traiteur invalide." });
    }

    const traiteur = await getTraiteurById(id);
    if (!traiteur) {
      return res.status(404).json({
        success: false,
        error: "Traiteur introuvable.",
      });
    }

    res.json({
      success: true,
      data: { traiteur },
    });
  } catch (error) {
    console.error("Erreur dans getTraiteurByIdController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération du traiteur." });
  }
};

export const createCommandeTraiteurController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Sécurité IDOR : l'identifiant client provient STRICTEMENT de l'utilisateur authentifié
    const clientId = getAuthUserId(req);
    if (!clientId) {
      return res.status(401).json({ success: false, error: "Non autorisé. Veuillez vous connecter." });
    }

    const {
      traiteur_id,
      date_evenement,
      nb_personnes,
      adresse,
      type_evenement,
      notes,
    } = req.body;

    if (!traiteur_id || !date_evenement || !nb_personnes || !adresse?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires (traiteur, date, nombre de personnes, adresse).",
      });
    }

    if (!isValidUUID(traiteur_id)) {
      return res.status(400).json({ success: false, error: "Identifiant traiteur invalide." });
    }

    const nbPersonnesParsed = parseInt(String(nb_personnes), 10);
    if (isNaN(nbPersonnesParsed) || nbPersonnesParsed <= 0 || nbPersonnesParsed > 10000) {
      return res.status(400).json({
        success: false,
        error: "Le nombre de personnes doit être un nombre valide entre 1 et 10 000.",
      });
    }

    const parsedDate = new Date(date_evenement);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "La date de l'événement n'est pas valide.",
      });
    }

    const commande = await createOrderTraiteur({
      client_id: clientId,
      traiteur_id,
      date_evenement: parsedDate,
      nb_personnes: nbPersonnesParsed,
      adresse: adresse.trim(),
      type_evenement: type_evenement?.trim(),
      notes: notes?.trim(),
    });

    res.status(201).json({
      success: true,
      data: { commande },
      message: "Demande de devis enregistrée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans createCommandeTraiteurController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const createDishesOrderController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Sécurité IDOR : l'identifiant client provient STRICTEMENT de l'utilisateur authentifié
    const clientId = getAuthUserId(req);
    if (!clientId) {
      return res.status(401).json({ success: false, error: "Non autorisé. Veuillez vous connecter." });
    }

    const {
      traiteur_id,
      delivery_type,
      delivery_address,
      delivery_date,
      notes,
      items,
    } = req.body;

    if (!traiteur_id || !delivery_address?.trim() || !delivery_date) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires (adresse, date).",
      });
    }

    if (!isValidUUID(traiteur_id)) {
      return res.status(400).json({ success: false, error: "Identifiant traiteur invalide." });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Votre commande doit contenir au moins un plat.",
      });
    }

    // Validation stricte des éléments de commande
    for (const item of items) {
      if (!item.dish_id || !isValidUUID(item.dish_id)) {
        return res.status(400).json({ success: false, error: "Identifiant de plat invalide dans la commande." });
      }
      const qty = parseInt(String(item.quantity), 10);
      if (isNaN(qty) || qty <= 0 || qty > 1000) {
        return res.status(400).json({ success: false, error: "Quantité invalide pour l'un des plats." });
      }
    }

    const commande = await createDishesOrder({
      client_id: clientId,
      traiteur_id,
      delivery_type: delivery_type || "delivery",
      delivery_address: delivery_address.trim(),
      delivery_date,
      notes: notes?.trim(),
      items,
    });

    res.status(201).json({
      success: true,
      data: { commande },
      message: "Commande de plats passée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans createDishesOrderController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const getTraiteurProfileController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
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
    res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération du profil." });
  }
};

export const createTraiteurProfileController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const { name, bio, cuisine_type, delivery_zones, whatsapp, image_url } = req.body;

    if (!name?.trim() || !bio?.trim() || !cuisine_type || !Array.isArray(cuisine_type) || cuisine_type.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner le nom, la biographie et au moins un type de cuisine.",
      });
    }

    const traiteur = await createTraiteurProfile(userId, {
      name: name.trim(),
      bio: bio.trim(),
      cuisine_type,
      delivery_zones: Array.isArray(delivery_zones) ? delivery_zones : [],
      whatsapp: whatsapp?.trim(),
      image_url: image_url?.trim(),
    });

    res.status(201).json({
      success: true,
      data: { traiteur },
      message: "Profil traiteur créé avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans createTraiteurProfileController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const updateTraiteurProfileController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const { name, bio, cuisine_type, delivery_zones, whatsapp, image_url } = req.body;

    if (!name?.trim() || !bio?.trim() || !cuisine_type || !Array.isArray(cuisine_type) || cuisine_type.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner le nom, la biographie et au moins un type de cuisine.",
      });
    }

    const traiteur = await updateTraiteurProfile(userId, {
      name: name.trim(),
      bio: bio.trim(),
      cuisine_type,
      delivery_zones: Array.isArray(delivery_zones) ? delivery_zones : [],
      whatsapp: whatsapp?.trim(),
      image_url: image_url?.trim(),
    });

    res.json({
      success: true,
      data: { traiteur },
      message: "Profil traiteur mis à jour avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateTraiteurProfileController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const addTraiteurDishController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
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

    if (!name?.trim() || !description?.trim() || price === undefined || !cuisine_type?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires du plat.",
      });
    }

    const parsedPrice = parseFloat(String(price).replace(",", "."));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        error: "Le prix doit être un nombre valide supérieur ou égal à 0.",
      });
    }

    const dish = await addTraiteurDish(traiteur.id, {
      name: name.trim(),
      description: description.trim(),
      price: parsedPrice,
      cuisine_type: cuisine_type.trim(),
      image_urls: Array.isArray(image_urls) ? image_urls : [],
      is_available: is_available !== undefined ? Boolean(is_available) : true,
    });

    res.status(201).json({
      success: true,
      data: { dish },
      message: "Plat ajouté avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans addTraiteurDishController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const updateTraiteurDishController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    const { dishId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(dishId)) {
      return res.status(400).json({ success: false, error: "Identifiant de plat invalide." });
    }

    const traiteur = await getTraiteurByUserId(userId);
    if (!traiteur) {
      return res.status(403).json({
        success: false,
        error: "Vous devez configurer votre espace traiteur d'abord.",
      });
    }

    const { name, description, price, cuisine_type, image_urls, is_available } = req.body;

    let parsedPrice: number | undefined = undefined;
    if (price !== undefined) {
      parsedPrice = parseFloat(String(price).replace(",", "."));
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          success: false,
          error: "Le prix doit être un nombre valide supérieur ou égal à 0.",
        });
      }
    }

    const dish = await updateTraiteurDish(dishId, traiteur.id, {
      name: name?.trim(),
      description: description?.trim(),
      price: parsedPrice,
      cuisine_type: cuisine_type?.trim(),
      image_urls: Array.isArray(image_urls) ? image_urls : undefined,
      is_available: is_available !== undefined ? Boolean(is_available) : undefined,
    });

    res.json({
      success: true,
      data: { dish },
      message: "Plat mis à jour avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateTraiteurDishController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const deleteTraiteurDishController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    const { dishId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(dishId)) {
      return res.status(400).json({ success: false, error: "Identifiant de plat invalide." });
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
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const createTraiteurRequestController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const {
      event_type,
      guest_count,
      event_date,
      location,
      food_preferences,
      budget,
      description,
      title,
    } = req.body;

    if (!event_type?.trim() || !event_date || !location?.trim() || !food_preferences?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner le type d'événement, la date, le lieu et ce que vous souhaitez en nourriture.",
      });
    }

    const parsedDate = new Date(event_date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: "Date d'événement invalide." });
    }

    let parsedGuestCount: number | null = null;
    if (guest_count !== undefined && guest_count !== null && guest_count !== "") {
      const g = parseInt(String(guest_count), 10);
      if (isNaN(g) || g <= 0) {
        return res.status(400).json({ success: false, error: "Nombre d'invités invalide." });
      }
      parsedGuestCount = g;
    }

    let parsedBudget: number | null = null;
    if (budget !== undefined && budget !== null && budget !== "") {
      const b = parseFloat(String(budget).replace(",", "."));
      if (isNaN(b) || b < 0) {
        return res.status(400).json({ success: false, error: "Budget invalide." });
      }
      parsedBudget = b;
    }

    const request = await createTraiteurRequest(userId, {
      event_type: event_type.trim(),
      guest_count: parsedGuestCount,
      event_date: parsedDate,
      location: location.trim(),
      food_preferences: food_preferences.trim(),
      budget: parsedBudget,
      description: description?.trim() || null,
      title: title?.trim() || null,
    });

    res.status(201).json({
      success: true,
      data: { request },
      message: "Demande publiée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans createTraiteurRequestController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const getAllTraiteurRequestsController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const requests = await getAllTraiteurRequests();
    res.json({
      success: true,
      data: { requests },
    });
  } catch (error: any) {
    console.error("Erreur dans getAllTraiteurRequestsController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération des annonces." });
  }
};

export const getMyTraiteurRequestsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const requests = await getMyTraiteurRequests(userId);
    res.json({
      success: true,
      data: { requests },
    });
  } catch (error: any) {
    console.error("Erreur dans getMyTraiteurRequestsController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération de vos demandes." });
  }
};

export const getTraiteurRequestByIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de demande invalide." });
    }

    const request = await getTraiteurRequestById(id);
    if (!request) {
      return res.status(404).json({ success: false, error: "Demande introuvable." });
    }

    res.json({
      success: true,
      data: { request },
    });
  } catch (error: any) {
    console.error("Erreur dans getTraiteurRequestByIdController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur." });
  }
};

export const cancelTraiteurRequestController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de demande invalide." });
    }

    const request = await cancelTraiteurRequest(id, userId);
    res.json({
      success: true,
      data: { request },
      message: "Demande annulée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans cancelTraiteurRequestController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const deleteTraiteurRequestController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de demande invalide." });
    }

    const result = await deleteTraiteurRequest(id, userId);
    res.json({
      success: true,
      data: result,
      message: "Annonce supprimée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans deleteTraiteurRequestController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const updateTraiteurRequestController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de demande invalide." });
    }

    const {
      title,
      event_type,
      guest_count,
      event_date,
      location,
      food_preferences,
      budget,
      description,
    } = req.body;

    let parsedGuestCount: number | null | undefined = undefined;
    if (guest_count !== undefined) {
      if (guest_count === null || guest_count === "") {
        parsedGuestCount = null;
      } else {
        const g = parseInt(String(guest_count), 10);
        if (isNaN(g) || g <= 0) {
          return res.status(400).json({ success: false, error: "Nombre d'invités invalide." });
        }
        parsedGuestCount = g;
      }
    }

    let parsedBudget: number | null | undefined = undefined;
    if (budget !== undefined) {
      if (budget === null || budget === "") {
        parsedBudget = null;
      } else {
        const b = parseFloat(String(budget).replace(",", "."));
        if (isNaN(b) || b < 0) {
          return res.status(400).json({ success: false, error: "Budget invalide." });
        }
        parsedBudget = b;
      }
    }

    const request = await updateTraiteurRequest(id, userId, {
      title: title?.trim(),
      event_type: event_type?.trim(),
      guest_count: parsedGuestCount,
      event_date,
      location: location?.trim(),
      food_preferences: food_preferences?.trim(),
      budget: parsedBudget,
      description: description !== undefined ? description?.trim() : undefined,
    });

    res.json({
      success: true,
      data: { request },
      message: "Demande mise à jour avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateTraiteurRequestController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const createTraiteurProposalController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    const { requestId } = req.params;
    const { proposed_price, message } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(requestId)) {
      return res.status(400).json({ success: false, error: "Identifiant de demande invalide." });
    }

    if (!proposed_price || !message?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Veuillez indiquer un prix proposé et une description détaillée de votre proposition.",
      });
    }

    const parsedPrice = parseFloat(String(proposed_price).replace(",", "."));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: "Le prix proposé doit être un montant supérieur à 0.",
      });
    }

    const proposal = await createTraiteurProposal(userId, requestId, {
      proposed_price: parsedPrice,
      message: message.trim(),
    });

    res.status(201).json({
      success: true,
      data: { proposal },
      message: "Proposition transmise avec succès au client.",
    });
  } catch (error: any) {
    console.error("Erreur dans createTraiteurProposalController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};

export const getMyTraiteurProposalsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const proposals = await getMyTraiteurProposals(userId);
    res.json({
      success: true,
      data: { proposals },
    });
  } catch (error: any) {
    console.error("Erreur dans getMyTraiteurProposalsController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur." });
  }
};

export const updateTraiteurProposalStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de proposition invalide." });
    }

    if (!["accepted", "rejected", "acceptee", "refusee"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Statut invalide (accepted ou rejected requis).",
      });
    }

    const proposal = await updateTraiteurProposalStatus(id, userId, status);
    res.json({
      success: true,
      data: { proposal },
      message: status.includes("accept")
        ? "Proposition acceptée avec succès !"
        : "Proposition déclinée.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateTraiteurProposalStatusController:", error);
    res.status(500).json({ success: false, error: error.message || "Erreur serveur." });
  }
};
