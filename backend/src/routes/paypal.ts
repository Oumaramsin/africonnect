import { Router } from "express";
import PaypalController from "../controllers/paypalController";

const paypalRouter = Router();

// Routes pour l'interaction PayPal
paypalRouter.post("/create-order", PaypalController.createOrder);
paypalRouter.post("/capture-order", PaypalController.captureOrder);

export default paypalRouter;