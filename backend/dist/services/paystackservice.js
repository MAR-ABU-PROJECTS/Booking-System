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
const crypto = __importStar(require("crypto"));
class PaystackService {
    constructor() {
        this.baseUrl = "https://api.paystack.co";
        this.secretKey = process.env.PAYSTACK_SECRET_KEY ||
            "sk_test_1e6e8aa68ec775e02c9f310870dfa8af8ce0b775";
    }
    /**
     * Initialize payment with PayStack API
     */
    async initializePayment(data) {
        try {
            const payload = {
                amount: Math.round(data.amount), // PayStack expects amount in kobo
                email: data.email,
                reference: data.reference,
                currency: data.currency || "NGN",
                callback_url: data.callback_url,
                metadata: data.metadata,
            };
            const res = await axios_1.default.post(`${this.baseUrl}/transaction/initialize`, payload, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    "Content-Type": "application/json",
                },
            });
            return res.data;
        }
        catch (error) {
            throw new Error(error?.response?.data?.message || error.message || "PayStack init error");
        }
    }
    /**
     * Verify payment with PayStack API
     */
    async verifyPayment(reference) {
        try {
            const res = await axios_1.default.get(`${this.baseUrl}/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    "Content-Type": "application/json",
                },
            });
            return res.data;
        }
        catch (error) {
            throw new Error(error?.response?.data?.message ||
                error.message ||
                "PayStack verify error");
        }
    }
    /**
     * Verify PayStack webhook signature
     */
    verifyWebhookSignature(body, signature) {
        const hash = crypto
            .createHmac("sha512", this.secretKey)
            .update(body)
            .digest("hex");
        return hash === signature;
    }
}
exports.PaystackService = PaystackService;
exports.paystackService = new PaystackService();
