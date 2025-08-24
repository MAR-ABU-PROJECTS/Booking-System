"use client";
import PaystackPop from "@paystack/inline-js";

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
