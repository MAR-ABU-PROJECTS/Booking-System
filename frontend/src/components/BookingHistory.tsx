import AirbnbStyleNavigation from "@components/AirbnbStyleNavigation";
import BookingHistoryList from "@components/BookingHistoryList";
import Footer from "@components/Footer";

const BookingHistory = () => {
	return (
		<div>
			<AirbnbStyleNavigation whiteBg />

			<BookingHistoryList />
			<Footer />
		</div>
	);
};

export default BookingHistory;
