import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import {
  deleteTraiteurController,
  updateStateTraiteurController,
  createTraiteurFromUserController,
  createGpFromUserController,
  updateStateGpController,
  deleteGpController,
  getAdminOverviewController,
} from "../controllers/adminController";

const adminRouter = Router();

// Routes administration Traiteur
adminRouter.get("/", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, getAdminOverviewController);

adminRouter.post("/", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, createTraiteurFromUserController);
adminRouter.patch("/", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, updateStateTraiteurController);
adminRouter.delete("/", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, deleteTraiteurController);

// Routes administration GP Colis
adminRouter.post("/gp", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, createGpFromUserController);
adminRouter.patch("/gp", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, updateStateGpController);
adminRouter.delete("/gp", AuthMiddleware.authenticate, AuthMiddleware.isAdmin, deleteGpController);


export default adminRouter;