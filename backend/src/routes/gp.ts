import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import {
  createGpOrderController,
  createNewGpController,
  getAllGpController,
} from "../controllers/gpController";

const gpRouter = Router();

gpRouter.get("/", getAllGpController);
gpRouter.post("/", AuthMiddleware.authenticate, createNewGpController);
gpRouter.post("/order", AuthMiddleware.authenticate, createGpOrderController);

export default gpRouter;
