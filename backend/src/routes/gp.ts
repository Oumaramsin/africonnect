import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import { creationLimiter } from "../middlewares/rateLimiter";
import {
  createGpOrderController,
  createNewGpController,
  deleteGpListingController,
  getAllGpController,
  getGpByIdController,
  getUserGpListingsController,
  updateGpListingController,
  updateGpListingDelayController,
} from "../controllers/gpController";

const gpRouter = Router();

gpRouter.get("/", getAllGpController);
gpRouter.get("/me", AuthMiddleware.authenticate, getUserGpListingsController);
gpRouter.post("/", AuthMiddleware.authenticate, creationLimiter, createNewGpController);
gpRouter.post("/:id/order", AuthMiddleware.authenticate, creationLimiter, createGpOrderController);
gpRouter.get("/:id", getGpByIdController);
gpRouter.patch("/:id", AuthMiddleware.authenticate, updateGpListingController);
gpRouter.patch("/:id/delay", AuthMiddleware.authenticate, updateGpListingDelayController);
gpRouter.delete("/:id", AuthMiddleware.authenticate, deleteGpListingController);

export default gpRouter;
