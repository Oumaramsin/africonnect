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
} from "../controllers/traiteurController";
import AuthMiddleware from "../middlewares/authMiddleware";

const traiteurRouter = Router();


traiteurRouter.get("/me", AuthMiddleware.authenticate, getTraiteurProfileController);
traiteurRouter.post("/setup", AuthMiddleware.authenticate, createTraiteurProfileController);
traiteurRouter.patch("/profile", AuthMiddleware.authenticate, updateTraiteurProfileController);
traiteurRouter.post("/dishes", AuthMiddleware.authenticate, addTraiteurDishController);
traiteurRouter.patch("/dishes/:dishId", AuthMiddleware.authenticate, updateTraiteurDishController);
traiteurRouter.delete("/dishes/:dishId", AuthMiddleware.authenticate, deleteTraiteurDishController);

traiteurRouter.get("/", getActiveTraiteurController);
traiteurRouter.post("/", AuthMiddleware.authenticate, createCommandeTraiteurController);
traiteurRouter.post("/order", AuthMiddleware.authenticate, createDishesOrderController);
traiteurRouter.get("/:id", getTraiteurByIdController);

export default traiteurRouter;
