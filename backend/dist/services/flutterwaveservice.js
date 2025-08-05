"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flutterwaveService = exports.FlutterwaveService = void 0;
class FlutterwaveService {
    /**
     * Dummy initialize payment for testing
     */
    async initializePayment(data) {
        // Return a fake response for testing
        return {
            status: "success",
            message: "Dummy payment initialized",
            data: {
                link: "https://flutterwave.com/pay/dummy-authorization",
                tx_ref: data.tx_ref,
                amount: data.amount,
                currency: data.currency || "NGN",
                email: data.email,
                redirect_url: data.redirect_url,
                meta: data.meta,
                customer: data.customer, // <-- Include in response if needed
                customizations: data.customizations, // <-- Include in response if needed
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
                tx_ref: reference,
                gateway_response: "Approved",
            },
        };
    }
    /**
     * Dummy verify webhook signature for testing
     */
    verifyWebhookSignature(body, signature) {
        // For real implementation, you would compare the signature with your secret hash
        // For testing, always return true
        return true;
    }
}
exports.FlutterwaveService = FlutterwaveService;
exports.flutterwaveService = new FlutterwaveService();
