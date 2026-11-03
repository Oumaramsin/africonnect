// NON MONTÉ dans index.ts : aucun front ne l'utilise et le montant était libre (risque de « card
// testing »). À ne remonter qu'avec un montant calculé côté serveur à partir d'une commande.
import { Router } from "express";
import StripeController from "../controllers/stripeController";
import AuthMiddleware from "../middlewares/authMiddleware";

const stripeRouter = Router();

// Authentification obligatoire : un endpoint de paiement anonyme sert au "card testing" de cartes volées
stripeRouter.post("/create-payment-intent", AuthMiddleware.authenticate, StripeController.createPaymentIntent);

export default stripeRouter;
