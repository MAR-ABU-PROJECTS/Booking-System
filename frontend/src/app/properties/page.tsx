import PropertyListings from "@/components/PropertyListings";
import AirbnbStyleNavigation from "../../components/AirbnbStyleNavigation";
import Footer from "../../components/Footer";

const page = () => {
	return (
		<>
			<AirbnbStyleNavigation whiteBg />
			<PropertyListings />
			<Footer />
		</>
	);
};

export default page;
