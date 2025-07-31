import PropertyListings from "@/components/PropertyListings";
import AirbnbStyleNavigation from "../../components/AirbnbStyleNavigation";
const page = () => {
	return (
		<>
			<AirbnbStyleNavigation whiteBg />
			<PropertyListings />
		</>
	);
};

export default page;
