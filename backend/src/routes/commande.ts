import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import {
  getOrderByClientIdController,
  getRecentOrderByClientIdController,
  updateCommandeTraiteurStatusController,
  updateGpRequestStatusController,
  updateOrderPlatStatusController,
} from "../controllers/commandeController";

const commandeRouter = Router();

commandeRouter.get(
  "/",
  AuthMiddleware.authenticate,
  getOrderByClientIdController,
);
commandeRouter.get(
  "/recent",
  AuthMiddleware.authenticate,
  getRecentOrderByClientIdController,
);

commandeRouter.patch(
  "/traiteur/:id/status",
  AuthMiddleware.authenticate,
  updateCommandeTraiteurStatusController,
);
commandeRouter.patch(
  "/order/:id/status",
  AuthMiddleware.authenticate,
  updateOrderPlatStatusController,
);
commandeRouter.patch(
  "/gp/:id/status",
  AuthMiddleware.authenticate,
  updateGpRequestStatusController,
);

export default commandeRouter;
