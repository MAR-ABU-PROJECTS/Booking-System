import axios, { AxiosError } from "axios";
import * as crypto from "crypto";

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
    status: string; // "success" | "failed" | "abandoned"
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
    created_at: string;
    updated_at: string;
    gateway_response: string;
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

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  /** Initialize payment */
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
          headers: this.headers,
          timeout: 10000,
        }
      );

      return res.data as PaystackInitResponse;
    } catch (error: any) {
      throw this.handleError(error, "Paystack init error");
    }
  }

  /** Verify payment */
  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: this.headers,
          timeout: 10000,
        }
      );

      return res.data as PaystackVerifyResponse;
    } catch (error: any) {
      throw this.handleError(error, "Paystack verify error");
    }
  }

  /** Refund full payment */
  async refundPayment(reference: string): Promise<PaystackRefundResponse> {
    try {
      const payload = { transaction: reference }; // full refund

      const res = await axios.post(`${this.baseUrl}/refund`, payload, {
        headers: this.headers,
        timeout: 10000,
      });

      return res.data as PaystackRefundResponse;
    } catch (error: any) {
      throw this.handleError(error, "Paystack refund error");
    }
  }

  /** Verify Paystack webhook signature */
  verifyWebhookSignature(rawBody: string, signature?: string): boolean {
    if (!signature) return false;

    const hash = crypto
      .createHmac("sha512", this.secretKey)
      .update(rawBody)
      .digest("hex");

    return hash === signature;
  }

  /** Helper to standardize Paystack errors */
  private handleError(error: AxiosError | any, defaultMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const msg =
        error.response?.data?.message || error.message || defaultMessage;
      return new Error(msg);
    }
    return new Error(defaultMessage);
  }
}

export const paystackService = new PaystackService();
