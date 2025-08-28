import axios, { AxiosError } from "axios";
import axiosRetry from "axios-retry";
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
  data: any;
}

export interface PaystackRefundResponse {
  status: boolean;
  message: string;
  data?: any;
}

export class PaystackService {
  private readonly baseUrl = "https://api.paystack.co";
  private readonly secretKey: string;

  constructor() {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new Error("Missing PAYSTACK_SECRET_KEY in environment variables");
    }
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;

    axiosRetry(axios, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) =>
        axios.isAxiosError(error) &&
        (!error.response ||
          error.code === "ECONNABORTED" ||
          (error.response?.status ?? 0) >= 500),
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };
  }

  async initializePayment(data: {
    amount: number;
    email: string;
    reference: string;
    currency?: string;
    callback_url?: string;
    metadata?: any;
  }): Promise<PaystackInitResponse> {
    if (!data.amount || !data.email || !data.reference) {
      throw new Error("Missing required payment initialization fields");
    }
    try {
      const payload: any = {
        amount: Math.round(data.amount * 100),
        email: data.email,
        reference: data.reference,
        currency: data.currency || "NGN",
      };
      if (data.callback_url) payload.callback_url = data.callback_url;
      if (data.metadata) payload.metadata = data.metadata;

      const res = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        payload,
        { headers: this.headers, timeout: 10000 }
      );
      return res.data as PaystackInitResponse;
    } catch (error: any) {
      this.logError("Paystack init error", error);
      throw this.handleError(error, "Paystack init error");
    }
  }

  async verifyPayment(reference: string) {
    if (!reference) throw new Error("Missing payment reference");
    try {
      const res = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        { headers: this.headers, timeout: 10000 }
      );
      return res.data;
    } catch (error: any) {
      this.logError("Paystack verify error", error);
      throw this.handleError(error, "Paystack verify error");
    }
  }

  /** Full refund – always full, no partials */
  async refundPayment(reference: string): Promise<PaystackRefundResponse> {
    if (!reference) throw new Error("Missing refund reference");
    try {
      const payload = { transaction: reference }; // full refund
      const res = await axios.post(`${this.baseUrl}/refund`, payload, {
        headers: this.headers,
        timeout: 10000,
      });

      // ✅ Treat "already refunded" as idempotent success
      if (
        res.data?.status === false &&
        res.data?.message?.toLowerCase().includes("already refunded")
      ) {
        return { ...res.data, status: true };
      }

      return res.data as PaystackRefundResponse;
    } catch (error: any) {
      this.logError("Paystack refund error", error);
      throw this.handleError(error, "Paystack refund error");
    }
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!body || !signature || !this.secretKey) return false;
    try {
      const hash = crypto
        .createHmac("sha512", this.secretKey)
        .update(body)
        .digest("hex");
      return hash === signature;
    } catch {
      return false;
    }
  }

  private logError(context: string, error: any) {
    if (error instanceof Error) {
      console.error(`[PaystackService] ${context}:`, {
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error(`[PaystackService] ${context}:`, error);
    }
  }

  private handleError(error: AxiosError | any, defaultMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const msg =
        (error.response?.data as any)?.message ||
        error.message ||
        defaultMessage;
      return new Error(msg);
    }
    return new Error(defaultMessage);
  }
}

export const paystackService = new PaystackService();
