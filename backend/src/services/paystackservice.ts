import axios from "axios";
import * as crypto from "crypto";

// -------------------------
// Types for Paystack responses
// -------------------------
export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    currency: string;
    channel: string;
    customer: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
    };
    metadata: any;
  };
}

export interface PaystackRefundResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    amount: number;
    currency: string;
    transaction: string;
    status: string;
    customer: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
    };
    created_at: string;
    updated_at: string;
    gateway_response: string;
    customer_note?: string;
    failure_reason?: string | null;
  };
}

export class PaystackService {
  private readonly baseUrl = "https://api.paystack.co";
  private readonly secretKey: string;

  constructor() {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new Error("Missing PAYSTACK_SECRET_KEY in environment variables");
    }
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
  }

  /**
   * Initialize payment with PayStack API
   * Expects amount in Naira → converts to kobo
   */
  async initializePayment(data: {
    amount: number; // in Naira
    email: string;
    reference: string;
    currency?: string;
    callback_url?: string;
    metadata?: any;
  }): Promise<PaystackInitResponse> {
    try {
      const payload: any = {
        amount: Math.round(data.amount * 100), // convert to kobo
        email: data.email,
        reference: data.reference,
        currency: data.currency || "NGN",
      };

      if (data.callback_url) payload.callback_url = data.callback_url;
      if (data.metadata) payload.metadata = data.metadata;

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

      return res.data as PaystackInitResponse;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || error.message || "Paystack init error"
      );
    }
  }

  /**
   * Verify payment with PayStack API
   */
  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
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

      return res.data as PaystackVerifyResponse;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Paystack verify error"
      );
    }
  }

  /**
   * Refund a payment
   * @param reference Paystack transaction reference or ID
   * @param amount Optional refund amount in Naira
   * @param note Optional reason for refund
   */
  async refundPayment(
    reference: string,
    amount?: number,
    note?: string
  ): Promise<PaystackRefundResponse> {
    try {
      const payload: any = { transaction: reference };
      if (amount) payload.amount = Math.round(amount * 100); // convert to kobo
      if (note) payload.customer_note = note;

      const res = await axios.post(`${this.baseUrl}/refund`, payload, {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      });

      return res.data as PaystackRefundResponse;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Paystack refund error"
      );
    }
  }

  /**
   * Verify Paystack webhook signature
   * Requires the raw request body (string) before JSON parsing
   */
  verifyWebhookSignature(rawBody: string, signature?: string): boolean {
    if (!signature) return false;

    const hash = crypto
      .createHmac("sha512", this.secretKey)
      .update(rawBody)
      .digest("hex");

    return hash === signature;
  }
}

export const paystackService = new PaystackService();
