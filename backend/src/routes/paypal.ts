// NON MONTÉ dans index.ts : aucun front ne l'utilise et le montant était libre (risque de « card
// testing »). À ne remonter qu'avec un montant calculé côté serveur à partir d'une commande.
import { Router } from "express";
import PaypalController from "../controllers/paypalController";
import AuthMiddleware from "../middlewares/authMiddleware";

const paypalRouter = Router();

// Routes pour l'interaction PayPal
paypalRouter.post("/create-order", AuthMiddleware.authenticate, PaypalController.createOrder);
paypalRouter.post("/capture-order", AuthMiddleware.authenticate, PaypalController.captureOrder);

export default paypalRouter;
