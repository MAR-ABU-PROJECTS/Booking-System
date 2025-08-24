import AuthGuard from "@components/AuthGuard";
import BookingHistory from "@components/BookingHistory";

const page = () => {
	return (
		<AuthGuard>
			<BookingHistory />
		</AuthGuard>
	);
};

export default page;
