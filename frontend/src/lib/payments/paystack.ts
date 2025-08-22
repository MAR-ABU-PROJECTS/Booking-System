"use client";
import PaystackPop from "@paystack/inline-js";

interface PaystackConfig {
	email: string;
	amount: number;
	reference?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onSuccess?: (reference: string) => void;
	onCancel?: () => void;
}

export function initializePaystackPayment(config: PaystackConfig) {
	const popup = new PaystackPop();

	popup.newTransaction({
		key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY as string,
		email: config.email,
		amount: config.amount,
		currency: "NGN",
		reference: config.reference ?? `ref-${Date.now()}`,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onSuccess: (transaction: any) => {
			console.log("Payment Success:", transaction);
			config.onSuccess?.(transaction);
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

interface ResumeConfig {
	accessCode: string;
	reference?: string;
	onSuccess?: (reference: {
		reference: string;
		status: string;
		trxref: string;
		message: string;
	}) => void;
	onCancel?: () => void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onError?: (err?: any) => void;
}

export function resumePayStackPayment(config: ResumeConfig) {
	const popup = new PaystackPop();
	popup.resumeTransaction(config.accessCode, {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onSuccess: async (trx: any) => {
			console.log("Payment success:", trx);
			config.onSuccess?.(trx);
		},
		onCancel: () => {
			config.onCancel?.();
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onError: (err: any) => {
			console.error("Payment error:", err);
			config.onError?.(err);
		},
	});
}
