import { Request, Response } from "express";
import {
  getAuthUserId,
  isUserAdmin,
  isValidUUID,
  COMMANDE_TRAITEUR_STATUS,
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
    res.status(400).json({ success: false, error: error.message || "Erreur serveur." });
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
    res.status(400).json({ success: false, error: error.message || "Erreur serveur." });
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
    res.status(400).json({ success: false, error: error.message || "Erreur serveur." });
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
      error: error.message || "Erreur lors de l'enregistrement du retard.",
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
    res.status(400).json({
      success: false,
      error: error.message || "Erreur lors de la modification.",
    });
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
    res.status(400).json({
      success: false,
      error: error.message || "Erreur lors de la modification.",
    });
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
    res.status(400).json({
      success: false,
      error: error.message || "Erreur lors de la modification.",
    });
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
    res.status(400).json({
      success: false,
      error: error.message || "Erreur lors de l'annulation.",
    });
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
    const parsedPrix = parseFloat(String(prix_devis).replace(",", "."));

    if (isNaN(parsedPrix) || parsedPrix <= 0 || parsedPrix > 1000000) {
      return res.status(400).json({
        success: false,
        error: "Veuillez indiquer un montant de devis valide compris entre 1 € et 1 000 000 €.",
      });
    }

    if (conditions_devis && typeof conditions_devis === "string" && conditions_devis.length > 5000) {
      return res.status(400).json({
        success: false,
        error: "Les conditions du devis ne doivent pas dépasser 5 000 caractères.",
      });
    }

    if (traiteur_signature && typeof traiteur_signature === "string" && traiteur_signature.length > 500) {
      return res.status(400).json({
        success: false,
        error: "Le nom du signataire ne doit pas dépasser 500 caractères.",
      });
    }

    const commande = await setupCommandeTraiteurDevis(id, userId, isAdmin, {
      prix_devis: parsedPrix,
      conditions_devis: conditions_devis ? String(conditions_devis).trim() : undefined,
      auto_sign: Boolean(auto_sign),
      traiteur_signature: traiteur_signature ? String(traiteur_signature).trim() : undefined,
    });

    res.json({
      success: true,
      data: { commande },
      message: "Devis chiffré et soumis aux signatures avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans setupCommandeTraiteurDevisController:", error);
    const status = mapDevisErrorToStatus(error);
    res.status(status).json({ success: false, error: error.message || "Erreur lors de la configuration du devis." });
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
    if (motif && typeof motif === "string" && motif.length > 1000) {
      return res.status(400).json({
        success: false,
        error: "Le motif du refus ne doit pas dépasser 1 000 caractères.",
      });
    }

    const cleanMotif = motif && typeof motif === "string" ? motif.trim() : undefined;
    const commande = await refuseCommandeTraiteurDevis(id, userId, isAdmin, cleanMotif);

    res.json({
      success: true,
      data: { commande },
      message: "Proposition de devis déclinée. Le traiteur a été prévenu.",
    });
  } catch (error: any) {
    console.error("Erreur dans refuseCommandeTraiteurDevisController:", error);
    const status = mapDevisErrorToStatus(error);
    res.status(status).json({ success: false, error: error.message || "Erreur lors du refus du devis." });
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

    const { signature } = req.body;
    if (!signature || typeof signature !== "string" || !signature.trim()) {
      return res.status(400).json({ success: false, error: "La signature est requise." });
    }

    if (signature.length > 250000) {
      return res.status(400).json({ success: false, error: "La signature transmise est trop volumineuse." });
    }

    const commande = await signCommandeTraiteurDevis(id, userId, isAdmin, signature.trim());

    res.json({
      success: true,
      data: { commande },
      message: "Devis signé avec succès.",
    });
  } catch (error: any) {
    console.error("Erreur dans signCommandeTraiteurDevisController:", error);
    const status = mapDevisErrorToStatus(error);
    res.status(status).json({ success: false, error: error.message || "Erreur lors de la signature du devis." });
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

    const rawAction = req.body?.action;
    const transaction_ref = req.body?.transaction_ref;
    const action =
      typeof rawAction === "string" ? rawAction.trim().toLowerCase() : "";

    if (
      action !== "verser" &&
      action !== "refuser_acompte" &&
      action !== "annuler_reglement"
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Action d'acompte invalide. Valeurs acceptées : 'verser' ou 'refuser_acompte'.",
      });
    }

    const cleanRef =
      transaction_ref && typeof transaction_ref === "string"
        ? transaction_ref.slice(0, 100).trim()
        : undefined;

    const commande = await payerAcompteCommandeTraiteurDevis(
      id,
      userId,
      isAdmin,
      action,
      cleanRef,
    );

    res.json({
      success: true,
      data: { commande },
      message:
        action === "verser"
          ? "Acompte consigné sous séquestre Dabari avec succès."
          : action === "refuser_acompte"
          ? "Choix de règlement sans acompte enregistré."
          : "Statut de l'acompte réinitialisé.",
    });
  } catch (error: any) {
    console.error("Erreur dans payerAcompteCommandeTraiteurDevisController:", error);
    const status = mapDevisErrorToStatus(error);
    res.status(status).json({
      success: false,
      error: error.message || "Erreur lors de la gestion de l'acompte.",
    });
  }
};

