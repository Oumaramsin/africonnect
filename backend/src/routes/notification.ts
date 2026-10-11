import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearNotifications,
} from "../controllers/notificationController";

const router = Router();

router.use(AuthMiddleware.authenticate);

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/clear-all", clearNotifications);
router.post("/clear-all", clearNotifications);
router.delete("/:id", removeNotification);
router.post("/:id/delete", removeNotification);

export default router;
