import SingleProperty from "@/components/SingleProperty";
import { getPropertyById } from "../../../lib/api";
import AirbnbStyleNavigation from "../../../components/AirbnbStyleNavigation";
import Footer from "@/components/Footer";

type props = {
	params: { id: string };
};
const page = async ({ params }: props) => {
	const { id } = await params;
	const property = await getPropertyById(Number(id));

	if (!property) {
		return (
			<div className="">
				<h1 className="text-center mt-5">Error getting Property</h1>
				<Footer />
			</div>
		);
	}

	return (
		<div className="relative">
			<AirbnbStyleNavigation whiteBg />
			<SingleProperty property={property} />
			<Footer />
		</div>
	);
};

export default page;
