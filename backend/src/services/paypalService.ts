import dotenv from "dotenv";

dotenv.config();

class PaypalService {
  private static getCredentials() {
    const clientId = process.env.PAYPAL_CLIENTID;
    const secret = process.env.PAYPAL_SECRET;
    const baseUrl = process.env.PAYPAL_BASEURL || "https://api-m.sandbox.paypal.com";

    if (!clientId || !secret) {
      throw new Error("Missing PayPal credentials in environment variables.");
    }
    return { clientId, secret, baseUrl };
  }

  static getAccessToken = async (): Promise<string> => {
    const { clientId, secret, baseUrl } = this.getCredentials();
    const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get PayPal access token: ${response.statusText} - ${errorText}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  };

  static createOrder = async (amount: string): Promise<any> => {
    const { baseUrl } = this.getCredentials();
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "EUR",
              value: amount,
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create PayPal order: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  };

  static captureOrder = async (orderId: string): Promise<any> => {
    const { baseUrl } = this.getCredentials();
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to capture PayPal order: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  };
}

export default PaypalService;
