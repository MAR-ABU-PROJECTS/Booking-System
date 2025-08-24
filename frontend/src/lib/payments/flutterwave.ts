"use client";

import { closePaymentModal } from "flutterwave-react-v3";

interface FlutterwaveConfig {
  email: string;
  amount: number;
  phone_number?: string;
  name?: string;
  tx_ref?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (response: any) => void;
  onClose?: () => void;
}

export function initializeFlutterwavePayment(config: FlutterwaveConfig) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FlutterwaveCheckout = (window as any)?.FlutterwaveCheckout;

  FlutterwaveCheckout({
    public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY as string,
    tx_ref: config.tx_ref ?? `flw-${Date.now()}`,
    amount: config.amount,
    currency: "NGN",
    payment_options: "card,ussd,banktransfer",
    customer: {
      email: config.email,
      phonenumber: config.phone_number,
      name: config.name,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (response: any) => {
      config.onSuccess?.(response);
      closePaymentModal();
    },
    onclose: () => {
      config.onClose?.();
    },
  });
}
