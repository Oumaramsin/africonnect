import { Request, Response } from "express";
import StripeService from "../services/stripeService";

class StripeController {
  static createPaymentIntent = async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      if (!amount) {
        return res.status(400).json({ message: "Le montant est requis." });
      }
      const clientSecret = await StripeService.createPaymentIntent(amount);
      return res.status(200).json({ clientSecret });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  };
}

export default StripeController;
