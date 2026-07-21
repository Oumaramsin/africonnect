import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import {
  createGpOrderController,
  createNewGpController,
  getAllGpController,
  getGpByIdController,
} from "../controllers/gpController";

const gpRouter = Router();

gpRouter.get("/", getAllGpController);
gpRouter.post("/", AuthMiddleware.authenticate, createNewGpController);
gpRouter.post("/:id/order", AuthMiddleware.authenticate, createGpOrderController);
gpRouter.get("/:id", getGpByIdController);

export default gpRouter;
