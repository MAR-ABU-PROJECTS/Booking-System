import { bookings } from "@lib/mockData";
import BookingCard from "@components/BookingCard";

const BookingHistoryList = () => {
	return (
		<div className="mt-[150px] lg:mt-[130px] px-4 mx-auto max-w-7xl mb-10">
			<h2 className="text-2xl font-bold text-gray-900 mb-5">
				Booking History
			</h2>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{bookings.map((booking, i: number) => (
					<BookingCard key={i} {...booking} />
				))}
			</div>
		</div>
	);
};

export default BookingHistoryList;
