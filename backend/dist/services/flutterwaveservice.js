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
const axios_1 = __importStar(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
class FlutterwaveService {
    constructor() {
        this.baseUrl = "https://api.flutterwave.com/v3";
        this.secretKey = process.env.FLW_SECRET_KEY || "";
        this.secretHash = process.env.FLW_SECRET_HASH;
        if (!this.secretKey)
            throw new Error("Missing FLW_SECRET_KEY in env");
        (0, axios_retry_1.default)(axios_1.default, {
            retries: 3,
            retryDelay: axios_retry_1.default.exponentialDelay,
            retryCondition: (error) => (0, axios_1.isAxiosError)(error) &&
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
    async verifyPayment(referenceOrId) {
        if (!referenceOrId)
            throw new Error("Missing payment reference/id");
        try {
            const res = await axios_1.default.get(`${this.baseUrl}/transactions/${referenceOrId}/verify`, { headers: this.headers, timeout: 10000 });
            return res.data;
        }
        catch (error) {
            this.logError("Flutterwave verify error", error);
            throw this.handleError(error, "Flutterwave verify error");
        }
    }
    /** Full refund – always full, no partials */
    async refundPayment(transactionId) {
        if (!transactionId) {
            throw new Error("Missing Flutterwave transaction id");
        }
        try {
            const res = await axios_1.default.post(`${this.baseUrl}/transactions/${transactionId}/refund`, { comments: "Full refund initiated by admin" }, { headers: this.headers, timeout: 10000 });
            return res.data;
        }
        catch (error) {
            const msg = error?.response?.data?.message ||
                error?.message ||
                "Refund processing failed";
            throw new Error(msg);
        }
    }
    verifyWebhookSignature(headerValue) {
        if (!this.secretHash)
            return false;
        return headerValue === this.secretHash;
    }
    logError(context, error) {
        if ((0, axios_1.isAxiosError)(error)) {
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
