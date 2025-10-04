import {PaymentStatus} from "@lib/type";

export const paymentStatusColors: Record<PaymentStatus, string> = {
	PENDING: "bg-yellow-100 text-yellow-800",
	PROCESSING: "bg-blue-100 text-blue-800",
	PAID: "bg-green-100 text-green-800",
	FAILED: "bg-red-100 text-red-800",
	REFUNDED: "bg-purple-100 text-purple-800",
	PARTIALLY_REFUNDED: "bg-orange-100 text-orange-800",
	PARTIALLY_PAID: "bg-teal-100 text-teal-800",
	EXPIRED: "bg-gray-200 text-gray-900",
};

const PaymentStatusBadge = ({ status }: { status?: PaymentStatus }) => {
	if (!status) return null;

	return (
		<span
			className={`px-3 py-1 rounded-full text-sm font-medium ${
				paymentStatusColors[status] ?? "bg-gray-100 text-gray-800"
			}`}
		>
			{status.replace("_", " ")}
		</span>
	);
};

export default PaymentStatusBadge;
