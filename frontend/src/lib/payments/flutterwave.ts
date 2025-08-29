"use client";

import { closePaymentModal } from "flutterwave-react-v3";
import { apiService } from "@lib/apiService";
import { toast } from "react-toastify";

interface FlutterwaveConfig {
	tx_ref: string;
	amount: number;
	currency?: string;
	customer: {
		email: string;
		name: string;
	};
	onSuccess?: (response: FlutterwaveResponse) => void;
	onClose?: () => void;
}

interface FlutterwaveResponse {
	amount: number;
	charged_amount: number;
	currency: string;
	status: string;
	charge_response_code: string;
	charge_response_message: string;
	transaction_id: number;
	tx_ref: string;
	flw_ref: string;
	redirectstatus: string | null;
	created_at: string;
	customer: {
		name: string;
		email: string;
		phone_number: string;
	};
}

export function initializeFlutterwavePayment(config: FlutterwaveConfig) {
	const FlutterwaveCheckout = (window as any)?.FlutterwaveCheckout;

	if (!FlutterwaveCheckout) {
		toast.error("FlutterwaveCheckout not found.");
		return;
	}

	FlutterwaveCheckout({
		public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY as string,
		tx_ref: config.tx_ref,
		amount: config.amount,
		currency: config.currency || "NGN",
		customer: config.customer,
		callback: async (response: FlutterwaveResponse) => {
			try {
				// await apiService.post("/")

				config.onSuccess?.(response);

				// Optional: verify transaction with your backend
				// await fetch("/api/payments/verify", { ... })
			} finally {
				closePaymentModal(); // ensures modal closes after payment
			}
		},
		onclose: () => {
			config.onClose?.();
		},
	});
}
