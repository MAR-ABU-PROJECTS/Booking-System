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
exports.flutterwaveService = exports.FlutterwaveService = void 0;
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const axios_2 = require("axios");
const crypto = __importStar(require("crypto"));
class FlutterwaveService {
    constructor() {
        this.baseUrl = "https://api.flutterwave.com/v3";
        this.secretKey = process.env.FLW_SECRET_KEY || "";
        this.secretHash = process.env.FLW_SECRET_HASH;
        if (!this.secretKey) {
            throw new Error("Missing FLW_SECRET_KEY in environment variables");
        }
        // Enable retry for transient network errors (up to 3 times)
        (0, axios_retry_1.default)(axios_1.default, {
            retries: 3,
            retryDelay: axios_retry_1.default.exponentialDelay,
            retryCondition: (error) => {
                return ((0, axios_2.isAxiosError)(error) &&
                    (!error.response ||
                        error.code === "ECONNABORTED" ||
                        error.response.status >= 500));
            },
        });
    }
    get headers() {
        return {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
        };
    }
    async initializePayment(data) {
        // Input validation
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
            const res = await axios_1.default.post(`${this.baseUrl}/payments`, payload, {
                headers: this.headers,
                timeout: 10000,
            });
            return res.data;
        }
        catch (error) {
            this.logError("Flutterwave initialization error", error);
            throw this.handleError(error, "Flutterwave initialization error");
        }
    }
    async verifyPayment(reference) {
        if (!reference)
            throw new Error("Missing payment reference");
        try {
            const res = await axios_1.default.get(`${this.baseUrl}/transactions/${reference}/verify`, { headers: this.headers, timeout: 10000 });
            return res.data;
        }
        catch (error) {
            this.logError("Flutterwave verify error", error);
            throw this.handleError(error, "Flutterwave verify error");
        }
    }
    async refundPayment(transactionId, amount) {
        if (!transactionId)
            throw new Error("Missing transactionId for refund");
        try {
            const payload = { transaction: transactionId };
            if (amount)
                payload.amount = amount;
            const res = await axios_1.default.post(`${this.baseUrl}/refunds`, payload, {
                headers: this.headers,
                timeout: 10000,
            });
            return res.data;
        }
        catch (error) {
            this.logError("Flutterwave refund error", error);
            throw this.handleError(error, "Flutterwave refund error");
        }
    }
    verifyWebhookSignature(body, signature) {
        if (!this.secretHash)
            return false;
        const hash = crypto
            .createHmac("sha512", this.secretHash)
            .update(body)
            .digest("hex");
        return hash === signature;
    }
    // Log errors for monitoring (never log secrets or PII)
    logError(context, error) {
        // Only log safe error details
        if ((0, axios_2.isAxiosError)(error)) {
            console.error(`[FlutterwaveService] ${context}:`, {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                url: error.config?.url,
            });
        }
        else {
            console.error(`[FlutterwaveService] ${context}:`, error);
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
exports.FlutterwaveService = FlutterwaveService;
exports.flutterwaveService = new FlutterwaveService();
