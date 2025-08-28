"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paystackService = exports.PaystackService = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const crypto = __importStar(require("crypto"));
class PaystackService {
    constructor() {
        this.baseUrl = "https://api.paystack.co";
        if (!process.env.PAYSTACK_SECRET_KEY) {
            throw new Error("Missing PAYSTACK_SECRET_KEY in environment variables");
        }
        this.secretKey = process.env.PAYSTACK_SECRET_KEY;
        (0, axios_retry_1.default)(axios_1.default, {
            retries: 3,
            retryDelay: axios_retry_1.default.exponentialDelay,
            retryCondition: (error) => axios_1.default.isAxiosError(error) &&
                (!error.response ||
                    error.code === "ECONNABORTED" ||
                    (error.response?.status ?? 0) >= 500),
        });
    }
    get headers() {
        return {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
        };
    }
    async initializePayment(data) {
        if (!data.amount || !data.email || !data.reference) {
            throw new Error("Missing required payment initialization fields");
        }
        try {
            const payload = {
                amount: Math.round(data.amount * 100),
                email: data.email,
                reference: data.reference,
                currency: data.currency || "NGN",
            };
            if (data.callback_url)
                payload.callback_url = data.callback_url;
            if (data.metadata)
                payload.metadata = data.metadata;
            const res = await axios_1.default.post(`${this.baseUrl}/transaction/initialize`, payload, { headers: this.headers, timeout: 10000 });
            return res.data;
        }
        catch (error) {
            this.logError("Paystack init error", error);
            throw this.handleError(error, "Paystack init error");
        }
    }
    async verifyPayment(reference) {
        if (!reference)
            throw new Error("Missing payment reference");
        try {
            const res = await axios_1.default.get(`${this.baseUrl}/transaction/verify/${reference}`, { headers: this.headers, timeout: 10000 });
            return res.data;
        }
        catch (error) {
            this.logError("Paystack verify error", error);
            throw this.handleError(error, "Paystack verify error");
        }
    }
    /** Full refund – always full, no partials */
    async refundPayment(reference) {
        if (!reference)
            throw new Error("Missing refund reference");
        try {
            const payload = { transaction: reference }; // full refund
            const res = await axios_1.default.post(`${this.baseUrl}/refund`, payload, {
                headers: this.headers,
                timeout: 10000,
            });
            // ✅ Treat "already refunded" as idempotent success
            if (res.data?.status === false &&
                res.data?.message?.toLowerCase().includes("already refunded")) {
                return { ...res.data, status: true };
            }
            return res.data;
        }
        catch (error) {
            this.logError("Paystack refund error", error);
            throw this.handleError(error, "Paystack refund error");
        }
    }
    verifyWebhookSignature(body, signature) {
        if (!body || !signature || !this.secretKey)
            return false;
        try {
            const hash = crypto
                .createHmac("sha512", this.secretKey)
                .update(body)
                .digest("hex");
            return hash === signature;
        }
        catch {
            return false;
        }
    }
    logError(context, error) {
        if (error instanceof Error) {
            console.error(`[PaystackService] ${context}:`, {
                message: error.message,
                stack: error.stack,
            });
        }
        else {
            console.error(`[PaystackService] ${context}:`, error);
        }
    }
    handleError(error, defaultMessage) {
        if (axios_1.default.isAxiosError(error)) {
            const msg = error.response?.data?.message ||
                error.message ||
                defaultMessage;
            return new Error(msg);
        }
        return new Error(defaultMessage);
    }
}
exports.PaystackService = PaystackService;
exports.paystackService = new PaystackService();
