import { Request, Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
import {
  getAllOrderById,
  getRecentOrderByClientId,
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
    console.error("Erreur dans getRecentOrderByClientIdController:", error);
    res.status(500).json({ error: "Server error" });
  }
};
