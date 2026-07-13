import { Request, Response } from "express";

class PaypalController {
  static createOrder = async (req: Request, res: Response) => {
    try {
      return res.status(200).json({ message: "PayPal createOrder stub endpoint" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  };

  static captureOrder = async (req: Request, res: Response) => {
    try {
      return res.status(200).json({ message: "PayPal captureOrder stub endpoint" });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  };
}

export default PaypalController;
