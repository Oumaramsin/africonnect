import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController";

const router = Router();

router.use(AuthMiddleware.authenticate);

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
