import { Router } from "express";
import {
  createCommandeTraiteurController,
  createDishesOrderController,
  getActiveTraiteurController,
  getTraiteurDishesController,
} from "../controllers/traiteurController";
import AuthMiddleware from "../middlewares/authMiddleware";

const traiteurRouter = Router();

traiteurRouter.get("/", getActiveTraiteurController);
traiteurRouter.post("/", AuthMiddleware.authenticate, createCommandeTraiteurController);
traiteurRouter.post("/order", AuthMiddleware.authenticate, createDishesOrderController);
traiteurRouter.get("/:id", getTraiteurDishesController);

export default traiteurRouter;
