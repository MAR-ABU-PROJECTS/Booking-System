// src/services/flutterwaveservice.ts
import axios, { AxiosError, isAxiosError } from "axios";
import axiosRetry from "axios-retry";
import * as crypto from "crypto";

export interface FlutterwaveInitPayload {
  tx_ref: string;
  amount: number;
  currency?: string;
  redirect_url?: string;
  customer: { email: string; name: string };
  customizations?: { title?: string; description?: string; logo?: string };
  meta?: any;
}

export interface FlutterwaveVerifyResponse {
  status: string;
  message: string;
  data: any;
}

export interface FlutterwaveRefundResponse {
  status: string;
  message: string;
  data: any;
}

export class FlutterwaveService {
  private readonly baseUrl = "https://api.flutterwave.com/v3";
  private readonly secretKey: string;
  private readonly secretHash: string | undefined;

  constructor() {
    this.secretKey = process.env.FLW_SECRET_KEY || "";
    this.secretHash = process.env.FLW_SECRET_HASH;
    if (!this.secretKey) throw new Error("Missing FLW_SECRET_KEY in env");

    axiosRetry(axios, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) =>
        isAxiosError(error) &&
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

  async initializePayment(data: FlutterwaveInitPayload): Promise<any> {
    if (!data.tx_ref || !data.amount || !data.customer?.email) {
      throw new Error("Missing required payment initialization fields");
    }
    try {
      const payload = {
        tx_ref: data.tx_ref,
        amount: data.amount,
        currency: data.currency || "NGN",
        redirect_url: data.redirect_url,
        payment_options: "card",
        customer: data.customer,
        meta: data.meta,
        customizations: data.customizations,
      };
      const res = await axios.post(`${this.baseUrl}/payments`, payload, {
        headers: this.headers,
        timeout: 10000,
      });
      return res.data;
    } catch (error: any) {
      this.logError("Flutterwave initialization error", error);
      throw this.handleError(error, "Flutterwave initialization error");
    }
  }

  async verifyPayment(
    referenceOrId: string
  ): Promise<FlutterwaveVerifyResponse> {
    if (!referenceOrId) throw new Error("Missing payment reference/id");
    try {
      const res = await axios.get(
        `${this.baseUrl}/transactions/${referenceOrId}/verify`,
        { headers: this.headers, timeout: 10000 }
      );
      return res.data as FlutterwaveVerifyResponse;
    } catch (error: any) {
      this.logError("Flutterwave verify error", error);
      throw this.handleError(error, "Flutterwave verify error");
    }
  }

  /** Full refund – do not pass amount (Flutterwave infers full refund) */
  async refundPayment(
    transactionId: string
  ): Promise<FlutterwaveRefundResponse> {
    if (!transactionId) throw new Error("Missing transactionId for refund");
    try {
      const payload = { transaction: transactionId }; // full refund only
      const res = await axios.post(`${this.baseUrl}/refunds`, payload, {
        headers: this.headers,
        timeout: 10000,
      });
      return res.data as FlutterwaveRefundResponse;
    } catch (error: any) {
      this.logError("Flutterwave refund error", error);
      throw this.handleError(error, "Flutterwave refund error");
    }
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.secretHash) return false;
    const hash = crypto
      .createHmac("sha512", this.secretHash)
      .update(body)
      .digest("hex");
    return hash === signature;
  }

  private logError(context: string, error: any) {
    if (isAxiosError(error)) {
      console.error(`[FlutterwaveService] ${context}:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        url: error.config?.url,
      });
    } else {
      console.error(`[FlutterwaveService] ${context}:`, error);
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

export const flutterwaveService = new FlutterwaveService();
