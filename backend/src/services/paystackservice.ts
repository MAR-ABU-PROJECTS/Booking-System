// import axios from "axios";
// import * as crypto from "crypto";

export class PaystackService {
  private baseUrl = "https://api.paystack.co";
  private secretKey = process.env.PAYSTACK_SECRET_KEY || "";

  /**
   * Dummy initialize payment for testing
   */
  async initializePayment(data: {
    amount: number;
    email: string;
    reference: string;
    currency?: string;
    callback_url?: string;
    metadata?: any;
  }): Promise<any> {
    // Return a fake response for testing
    return {
      status: true,
      message: "Dummy payment initialized",
      data: {
        authorization_url: "https://paystack.com/pay/dummy-authorization",
        access_code: "DUMMY_ACCESS_CODE",
        reference: data.reference,
        amount: data.amount * 100,
        currency: data.currency || "NGN",
        email: data.email,
        callback_url: data.callback_url,
        metadata: data.metadata,
      },
    };
  }

  /**
   * Dummy verify payment for testing
   */
  async verifyPayment(reference: string): Promise<any> {
    // Return a fake successful verification response
    return {
      status: "success",
      data: {
        status: "successful",
        reference,
        gateway_response: "Approved",
      },
    };
  }

  /**
   * Dummy verify webhook signature for testing
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    // For real implementation, uncomment below and set your secret key
    // const hash = crypto
    //   .createHmac("sha512", this.secretKey)
    //   .update(body)
    //   .digest("hex");
    // return hash === signature;

    // For testing, always return true
    return true;
  }
}

export const paystackService = new PaystackService();
