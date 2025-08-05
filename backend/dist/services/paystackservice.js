"use strict";
// import axios from "axios";
// import * as crypto from "crypto";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paystackService = exports.PaystackService = void 0;
class PaystackService {
    constructor() {
        this.baseUrl = "https://api.paystack.co";
        this.secretKey = process.env.PAYSTACK_SECRET_KEY || "";
    }
    /**
     * Dummy initialize payment for testing
     */
    async initializePayment(data) {
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
    async verifyPayment(reference) {
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
    verifyWebhookSignature(body, signature) {
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
exports.PaystackService = PaystackService;
exports.paystackService = new PaystackService();
