import axios from "axios";
import * as crypto from "crypto";

export class PaystackService {
  private baseUrl = "https://api.paystack.co";
  private secretKey =
    process.env.PAYSTACK_SECRET_KEY ||
    "sk_test_1e6e8aa68ec775e02c9f310870dfa8af8ce0b775";

  /**
   * Initialize payment with PayStack API
   */
  async initializePayment(data: {
    amount: number;
    email: string;
    reference: string;
    currency?: string;
    callback_url?: string;
    metadata?: any;
  }): Promise<any> {
    try {
      const payload = {
        amount: Math.round(data.amount), // PayStack expects amount in kobo
        email: data.email,
        reference: data.reference,
        currency: data.currency || "NGN",
        callback_url: data.callback_url,
        metadata: data.metadata,
      };
      const res = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      return res.data;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || error.message || "PayStack init error"
      );
    }
  }

  /**
   * Verify payment with PayStack API
   */
  async verifyPayment(reference: string): Promise<any> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      return res.data;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "PayStack verify error"
      );
    }
  }

  /**
   * Verify PayStack webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    const hash = crypto
      .createHmac("sha512", this.secretKey)
      .update(body)
      .digest("hex");
    return hash === signature;
  }
}

export const paystackService = new PaystackService();
