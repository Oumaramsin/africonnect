import { Router } from "express";
import AuthMiddleware from "../middlewares/authMiddleware";
import {
  createGpOrderController,
  createNewGpController,
  deleteGpListingController,
  getAllGpController,
  getGpByIdController,
  getUserGpListingsController,
  updateGpListingController,
} from "../controllers/gpController";

const gpRouter = Router();

gpRouter.get("/", getAllGpController);
gpRouter.get("/me", AuthMiddleware.authenticate, getUserGpListingsController);
gpRouter.post("/", AuthMiddleware.authenticate, createNewGpController);
gpRouter.post("/:id/order", AuthMiddleware.authenticate, createGpOrderController);
gpRouter.get("/:id", getGpByIdController);
gpRouter.patch("/:id", AuthMiddleware.authenticate, updateGpListingController);
gpRouter.delete("/:id", AuthMiddleware.authenticate, deleteGpListingController);

export default gpRouter;
