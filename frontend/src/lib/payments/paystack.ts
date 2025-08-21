"use client";
import Paystack from "@paystack/inline-js";

interface PaystackConfig {
	email: string;
	amount: number;
	reference?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onSuccess?: (reference: string) => void;
	onCancel?: () => void;
}

export function initializePaystackPayment(config: PaystackConfig) {
	const popup = new Paystack();

	popup.newTransaction({
		key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY as string,
		email: config.email,
		amount: config.amount,
    currency:"NGN",
		reference: config.reference ?? `ref-${Date.now()}`,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onSuccess: (transaction: any) => {
			console.log("Payment Success:", transaction);
			config.onSuccess?.(transaction.reference);
		},
		onCancel: () => {
			console.log("Payment Cancelled");
			config.onCancel?.();
		},
		onError: (error) => {
			console.log(error.message);
		},
	});
}
