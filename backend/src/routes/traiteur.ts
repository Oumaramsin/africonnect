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

const traiteurRouter = Router();

// Gestion profil et plats traiteur
traiteurRouter.get("/me", AuthMiddleware.authenticate, getTraiteurProfileController);
traiteurRouter.post("/setup", AuthMiddleware.authenticate, createTraiteurProfileController);
traiteurRouter.patch("/profile", AuthMiddleware.authenticate, updateTraiteurProfileController);
traiteurRouter.post("/dishes", AuthMiddleware.authenticate, addTraiteurDishController);
traiteurRouter.patch("/dishes/:dishId", AuthMiddleware.authenticate, updateTraiteurDishController);
traiteurRouter.delete("/dishes/:dishId", AuthMiddleware.authenticate, deleteTraiteurDishController);

// Annonces / Demandes de recherche de traiteur par les clients
traiteurRouter.post("/requests", AuthMiddleware.authenticate, createTraiteurRequestController);
traiteurRouter.get("/requests", getAllTraiteurRequestsController);
traiteurRouter.get("/requests/me", AuthMiddleware.authenticate, getMyTraiteurRequestsController);
traiteurRouter.get("/requests/:id", getTraiteurRequestByIdController);
traiteurRouter.put("/requests/:id", AuthMiddleware.authenticate, updateTraiteurRequestController);
traiteurRouter.patch("/requests/:id", AuthMiddleware.authenticate, updateTraiteurRequestController);
traiteurRouter.patch("/requests/:id/cancel", AuthMiddleware.authenticate, cancelTraiteurRequestController);
traiteurRouter.delete("/requests/:id/cancel", AuthMiddleware.authenticate, cancelTraiteurRequestController);
traiteurRouter.delete("/requests/:id", AuthMiddleware.authenticate, deleteTraiteurRequestController);

// Propositions / Devis envoyés par les traiteurs
traiteurRouter.post("/requests/:requestId/proposals", AuthMiddleware.authenticate, createTraiteurProposalController);
traiteurRouter.get("/proposals/me", AuthMiddleware.authenticate, getMyTraiteurProposalsController);
traiteurRouter.patch("/proposals/:id/status", AuthMiddleware.authenticate, updateTraiteurProposalStatusController);

// Commandes directes et listing traiteurs
traiteurRouter.get("/", getActiveTraiteurController);
traiteurRouter.post("/", AuthMiddleware.authenticate, createCommandeTraiteurController);
traiteurRouter.post("/order", AuthMiddleware.authenticate, createDishesOrderController);
traiteurRouter.get("/:id", getTraiteurByIdController);

export default traiteurRouter;
