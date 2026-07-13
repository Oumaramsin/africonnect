import { Router } from "express";
import StripeController from "../controllers/stripeController";

const stripeRouter = Router();

stripeRouter.post("/create-payment-intent", StripeController.createPaymentIntent);

export default stripeRouter;
