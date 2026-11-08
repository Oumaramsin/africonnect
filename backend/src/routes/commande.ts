import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import { creationLimiter } from "../middlewares/rateLimiter";
import {
  getOrderByClientIdController,
  getRecentOrderByClientIdController,
  updateCommandeTraiteurStatusController,
  updateGpRequestStatusController,
  updateOrderPlatStatusController,
  updateClientCommandeTraiteurController,
  updateClientOrderPlatController,
  updateClientGpRequestController,
  cancelClientOrderController,
  getSingleOrderPlatController,
  getSingleCommandeTraiteurController,
  getSingleGpRequestController,
  updateGpDelayController,
  setupCommandeTraiteurDevisController,
  signCommandeTraiteurDevisController,
  refuseCommandeTraiteurDevisController,
  payerAcompteCommandeTraiteurDevisController,
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
commandeRouter.get(
  "/order/:id",
  AuthMiddleware.authenticate,
  getSingleOrderPlatController,
);
commandeRouter.get(
  "/traiteur/:id",
  AuthMiddleware.authenticate,
  getSingleCommandeTraiteurController,
);
commandeRouter.get(
  "/gp/:id",
  AuthMiddleware.authenticate,
  getSingleGpRequestController,
);

commandeRouter.patch(
  "/traiteur/:id/status",
  AuthMiddleware.authenticate,
  updateCommandeTraiteurStatusController,
);
commandeRouter.post(
  "/traiteur/:id/devis/setup",
  AuthMiddleware.authenticate,
  setupCommandeTraiteurDevisController,
);
commandeRouter.post(
  "/traiteur/:id/devis/sign",
  AuthMiddleware.authenticate,
  signCommandeTraiteurDevisController,
);
commandeRouter.post(
  "/traiteur/:id/devis/refuse",
  AuthMiddleware.authenticate,
  refuseCommandeTraiteurDevisController,
);
commandeRouter.post(
  "/traiteur/:id/devis/acompte",
  AuthMiddleware.authenticate,
  // Chaque action notifie l'autre partie (et un e-mail pour un règlement déclaré) : envois bornés
  creationLimiter,
  payerAcompteCommandeTraiteurDevisController,
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
commandeRouter.patch(
  "/gp/:id/delay",
  AuthMiddleware.authenticate,
  updateGpDelayController,
);

// Routes de modification client (autorisées UNIQUEMENT avant confirmation)
commandeRouter.put(
  "/traiteur/:id",
  AuthMiddleware.authenticate,
  updateClientCommandeTraiteurController,
);
commandeRouter.put(
  "/order/:id",
  AuthMiddleware.authenticate,
  updateClientOrderPlatController,
);
commandeRouter.put(
  "/gp/:id",
  AuthMiddleware.authenticate,
  updateClientGpRequestController,
);
commandeRouter.post(
  "/cancel/:type/:id",
  AuthMiddleware.authenticate,
  cancelClientOrderController,
);

export default commandeRouter;

