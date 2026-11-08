import { Request, Response } from "express";
import {
  ACOMPTE_MAX_POURCENTAGE,
  DevisConditionsInput,
  NEGOCIATION_MESSAGE_MAX_LENGTH,
  getAuthUserId,
  isUserAdmin,
  isValidUUID,
  parseDevisConditionsInput,
} from "../utils/types";
import {
  isOptionalTextWithin,
  isRequiredTextWithin,
  isStringArrayWithin,
  isValidPhone,
  parseStrictBoolean,
  sendErrorResponse,
} from "../utils/validation";

const MAX_GUEST_COUNT = 10000;
const MAX_REQUEST_BUDGET = 10000000;
const MAX_PROPOSAL_PRICE = 1000000;

/** Montant saisi (nombre, « 1500 », « 1 500,50 ») : nombre arrondi au centime, sinon NaN. */
const parseAmount = (value: unknown): number => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value.replace(/[\s\u00a0\u202f]/g, "").replace(",", "."))
        : NaN;
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : NaN;
};

/** Message facultatif d'une étape de négociation : texte nettoyé, ou null s'il est vide. */
const toOptionalMessage = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * Nombre d'invités : entier entre 1 et 10 000. Retourne null si la valeur est vide,
 * undefined si elle est invalide.
 */
const parseGuestCount = (value: unknown): number | null | undefined => {
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_GUEST_COUNT) return undefined;
  return parsed;
};

/** Budget : montant positif borné. Retourne null si la valeur est vide, undefined si elle est invalide. */
const parseBudget = (value: unknown): number | null | undefined => {
  if (value === null || value === "") return null;
  const parsed = parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_REQUEST_BUDGET) return undefined;
  return parsed;
};

/** Valide les champs communs à la création / mise à jour d'un profil traiteur. */
const validateTraiteurProfilePayload = (body: any): string | null => {
  const { name, bio, cuisine_type, delivery_zones, whatsapp, image_url } = body;
  if (
    !isRequiredTextWithin(name, 100) ||
    !isRequiredTextWithin(bio, 2000) ||
    !isStringArrayWithin(cuisine_type, 20, 60) ||
    cuisine_type.length === 0
  ) {
    return "Veuillez renseigner le nom (100 caractères max), la biographie (2 000 caractères max) et au moins un type de cuisine.";
  }
  if (Array.isArray(delivery_zones) && !isStringArrayWithin(delivery_zones, 50, 100)) {
    return "Zones de livraison invalides.";
  }
  if (whatsapp !== undefined && whatsapp !== null && whatsapp !== "" && !isValidPhone(whatsapp)) {
    return "Numéro WhatsApp invalide.";
  }
  if (!isOptionalTextWithin(image_url, 2048)) {
    return "Image de profil invalide.";
  }
  return null;
};

/** Valide les champs texte d'un plat (création complète ou mise à jour partielle). */
const validateDishPayload = (body: any): string | null => {
  const { name, description, cuisine_type, image_urls } = body;
  if (name !== undefined && !isRequiredTextWithin(name, 120)) {
    return "Le nom du plat est invalide (120 caractères max).";
  }
  if (!isOptionalTextWithin(description, 2000)) {
    return "La description du plat est trop longue (2 000 caractères max).";
  }
  if (!isOptionalTextWithin(cuisine_type, 60)) {
    return "Type de cuisine invalide.";
  }
  if (image_urls !== undefined && image_urls !== null && !isStringArrayWithin(image_urls, 10, 2048)) {
    return "Images invalides (10 maximum).";
  }
  return null;
};

const MAX_DISH_PRICE = 100000;
import {
  createOrderTraiteur,
  createDishesOrder,
  getActiveTraiteur,
  getTraiteurById,
  getTraiteurByUserId,
  getTraiteurIdByUserId,
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
  createCounterOffer,
  keepProposalPrice,
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

    if (!traiteur_id || !date_evenement || !nb_personnes || !isRequiredTextWithin(adresse, 300)) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires (traiteur, date, nombre de personnes, adresse).",
      });
    }

    if (!isOptionalTextWithin(type_evenement, 100) || !isOptionalTextWithin(notes, 3000)) {
      return res.status(400).json({
        success: false,
        error: "Le type d'événement (100 caractères max) ou les notes (3 000 caractères max) sont invalides.",
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

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (parsedDate.getTime() < startOfToday.getTime()) {
      return res.status(400).json({
        success: false,
        error: "La date de l'événement ne peut pas être dans le passé.",
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
    sendErrorResponse(res, error, "Erreur serveur.");
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

    if (!traiteur_id || !isRequiredTextWithin(delivery_address, 300) || !delivery_date) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires (adresse, date).",
      });
    }

    if (delivery_type !== undefined && delivery_type !== "delivery" && delivery_type !== "pickup") {
      return res.status(400).json({ success: false, error: "Mode de livraison invalide." });
    }

    if (!isOptionalTextWithin(notes, 2000)) {
      return res.status(400).json({ success: false, error: "Les notes ne doivent pas dépasser 2 000 caractères." });
    }

    if (!isValidUUID(traiteur_id)) {
      return res.status(400).json({ success: false, error: "Identifiant traiteur invalide." });
    }

    const parsedDeliveryDate = new Date(delivery_date);
    if (isNaN(parsedDeliveryDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Date ou heure de livraison invalide.",
      });
    }

    // Tolérance de 5 minutes pour d'éventuels décalages d'horloge entre client et serveur
    const nowWithTolerance = Date.now() - 5 * 60 * 1000;
    if (parsedDeliveryDate.getTime() < nowWithTolerance) {
      return res.status(400).json({
        success: false,
        error: "L'heure de livraison ne peut pas être antérieure à l'heure actuelle.",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0 || items.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Votre commande doit contenir au moins un plat.",
      });
    }

    // Validation stricte des éléments de commande
    for (const item of items) {
      if (!item || typeof item !== "object" || !item.dish_id || !isValidUUID(item.dish_id)) {
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
    sendErrorResponse(res, error, "Erreur serveur.");
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

    const validationError = validateTraiteurProfilePayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
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
    sendErrorResponse(res, error, "Erreur serveur.");
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

    const validationError = validateTraiteurProfilePayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
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
    sendErrorResponse(res, error, "Erreur serveur.");
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

    if (
      !isRequiredTextWithin(name, 120) ||
      !isRequiredTextWithin(description, 2000) ||
      price === undefined ||
      !isRequiredTextWithin(cuisine_type, 60)
    ) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner tous les champs obligatoires du plat.",
      });
    }

    const dishValidationError = validateDishPayload(req.body);
    if (dishValidationError) {
      return res.status(400).json({ success: false, error: dishValidationError });
    }

    const parsedPrice = parseFloat(String(price).replace(",", "."));
    if (isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > MAX_DISH_PRICE) {
      return res.status(400).json({
        success: false,
        error: "Le prix doit être un nombre valide supérieur ou égal à 0.",
      });
    }

    // Booléen strict : "false" ne doit pas rendre le plat disponible
    const availability = parseStrictBoolean(is_available);
    if (availability === null) {
      return res.status(400).json({ success: false, error: "La disponibilité du plat doit valoir true ou false." });
    }

    const dish = await addTraiteurDish(traiteur.id, {
      name: name.trim(),
      description: description.trim(),
      price: parsedPrice,
      cuisine_type: cuisine_type.trim(),
      image_urls: Array.isArray(image_urls) ? image_urls : [],
      is_available: availability ?? true,
    });

    res.status(201).json({
      success: true,
      data: { dish },
      message: "Plat ajouté avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans addTraiteurDishController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
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

    const dishValidationError = validateDishPayload(req.body);
    if (dishValidationError) {
      return res.status(400).json({ success: false, error: dishValidationError });
    }

    let parsedPrice: number | undefined = undefined;
    if (price !== undefined) {
      parsedPrice = parseFloat(String(price).replace(",", "."));
      if (isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > MAX_DISH_PRICE) {
        return res.status(400).json({
          success: false,
          error: "Le prix doit être un nombre valide supérieur ou égal à 0.",
        });
      }
    }

    // Booléen strict : "false" ne doit pas rendre le plat disponible
    const availability = parseStrictBoolean(is_available);
    if (availability === null) {
      return res.status(400).json({ success: false, error: "La disponibilité du plat doit valoir true ou false." });
    }

    const dish = await updateTraiteurDish(dishId, traiteur.id, {
      name: name?.trim(),
      description: description?.trim(),
      price: parsedPrice,
      cuisine_type: cuisine_type?.trim(),
      image_urls: Array.isArray(image_urls) ? image_urls : undefined,
      is_available: availability,
    });

    res.json({
      success: true,
      data: { dish },
      message: "Plat mis à jour avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateTraiteurDishController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
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
    sendErrorResponse(res, error, "Erreur serveur.");
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

    if (
      !isRequiredTextWithin(event_type, 100) ||
      !event_date ||
      !isRequiredTextWithin(location, 300) ||
      !isRequiredTextWithin(food_preferences, 2000)
    ) {
      return res.status(400).json({
        success: false,
        error: "Veuillez renseigner le type d'événement, la date, le lieu et ce que vous souhaitez en nourriture.",
      });
    }

    if (!isOptionalTextWithin(description, 3000) || !isOptionalTextWithin(title, 150)) {
      return res.status(400).json({
        success: false,
        error: "Le titre (150 caractères max) ou la description (3 000 caractères max) sont trop longs.",
      });
    }

    const parsedDate = new Date(event_date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: "Date d'événement invalide." });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (parsedDate.getTime() < startOfToday.getTime()) {
      return res.status(400).json({
        success: false,
        error: "La date de l'événement ne peut pas être dans le passé.",
      });
    }

    const parsedGuestCount = guest_count === undefined ? null : parseGuestCount(guest_count);
    if (parsedGuestCount === undefined) {
      return res.status(400).json({
        success: false,
        error: `Nombre d'invités invalide (nombre entier entre 1 et ${MAX_GUEST_COUNT.toLocaleString("fr-FR")}).`,
      });
    }

    const parsedBudget = budget === undefined ? null : parseBudget(budget);
    if (parsedBudget === undefined) {
      return res.status(400).json({ success: false, error: "Budget invalide." });
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
    sendErrorResponse(res, error, "Erreur serveur.");
  }
};

export const getAllTraiteurRequestsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Connexion requise.", message: "Connexion requise." });
    }

    // Les demandes des clients ne sont consultables que par les traiteurs (et les administrateurs)
    const ownTraiteurId = await getTraiteurIdByUserId(userId);
    if (!ownTraiteurId && !isUserAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: "Les demandes des clients sont réservées aux traiteurs : créez votre espace traiteur pour y répondre.",
      });
    }

    const requests = await getAllTraiteurRequests(ownTraiteurId, userId);
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

    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const request = await getTraiteurRequestById(id, userId, isUserAdmin(req));
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

    const result = await deleteTraiteurRequest(id, userId);
    res.json({
      success: true,
      data: result,
      message: "Annonce annulée et supprimée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans cancelTraiteurRequestController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
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
    sendErrorResponse(res, error, "Erreur serveur.");
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

    if (
      !isOptionalTextWithin(title, 150) ||
      !isOptionalTextWithin(event_type, 100) ||
      !isOptionalTextWithin(location, 300) ||
      !isOptionalTextWithin(food_preferences, 2000) ||
      !isOptionalTextWithin(description, 3000)
    ) {
      return res.status(400).json({ success: false, error: "Certains champs sont invalides ou trop longs." });
    }

    if (event_date !== undefined && event_date !== null && event_date !== "") {
      const parsedDate = new Date(event_date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, error: "Date d'événement invalide." });
      }
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (parsedDate.getTime() < startOfToday.getTime()) {
        return res.status(400).json({
          success: false,
          error: "La date de l'événement ne peut pas être dans le passé.",
        });
      }
    }

    let parsedGuestCount: number | null | undefined = undefined;
    if (guest_count !== undefined) {
      parsedGuestCount = parseGuestCount(guest_count);
      if (parsedGuestCount === undefined) {
        return res.status(400).json({
          success: false,
          error: `Nombre d'invités invalide (nombre entier entre 1 et ${MAX_GUEST_COUNT.toLocaleString("fr-FR")}).`,
        });
      }
    }

    let parsedBudget: number | null | undefined = undefined;
    if (budget !== undefined) {
      parsedBudget = parseBudget(budget);
      if (parsedBudget === undefined) {
        return res.status(400).json({ success: false, error: "Budget invalide." });
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
    sendErrorResponse(res, error, "Erreur serveur.");
  }
};

export const createTraiteurProposalController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    const { requestId } = req.params;
    const { proposed_price, message, conditions_devis, traiteur_signature } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(requestId)) {
      return res.status(400).json({ success: false, error: "Identifiant de demande invalide." });
    }

    if (!proposed_price || !isRequiredTextWithin(message, 3000)) {
      return res.status(400).json({
        success: false,
        error: "Veuillez indiquer un prix proposé et une description détaillée de votre proposition (3 000 caractères max).",
      });
    }

    // Lecture stricte (« 1 500 » ou « 12abc » ne deviennent pas 1 € ou 12 €), arrondie au centime
    const parsedPrice = parseAmount(proposed_price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || parsedPrice > MAX_PROPOSAL_PRICE) {
      return res.status(400).json({
        success: false,
        error: "Le prix proposé doit être un montant supérieur à 0.",
      });
    }

    // La proposition est un devis signé : conditions d'acompte et signature du traiteur obligatoires
    if (!isRequiredTextWithin(traiteur_signature, 120)) {
      return res.status(400).json({
        success: false,
        error: "Signez votre proposition (prénom et nom) : elle vous engage sur le prix et les conditions du devis.",
      });
    }
    if (typeof conditions_devis !== "string" && (typeof conditions_devis !== "object" || conditions_devis === null)) {
      return res.status(400).json({ success: false, error: "Précisez les conditions d'acompte du devis." });
    }
    const parsedConditions = parseDevisConditionsInput(
      typeof conditions_devis === "string" ? conditions_devis : JSON.stringify(conditions_devis),
    );
    if (parsedConditions.error) {
      return res.status(400).json({ success: false, error: parsedConditions.error });
    }
    const conditions: DevisConditionsInput = parsedConditions.value ?? {};
    if (!conditions.acompte_type) {
      return res.status(400).json({
        success: false,
        error: "Précisez les conditions d'acompte (sans acompte, acompte facultatif ou obligatoire).",
      });
    }
    if (conditions.acompte_type !== "aucun" && !((conditions.acompte_pourcentage ?? 0) > 0)) {
      return res.status(400).json({
        success: false,
        error: `Indiquez le pourcentage d'acompte (entre 1 et ${ACOMPTE_MAX_POURCENTAGE} %).`,
      });
    }

    const proposal = await createTraiteurProposal(userId, requestId, {
      proposed_price: parsedPrice,
      message: message.trim(),
      conditions,
      traiteur_signature: traiteur_signature.trim(),
    });

    res.status(201).json({
      success: true,
      data: { proposal },
      message: "Devis signé envoyé au client.",
    });
  } catch (error: any) {
    console.error("Erreur dans createTraiteurProposalController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
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

/** Contre-proposition du client : un montant plus bas que le devis reçu, avec un message facultatif. */
export const createCounterOfferController = async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de proposition invalide." });
    }

    const { prix, message, prix_devis_attendu } = req.body ?? {};
    const amount = parseAmount(prix);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_PROPOSAL_PRICE) {
      return res.status(400).json({ success: false, error: "Indiquez le montant que vous proposez, en euros." });
    }
    if (!isOptionalTextWithin(message, NEGOCIATION_MESSAGE_MAX_LENGTH)) {
      return res.status(400).json({
        success: false,
        error: `Votre message ne doit pas dépasser ${NEGOCIATION_MESSAGE_MAX_LENGTH} caractères.`,
      });
    }
    let expectedPrice: number | undefined;
    if (prix_devis_attendu !== undefined && prix_devis_attendu !== null && prix_devis_attendu !== "") {
      expectedPrice = parseAmount(prix_devis_attendu);
      if (!Number.isFinite(expectedPrice)) {
        return res.status(400).json({ success: false, error: "Montant du devis invalide." });
      }
    }

    const proposal = await createCounterOffer(id, userId, {
      prix: amount,
      message: toOptionalMessage(message),
      expectedPrice,
    });
    res.status(201).json({
      success: true,
      data: { proposal },
      message: "Contre-proposition envoyée au traiteur.",
    });
  } catch (error: any) {
    console.error("Erreur dans createCounterOfferController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
  }
};

/** Réponse du traiteur à une contre-proposition : il maintient son devis, avec un message facultatif. */
export const keepProposalPriceController = async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }
    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de proposition invalide." });
    }
    const { message } = req.body ?? {};
    if (!isOptionalTextWithin(message, NEGOCIATION_MESSAGE_MAX_LENGTH)) {
      return res.status(400).json({
        success: false,
        error: `Votre message ne doit pas dépasser ${NEGOCIATION_MESSAGE_MAX_LENGTH} caractères.`,
      });
    }

    const proposal = await keepProposalPrice(id, userId, { message: toOptionalMessage(message) });
    res.json({
      success: true,
      data: { proposal },
      message: "Réponse envoyée : votre devis est maintenu.",
    });
  } catch (error: any) {
    console.error("Erreur dans keepProposalPriceController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
  }
};

export const updateTraiteurProposalStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;
    const { status, client_signature, prix_devis_attendu, devis_signe_le } = req.body;

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

    // Accepter une offre, c'est signer le devis : signature du client obligatoire, sur le montant lu
    const isAcceptance = status === "accepted" || status === "acceptee";
    if (isAcceptance && !isRequiredTextWithin(client_signature, 120)) {
      return res.status(400).json({
        success: false,
        error: "Signez le devis (prénom et nom) pour accepter cette offre.",
      });
    }
    // La signature porte sur le montant que le client a lu : obligatoire pour accepter (une offre
    // modifiée entre-temps, par un nouveau devis, est alors refusée)
    let expectedPrice: number | undefined;
    let expectedSignedAt: string | null | undefined;
    if (isAcceptance) {
      expectedPrice = parseAmount(prix_devis_attendu);
      if (!Number.isFinite(expectedPrice)) {
        return res.status(400).json({
          success: false,
          error: "Montant du devis manquant : actualisez la page puis signez à nouveau.",
        });
      }
      // Version du devis lue par le client : date de signature du traiteur (null pour une ancienne
      // offre non signée). Un nouveau devis envoyé depuis, même au même prix, fait refuser la signature.
      const validVersion =
        devis_signe_le === null ||
        (typeof devis_signe_le === "string" && !Number.isNaN(new Date(devis_signe_le).getTime()));
      if (!validVersion) {
        return res.status(400).json({
          success: false,
          error: "Devis non identifié : actualisez la page puis signez à nouveau.",
        });
      }
      expectedSignedAt = devis_signe_le;
    }

    const proposal = await updateTraiteurProposalStatus(id, userId, status, {
      clientSignature: isAcceptance ? client_signature : undefined,
      expectedPrice,
      expectedSignedAt,
    });
    res.json({
      success: true,
      // commande_id : devis créé à partir de l'offre acceptée, signé par le client (et par le traiteur
      // quand sa proposition était signée)
      data: { proposal, commande_id: proposal.commande_id },
      message: !isAcceptance
        ? "Proposition déclinée."
        : proposal.devis_fully_signed
          ? "Devis signé par les deux parties : la prestation est confirmée."
          : "Devis signé : le traiteur doit encore le signer.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateTraiteurProposalStatusController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
  }
};
