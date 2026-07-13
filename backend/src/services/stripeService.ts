import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

class StripeService {
  static createPaymentIntent = async (amount: number): Promise<string> => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("Stripe configuration error: STRIPE_SECRET_KEY is missing from environment variables.");
    }

    const stripe = new Stripe(stripeSecretKey);

    // Conversion du montant en centimes
    const amountInCents = Math.round(amount * 100);

    if (amountInCents <= 0) {
      throw new Error("Le montant du paiement doit être supérieur à zéro.");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "eur",
      payment_method_types: ["card"],
    });

    if (!paymentIntent.client_secret) {
      throw new Error("Impossible de générer le client_secret de Stripe.");
    }

    return paymentIntent.client_secret;
  };
}

export default StripeService;
