import {BookingStatus} from "@lib/type"; 
import { Badge } from "./ui/badge";

export const statusColors: Record<BookingStatus, string> = {
	PENDING: "bg-yellow-100 text-yellow-800",
	APPROVED: "bg-blue-100 text-blue-800",
	CONFIRMED: "bg-green-100 text-green-800",
	CANCELLED: "bg-gray-100 text-gray-800",
	COMPLETED: "bg-green-200 text-green-900",
	EXPIRED: "bg-red-100 text-red-800",
	REJECTED: "bg-red-200 text-red-900",
	CHECKED_IN: "bg-indigo-100 text-indigo-800",
	CHECKED_OUT: "bg-purple-100 text-purple-800",
	REFUNDED: "bg-orange-100 text-orange-800",
};

const BookingStatusBadge = ({ status }: { status?: BookingStatus }) => {
	if (!status) return null;

	return (
		<Badge
			className={`px-2 py-0.5 rounded-full text-sm font-medium ${
				statusColors[status] ?? "bg-gray-100 text-gray-800"
			}`}
		>
			{status.replace("_", " ")}
		</Badge>
	);
};

export default BookingStatusBadge;