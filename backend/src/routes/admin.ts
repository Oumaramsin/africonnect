import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import {
  deleteTraiteurController,
  getAllTraiteurController,
  updateStateTraiteurController,
  createTraiteurFromUserController,
  getAllGpController,
  createGpFromUserController,
  updateStateGpController,
  deleteGpController,
} from "../controllers/adminController";

const adminRouter = Router();

// Routes administration Traiteur
adminRouter.get("/", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, getAllTraiteurController);
adminRouter.post("/", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, createTraiteurFromUserController);
adminRouter.patch("/", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, updateStateTraiteurController);
adminRouter.delete("/", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, deleteTraiteurController);

// Routes administration GP Colis
adminRouter.get("/gp", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, getAllGpController);
adminRouter.post("/gp", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, createGpFromUserController);
adminRouter.patch("/gp", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, updateStateGpController);
adminRouter.delete("/gp", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, deleteGpController);

// Routes administration Création d'un nouveau utilisateur
// adminRouter.post("/user", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, createNewUserController);

export default adminRouter;