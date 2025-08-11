import PropertyListings from "@components/PropertyListings";
import AirbnbStyleNavigation from "@components/AirbnbStyleNavigation";
import Footer from "@components/Footer";
import { Suspense } from "react";

const page = () => {
	return (
		<>
			<AirbnbStyleNavigation whiteBg />
			<Suspense>
				<PropertyListings />
			</Suspense>

			<Footer />
		</>
	);
};

export default page;
