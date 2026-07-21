import { Request, Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
import {
  getAllOrderById,
  getRecentOrderByClientId,
  updateCommandeTraiteurStatus,
  updateGpRequestStatus,
  updateOrderPlatStatus,
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
  res: Response
) => {
  try {
    const { id } = req.params;
    const { statut, message_traiteur } = req.body;

    const commande = await updateCommandeTraiteurStatus(id, statut, message_traiteur);

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
  res: Response
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
  res: Response
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
