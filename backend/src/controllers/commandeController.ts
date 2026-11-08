import { Request, Response } from "express";
import {
  getPublicErrorMessage,
  isOptionalTextWithin,
  parseStrictBoolean,
  sendErrorResponse,
} from "../utils/validation";
import {
  getAuthUserId,
  isUserAdmin,
  isValidUUID,
  COMMANDE_TRAITEUR_STATUS,
  DevisConditionsInput,
  parseDevisConditionsInput,
  ORDER_PLAT_STATUS,
  GP_REQUEST_STATUS,
} from "../utils/types";
import {
  getAllOrderById,
  getRecentOrderByClientId,
  updateCommandeTraiteurStatus,
  updateGpRequestStatus,
  updateOrderPlatStatus,
  updateClientCommandeTraiteur,
  updateClientOrderPlat,
  updateClientGpRequest,
  cancelClientOrder,
  getSingleOrderPlat,
  getSingleCommandeTraiteur,
  getSingleGpRequest,
  updateGpRequestDelay,
  setupCommandeTraiteurDevis,
  signCommandeTraiteurDevis,
  refuseCommandeTraiteurDevis,
  payerAcompteCommandeTraiteurDevis,
} from "../services/commandeService";

export const getRecentOrderByClientIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Sécurité IDOR : uniquement l'utilisateur authentifié
    const clientId = getAuthUserId(req);
    if (!clientId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const orders = await getRecentOrderByClientId(clientId);
    res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error("Erreur dans getRecentOrderByClientIdController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération des commandes récentes." });
  }
};

export const getOrderByClientIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    // Sécurité IDOR : uniquement l'utilisateur authentifié
    const clientId = getAuthUserId(req);
    if (!clientId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    const orders = await getAllOrderById(clientId);
    res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error("Erreur dans getOrderByClientIdController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération des commandes." });
  }
};

export const updateCommandeTraiteurStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { statut, message_traiteur } = req.body;
    const userId = getAuthUserId(req);
    const isAdmin = isUserAdmin(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de commande invalide." });
    }

    const allowedStatuses: string[] = Object.values(COMMANDE_TRAITEUR_STATUS);
    if (!statut || !allowedStatuses.includes(statut)) {
      return res.status(400).json({
        success: false,
        error: `Statut invalide. Statuts autorisés : ${allowedStatuses.join(", ")}`,
      });
    }

    if (!isOptionalTextWithin(message_traiteur, 1000)) {
      return res.status(400).json({ success: false, error: "Le message ne doit pas dépasser 1 000 caractères." });
    }

    const commande = await updateCommandeTraiteurStatus(
      id,
      statut,
      message_traiteur?.trim(),
      userId,
      isAdmin,
    );

    res.json({
      success: true,
      data: { commande },
      message: "Statut de la commande mis à jour avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateCommandeTraiteurStatusController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
  }
};

export const updateOrderPlatStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { status, message, notes } = req.body;
    const userId = getAuthUserId(req);
    const isAdmin = isUserAdmin(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de commande invalide." });
    }

    const allowedStatuses: string[] = Object.values(ORDER_PLAT_STATUS);
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Statut invalide. Statuts autorisés : ${allowedStatuses.join(", ")}`,
      });
    }

    if (!isOptionalTextWithin(message, 1000) || !isOptionalTextWithin(notes, 1000)) {
      return res.status(400).json({ success: false, error: "Le message ne doit pas dépasser 1 000 caractères." });
    }

    const order = await updateOrderPlatStatus(
      id,
      status,
      (message || notes)?.trim(),
      userId,
      isAdmin,
    );

    res.json({
      success: true,
      data: { order },
      message: "Statut de la commande de plats mis à jour avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateOrderPlatStatusController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
  }
};

export const updateGpRequestStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;
    const userId = getAuthUserId(req);
    const isAdmin = isUserAdmin(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de demande GP invalide." });
    }

    const allowedStatuses: string[] = Object.values(GP_REQUEST_STATUS);
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Statut invalide. Statuts autorisés : ${allowedStatuses.join(", ")}`,
      });
    }

    if (!isOptionalTextWithin(message, 1000)) {
      return res.status(400).json({ success: false, error: "Le message ne doit pas dépasser 1 000 caractères." });
    }

    const request = await updateGpRequestStatus(
      id,
      status,
      message?.trim(),
      userId,
      isAdmin,
    );

    res.json({
      success: true,
      data: { request },
      message: "Statut de la demande GP mis à jour avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateGpRequestStatusController:", error);
    sendErrorResponse(res, error, "Erreur serveur.");
  }
};

export const updateGpDelayController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getAuthUserId(req);
    const isAdmin = isUserAdmin(req);
    const { arrival_date, delay_reason } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de demande GP invalide." });
    }

    if (!isOptionalTextWithin(delay_reason, 500)) {
      return res.status(400).json({ success: false, error: "Le motif du retard ne doit pas dépasser 500 caractères." });
    }

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
        error: "La date d'arrivée indiquée n'est pas valide.",
      });
    }

    const request = await updateGpRequestDelay(
      id,
      { arrival_date, delay_reason: delay_reason?.trim() },
      userId,
      isAdmin,
    );

    res.json({
      success: true,
      data: { request },
      message: "Retard et nouvelle date d'arrivée enregistrés avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateGpDelayController:", error);
    res.status(400).json({
      success: false,
      error: getPublicErrorMessage(error, "Erreur lors de l'enregistrement du retard."),
    });
  }
};

export const updateClientCommandeTraiteurController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const clientId = getAuthUserId(req);

    if (!clientId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de commande invalide." });
    }

    const commande = await updateClientCommandeTraiteur(id, clientId, req.body);

    res.json({
      success: true,
      data: { commande },
      message: "Commande modifiée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateClientCommandeTraiteurController:", error);
    sendErrorResponse(res, error, "Erreur lors de la modification.");
  }
};

export const updateClientOrderPlatController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const clientId = getAuthUserId(req);

    if (!clientId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de commande invalide." });
    }

    const order = await updateClientOrderPlat(id, clientId, req.body);

    res.json({
      success: true,
      data: { order },
      message: "Commande modifiée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateClientOrderPlatController:", error);
    sendErrorResponse(res, error, "Erreur lors de la modification.");
  }
};

export const updateClientGpRequestController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const senderId = getAuthUserId(req);

    if (!senderId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de demande GP invalide." });
    }

    const request = await updateClientGpRequest(id, senderId, req.body);

    res.json({
      success: true,
      data: { request },
      message: "Demande modifiée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans updateClientGpRequestController:", error);
    sendErrorResponse(res, error, "Erreur lors de la modification.");
  }
};

export const cancelClientOrderController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { type, id } = req.params;
    const userId = getAuthUserId(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non autorisé" });
    }

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de commande invalide." });
    }

    if (!["traiteur", "order", "gp"].includes(type)) {
      return res.status(400).json({
        success: false,
        error: "Type de commande invalide (traiteur, order ou gp attendu).",
      });
    }

    const result = await cancelClientOrder(type as "traiteur" | "order" | "gp", id, userId);

    res.json({
      success: true,
      data: { result },
      message: "Commande annulée avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans cancelClientOrderController:", error);
    sendErrorResponse(res, error, "Erreur lors de l'annulation.");
  }
};

export const getSingleOrderPlatController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const clientId = getAuthUserId(req);

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de commande invalide." });
    }

    const order = await getSingleOrderPlat(id, clientId || undefined);
    if (!order) {
      return res.status(404).json({ success: false, error: "Commande introuvable." });
    }

    res.json({ success: true, data: { order } });
  } catch (error: any) {
    console.error("Erreur dans getSingleOrderPlatController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de la consultation de la commande." });
  }
};

export const getSingleCommandeTraiteurController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const clientId = getAuthUserId(req);

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de commande invalide." });
    }

    const commande = await getSingleCommandeTraiteur(id, clientId || undefined);
    if (!commande) {
      return res.status(404).json({ success: false, error: "Demande de devis introuvable." });
    }

    res.json({ success: true, data: { commande } });
  } catch (error: any) {
    console.error("Erreur dans getSingleCommandeTraiteurController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de la consultation du devis." });
  }
};

export const getSingleGpRequestController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const senderId = getAuthUserId(req);

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: "Identifiant de demande GP invalide." });
    }

    const request = await getSingleGpRequest(id, senderId || undefined);
    if (!request) {
      return res.status(404).json({ success: false, error: "Demande GP introuvable." });
    }

    res.json({ success: true, data: { request } });
  } catch (error: any) {
    console.error("Erreur dans getSingleGpRequestController:", error);
    res.status(500).json({ success: false, error: "Erreur serveur lors de la consultation de la demande GP." });
  }
};
const mapDevisErrorToStatus = (error: any): number => {
  const msg = error?.message || "";
  if (msg.includes("introuvable")) return 404;
  if (
    msg.includes("Seul le") ||
    msg.includes("partie prenante") ||
    msg.includes("autorisé")
  ) {
    return 403;
  }
  return 400;
};

/** Erreurs des actions de devis : statut et code d'une HttpError (409...), sinon déduits du message. */
const sendDevisError = (res: Response, error: unknown, fallback: string) =>
  sendErrorResponse(res, error, fallback, mapDevisErrorToStatus(error));

/** Vrai si la valeur est fournie mais n'est pas une chaîne (tableau, objet, nombre...). */
const isNonStringValue = (value: unknown) => value !== undefined && value !== null && typeof value !== "string";

export const setupCommandeTraiteurDevisController = async (
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
      return res.status(400).json({ success: false, error: "Identifiant de devis invalide." });
    }

    const { prix_devis, conditions_devis, auto_sign, traiteur_signature } = req.body;
    const parsedPrix =
      typeof prix_devis === "number" || typeof prix_devis === "string"
        ? parseFloat(String(prix_devis).replace(",", "."))
        : NaN;

    if (isNaN(parsedPrix) || parsedPrix <= 0 || parsedPrix > 1000000) {
      return res.status(400).json({
        success: false,
        error: "Veuillez indiquer un montant de devis valide compris entre 1 € et 1 000 000 €.",
      });
    }

    // Types vérifiés avant les longueurs : un tableau ou un objet n'est jamais accepté comme texte
    if (isNonStringValue(conditions_devis)) {
      return res.status(400).json({ success: false, error: "Les conditions du devis doivent être un texte." });
    }
    if (isNonStringValue(traiteur_signature)) {
      return res.status(400).json({ success: false, error: "Le nom du signataire doit être un texte." });
    }

    if (typeof conditions_devis === "string" && conditions_devis.length > 5000) {
      return res.status(400).json({
        success: false,
        error: "Les conditions du devis ne doivent pas dépasser 5 000 caractères.",
      });
    }

    if (typeof traiteur_signature === "string" && traiteur_signature.length > 500) {
      return res.status(400).json({
        success: false,
        error: "Le nom du signataire ne doit pas dépasser 500 caractères.",
      });
    }

    const autoSign = parseStrictBoolean(auto_sign);
    if (autoSign === null) {
      return res.status(400).json({ success: false, error: "Le champ auto_sign doit valoir true ou false." });
    }

    let conditions: DevisConditionsInput | undefined;
    if (typeof conditions_devis === "string" && conditions_devis.trim()) {
      const parsedConditions = parseDevisConditionsInput(conditions_devis);
      if (parsedConditions.error) {
        return res.status(400).json({ success: false, error: parsedConditions.error });
      }
      conditions = parsedConditions.value;
    }

    const commande = await setupCommandeTraiteurDevis(id, userId, isAdmin, {
      prix_devis: parsedPrix,
      conditions,
      auto_sign: autoSign ?? false,
      traiteur_signature: typeof traiteur_signature === "string" ? traiteur_signature.trim() : undefined,
    });

    res.json({
      success: true,
      data: { commande },
      message: "Devis chiffré et soumis aux signatures avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans setupCommandeTraiteurDevisController:", error);
    sendDevisError(res, error, "Erreur lors de la configuration du devis.");
  }
};

export const refuseCommandeTraiteurDevisController = async (
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
      return res.status(400).json({ success: false, error: "Identifiant de devis invalide." });
    }

    const { motif } = req.body;
    if (isNonStringValue(motif)) {
      return res.status(400).json({ success: false, error: "Le motif du refus doit être un texte." });
    }
    if (typeof motif === "string" && motif.length > 1000) {
      return res.status(400).json({
        success: false,
        error: "Le motif du refus ne doit pas dépasser 1 000 caractères.",
      });
    }

    const cleanMotif = typeof motif === "string" && motif.trim() ? motif.trim() : undefined;
    const commande = await refuseCommandeTraiteurDevis(id, userId, isAdmin, cleanMotif);

    res.json({
      success: true,
      data: { commande },
      message: "Proposition de devis déclinée. Le traiteur a été prévenu.",
    });
  } catch (error: any) {
    console.error("Erreur dans refuseCommandeTraiteurDevisController:", error);
    sendDevisError(res, error, "Erreur lors du refus du devis.");
  }
};

export const signCommandeTraiteurDevisController = async (
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
      return res.status(400).json({ success: false, error: "Identifiant de devis invalide." });
    }

    const { signature, prix_devis_attendu } = req.body;
    if (!signature || typeof signature !== "string" || !signature.trim()) {
      return res.status(400).json({ success: false, error: "La signature est requise." });
    }

    // Montant lu par le signataire (facultatif) : la signature est refusée s'il a changé depuis
    let expectedPrice: number | undefined;
    if (prix_devis_attendu !== undefined && prix_devis_attendu !== null && prix_devis_attendu !== "") {
      const parsedExpected =
        typeof prix_devis_attendu === "number"
          ? prix_devis_attendu
          : typeof prix_devis_attendu === "string"
            ? Number(prix_devis_attendu.trim().replace(",", "."))
            : NaN;
      if (!Number.isFinite(parsedExpected) || parsedExpected < 0) {
        return res.status(400).json({ success: false, error: "Le montant de devis attendu est invalide." });
      }
      expectedPrice = parsedExpected;
    }

    if (signature.length > 250000) {
      return res.status(400).json({ success: false, error: "La signature transmise est trop volumineuse." });
    }

    // Format attendu : "Nom du signataire" éventuellement suivi de " | " et d'un tracé PNG en data URL
    const [signerName, ...drawingParts] = signature.split(" | ");
    const drawing = drawingParts.join(" | ");
    if (
      signerName.trim().length > 200 ||
      (drawing && !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(drawing))
    ) {
      return res.status(400).json({ success: false, error: "Format de signature invalide." });
    }

    const commande = await signCommandeTraiteurDevis(id, userId, isAdmin, signature.trim(), expectedPrice);

    res.json({
      success: true,
      data: { commande },
      message: "Devis signé avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans signCommandeTraiteurDevisController:", error);
    sendDevisError(res, error, "Erreur lors de la signature du devis.");
  }
};

export const payerAcompteCommandeTraiteurDevisController = async (
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
      return res.status(400).json({ success: false, error: "Identifiant de devis invalide." });
    }

    // La référence de transaction éventuellement envoyée (transaction_ref) est ignorée : aucun
    // paiement réel n'a lieu, la référence est générée par le serveur.
    const rawAction = req.body?.action;
    const action =
      typeof rawAction === "string" ? rawAction.trim().toLowerCase() : "";

    if (
      action !== "verser" &&
      action !== "refuser_acompte" &&
      action !== "annuler_reglement" &&
      action !== "contester_acompte"
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Action d'acompte invalide. Valeurs acceptées : 'verser', 'refuser_acompte', 'annuler_reglement' ou 'contester_acompte'.",
      });
    }

    const { commande, outcome } = await payerAcompteCommandeTraiteurDevis(
      id,
      userId,
      isAdmin,
      action,
    );

    res.json({
      success: true,
      data: { commande },
      message:
        outcome === "verse"
          ? "Règlement de l'acompte enregistré : le traiteur en est informé."
          : outcome === "jour_j"
          ? "Choix de règlement sans acompte enregistré."
          : outcome === "annule"
          ? "Statut de l'acompte réinitialisé."
          : outcome === "conteste"
          ? "Acompte signalé comme non reçu : le client est prévenu."
          : action === "verser"
          ? "L'acompte de ce devis est déjà enregistré."
          : action === "contester_acompte"
          ? "L'acompte n'est pas déclaré réglé : il n'y a rien à signaler."
          : "Aucune modification : ce choix est déjà enregistré.",
    });
  } catch (error: any) {
    console.error("Erreur dans payerAcompteCommandeTraiteurDevisController:", error);
    sendDevisError(res, error, "Erreur lors de la gestion de l'acompte.");
  }
};

