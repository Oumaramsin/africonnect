import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import { getOrderByClientIdController, getRecentOrderByClientIdController } from "../controllers/commandeController";

const commandeRouter = Router();

commandeRouter.get("/", AuthMiddleware.authenticate ,getOrderByClientIdController);
commandeRouter.get("/recent", AuthMiddleware.authenticate ,getRecentOrderByClientIdController);

export default commandeRouter;