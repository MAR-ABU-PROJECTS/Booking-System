// "use client";

// import { toast } from "react-toastify";

// interface FlutterwaveConfig {
//   tx_ref: string;
//   amount: number;
//   currency?: string;
//   customer: {
//     email: string;
//     name: string;
//     phonenumber?: string;
//   };
//   onSuccess?: (response: FlutterwaveResponse) => void;
//   onClose?: () => void;
// }

// interface FlutterwaveResponse {
//   amount: number;
//   charged_amount: number;
//   currency: string;
//   status: string;
//   charge_response_code: string;
//   charge_response_message: string;
//   transaction_id: number;
//   tx_ref: string;
//   flw_ref: string;
//   redirectstatus: string | null;
//   created_at: string;
//   customer: {
//     name: string;
//     email: string;
//     phone_number: string;
//   };
// }

// declare global {
//   interface Window {
//     FlutterwaveCheckout: any;
//   }
// }

// export function initializeFlutterwavePayment(config: FlutterwaveConfig) {
//   if (typeof window === "undefined" || !window.FlutterwaveCheckout) {
//     toast.error("FlutterwaveCheckout not found. Did you add the script?");
//     return;
//   }

//   window.FlutterwaveCheckout({
//     public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY as string,
//     tx_ref: config.tx_ref,
//     amount: config.amount,
//     currency: config.currency || "NGN",
//     payment_options: "card, ussd, mobilemoney",
//     customer: {
//       email: config.customer.email,
//       name: config.customer.name,
//       phonenumber: config.customer.phonenumber,
//     },
//     customizations: {
//       title: "My Store",
//       description: "Payment for Order",
//       logo: "https://example.com/logo.png",
//     },
//     callback: (response: FlutterwaveResponse) => {
//       config.onSuccess?.(response);
//     },
//     onclose: () => {
//       config.onClose?.();
//     },
//   });
// }
