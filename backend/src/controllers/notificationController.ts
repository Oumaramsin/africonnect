import { Response } from "express";
import { AuthenticatedRequest } from "../utils/types";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService";

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    const data = await getUserNotifications(userId);
    return res.json(data);
  } catch (error) {
    console.error("Erreur récupération notifications:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    await markNotificationAsRead(id, userId);
    return res.json({ success: true });
  } catch (error) {
    console.error("Erreur marquage notification:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = (req.user as any)?.userId || (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    await markAllNotificationsAsRead(userId);
    return res.json({ success: true });
  } catch (error) {
    console.error("Erreur marquage toutes notifications:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
