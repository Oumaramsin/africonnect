import { Response } from "express";
import { AuthenticatedRequest, getAuthUserId, isUserAdmin, isValidUUID } from "../utils/types";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../services/notificationService";

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthUserId(req);
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
    const userId = getAuthUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Non autorisé" });
    }
    if (!id) {
      return res.status(400).json({ message: "Identifiant manquant" });
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
    const userId = getAuthUserId(req);
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

export const removeNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Non autorisé" });
    }
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ message: "Identifiant notification manquant ou invalide" });
    }

    const isAdmin = isUserAdmin(req);
    const result = await deleteNotification(id, userId, isAdmin);
    return res.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Erreur suppression notification:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

export const clearNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    const isAdmin = isUserAdmin(req);
    const result = await clearAllNotifications(userId, isAdmin);
    return res.json({ success: true, count: result.count });
  } catch (error) {
    console.error("Erreur suppression toutes notifications:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
