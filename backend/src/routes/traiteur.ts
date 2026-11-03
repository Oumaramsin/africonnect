import { Router } from "express";
import {
  createCommandeTraiteurController,
  createDishesOrderController,
  getActiveTraiteurController,
  getTraiteurByIdController,
  getTraiteurProfileController,
  createTraiteurProfileController,
  updateTraiteurProfileController,
  addTraiteurDishController,
  updateTraiteurDishController,
  deleteTraiteurDishController,
  createTraiteurRequestController,
  getAllTraiteurRequestsController,
  getMyTraiteurRequestsController,
  getTraiteurRequestByIdController,
  cancelTraiteurRequestController,
  deleteTraiteurRequestController,
  updateTraiteurRequestController,
  createTraiteurProposalController,
  getMyTraiteurProposalsController,
  updateTraiteurProposalStatusController,
} from "../controllers/traiteurController";
import AuthMiddleware from "../middlewares/authMiddleware";
import { creationLimiter } from "../middlewares/rateLimiter";

const traiteurRouter = Router();

// Gestion profil et plats traiteur
traiteurRouter.get("/me", AuthMiddleware.authenticate, getTraiteurProfileController);
traiteurRouter.post("/setup", AuthMiddleware.authenticate, creationLimiter, createTraiteurProfileController);
traiteurRouter.patch("/profile", AuthMiddleware.authenticate, updateTraiteurProfileController);
traiteurRouter.post("/dishes", AuthMiddleware.authenticate, creationLimiter, addTraiteurDishController);
traiteurRouter.patch("/dishes/:dishId", AuthMiddleware.authenticate, updateTraiteurDishController);
traiteurRouter.delete("/dishes/:dishId", AuthMiddleware.authenticate, deleteTraiteurDishController);

// Annonces / Demandes de recherche de traiteur par les clients
traiteurRouter.post("/requests", AuthMiddleware.authenticate, creationLimiter, createTraiteurRequestController);
// Réservé aux traiteurs (et administrateurs) : vue minimisée du client (prénom + initiale, ville)
traiteurRouter.get("/requests", AuthMiddleware.authenticate, getAllTraiteurRequestsController);
traiteurRouter.get("/requests/me", AuthMiddleware.authenticate, getMyTraiteurRequestsController);
// Authentification requise : la vue complète (téléphone du client, propositions) est réservée au propriétaire
traiteurRouter.get("/requests/:id", AuthMiddleware.authenticate, getTraiteurRequestByIdController);
traiteurRouter.put("/requests/:id", AuthMiddleware.authenticate, updateTraiteurRequestController);
traiteurRouter.patch("/requests/:id", AuthMiddleware.authenticate, updateTraiteurRequestController);
traiteurRouter.patch("/requests/:id/cancel", AuthMiddleware.authenticate, cancelTraiteurRequestController);
traiteurRouter.delete("/requests/:id/cancel", AuthMiddleware.authenticate, deleteTraiteurRequestController);
traiteurRouter.delete("/requests/:id", AuthMiddleware.authenticate, deleteTraiteurRequestController);

// Propositions / Devis envoyés par les traiteurs
traiteurRouter.post(
  "/requests/:requestId/proposals",
  AuthMiddleware.authenticate,
  creationLimiter,
  createTraiteurProposalController,
);
traiteurRouter.get("/proposals/me", AuthMiddleware.authenticate, getMyTraiteurProposalsController);
traiteurRouter.patch("/proposals/:id/status", AuthMiddleware.authenticate, updateTraiteurProposalStatusController);

// Commandes directes et listing traiteurs
traiteurRouter.get("/", getActiveTraiteurController);
traiteurRouter.post("/", AuthMiddleware.authenticate, creationLimiter, createCommandeTraiteurController);
traiteurRouter.post("/order", AuthMiddleware.authenticate, creationLimiter, createDishesOrderController);
traiteurRouter.get("/:id", getTraiteurByIdController);

export default traiteurRouter;
