import { Request, Response } from "express";
import StripeService from "../services/stripeService";

class StripeController {
  static createPaymentIntent = async (req: Request, res: Response) => {
    try {
      const amount = Number(req.body?.amount);
      if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
        return res.status(400).json({ message: "Le montant doit être compris entre 1 € et 100 000 €." });
      }
      const clientSecret = await StripeService.createPaymentIntent(amount);
      return res.status(200).json({ clientSecret });
    } catch (error: any) {
      console.error("Erreur création PaymentIntent Stripe:", error);
      return res.status(500).json({ message: "Le paiement est momentanément indisponible." });
    }
  };
}

export default StripeController;
