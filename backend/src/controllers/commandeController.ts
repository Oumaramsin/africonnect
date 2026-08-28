import { Request, Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
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
} from "../services/commandeService";

export const getRecentOrderByClientIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;

    const client_id = user?.userId || req.body.client_id;
    const orders = await getRecentOrderByClientId(client_id);

    res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error("Erreur dans getRecentOrderByClientIdController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getOrderByClientIdController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = (req as AuthenticatedRequest).user as any;

    const id = user?.userId || req.body.client_id;
    const orders = await getAllOrderById(id);

    res.json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error("Erreur dans getOrderByClientIdController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateCommandeTraiteurStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { statut, message_traiteur } = req.body;

    const commande = await updateCommandeTraiteurStatus(
      id,
      statut,
      message_traiteur,
    );

    res.json({
      success: true,
      data: { commande },
    });
  } catch (error) {
    console.error("Erreur dans updateCommandeTraiteurStatusController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateOrderPlatStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await updateOrderPlatStatus(id, status);

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error("Erreur dans updateOrderPlatStatusController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateGpRequestStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;

    const request = await updateGpRequestStatus(id, status, message);

    res.json({
      success: true,
      data: { request },
    });
  } catch (error) {
    console.error("Erreur dans updateGpRequestStatusController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateClientCommandeTraiteurController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const user = (req as AuthenticatedRequest).user as any;
    const clientId = user?.userId || user?.id;

    const commande = await updateClientCommandeTraiteur(id, clientId, req.body);

    res.json({
      success: true,
      data: { commande },
      message: "Commande modifiée avec succès",
    });
  } catch (error: any) {
    console.error("Erreur dans updateClientCommandeTraiteurController:", error);
    res
      .status(400)
      .json({ error: error.message || "Erreur lors de la modification" });
  }
};

export const updateClientOrderPlatController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const user = (req as AuthenticatedRequest).user as any;
    const clientId = user?.userId || user?.id;

    const order = await updateClientOrderPlat(id, clientId, req.body);

    res.json({
      success: true,
      data: { order },
      message: "Commande modifiée avec succès",
    });
  } catch (error: any) {
    console.error("Erreur dans updateClientOrderPlatController:", error);
    res
      .status(400)
      .json({ error: error.message || "Erreur lors de la modification" });
  }
};

export const updateClientGpRequestController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const user = (req as AuthenticatedRequest).user as any;
    const senderId = user?.userId || user?.id;

    const request = await updateClientGpRequest(id, senderId, req.body);

    res.json({
      success: true,
      data: { request },
      message: "Demande modifiée avec succès",
    });
  } catch (error: any) {
    console.error("Erreur dans updateClientGpRequestController:", error);
    res
      .status(400)
      .json({ error: error.message || "Erreur lors de la modification" });
  }
};

export const cancelClientOrderController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { type, id } = req.params;
    const user = (req as AuthenticatedRequest).user as any;
    const userId = user?.userId || user?.id;

    const result = await cancelClientOrder(type as any, id, userId);

    res.json({
      success: true,
      data: { result },
      message: "Commande annulée avec succès",
    });
  } catch (error: any) {
    console.error("Erreur dans cancelClientOrderController:", error);
    res
      .status(400)
      .json({ error: error.message || "Erreur lors de l'annulation" });
  }
};

export const getSingleOrderPlatController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const user = (req as AuthenticatedRequest).user as any;
    const clientId = user?.userId || user?.id;

    const order = await getSingleOrderPlat(id, clientId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, error: "Commande introuvable" });
    }

    res.json({ success: true, data: { order } });
  } catch (error: any) {
    console.error("Erreur dans getSingleOrderPlatController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getSingleCommandeTraiteurController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const user = (req as AuthenticatedRequest).user as any;
    const clientId = user?.userId || user?.id;

    const commande = await getSingleCommandeTraiteur(id, clientId);
    if (!commande) {
      return res
        .status(404)
        .json({ success: false, error: "Demande de devis introuvable" });
    }

    res.json({ success: true, data: { commande } });
  } catch (error: any) {
    console.error("Erreur dans getSingleCommandeTraiteurController:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getSingleGpRequestController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const user = (req as AuthenticatedRequest).user as any;
    const senderId = user?.userId || user?.id;

    const request = await getSingleGpRequest(id, senderId);
    if (!request) {
      return res
        .status(404)
        .json({ success: false, error: "Demande GP introuvable" });
    }

    res.json({ success: true, data: { request } });
  } catch (error: any) {
    console.error("Erreur dans getSingleGpRequestController:", error);
    res.status(500).json({ error: "Server error" });
  }
};
