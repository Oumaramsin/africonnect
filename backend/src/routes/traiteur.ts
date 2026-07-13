import { Router } from "express";
import { getActiveTraiteurController, getTraiteurDishesController } from "../controllers/traiteurController";

const traiteurRouter = Router();

traiteurRouter.get("/", getActiveTraiteurController);
traiteurRouter.get("/:id", getTraiteurDishesController);

export default traiteurRouter;
