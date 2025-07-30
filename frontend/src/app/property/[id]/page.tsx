import SingleProperty from "@/components/SingleProperty";
import { getPropertyById } from "../../../lib/api";
import AirbnbStyleNavigation from "../../../components/AirbnbStyleNavigation";

type props = {
	params: { id: string };
};
const page = async ({ params }: props) => {
	const { id } = await params;
	const property = await getPropertyById(Number(id));

	if (property) {
		return (
			<div className='relative'>
				<AirbnbStyleNavigation />
				<SingleProperty property={property} />
			</div>
		);
	}
};

export default page;
