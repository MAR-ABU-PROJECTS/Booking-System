import PropertyImagesGallery from "./PropertyImageGallery";
import type { Property } from "../lib/type";

const SingleProperty = ({ property }: { property: Property }) => {
	return (
		<section className='mt-[150px] lg:mt-[100px]'>
			<div className="max-w-7xl mx-auto px-4  pb-10">
				<div>
					<div className="py-2 mb-4">
						<h2 className="font-semibold text-[18px] sm:text-2xl">
							{property.location}
						</h2>
					</div>

					<PropertyImagesGallery images={property.images} />
					<div className="md:pt-9 lg:pt-12 md:flex md:justify-between">
						<div className="md:basis-[52%] lg:basis-[58%] mb-6">
							<div className="mt-3 py-4 md:py-5 border-b-[1px] border-black/20 w-full flex justify-between gap-4 items-center">
								<div className="flex flex-col">
									<div className="flex flex-wrap gap-x-3">
										<p>{property.bed} beds</p>
										<p>{property.baths} bathroom</p>
									</div>
								</div>
							</div>

							
							<div className="py-5  border-b-[1px] border-black/20">
								<h3 className="font-semibold mb-3 sm:text-[22px] lg:text-[30px] text-black">
									About this place
								</h3>
								<p>{property.desc}</p>
							</div>

							<div className="py-5 sm:py-7 border-b-[1px] border-black/20">
								<p className="font-semibold mb-3 text-[18px] sm:text-[22px] text-black">
									What this place Offers
								</p>

								<div className="grid grid-cols-2 max-w-[450px]">
									{property.amenities.map((item, i) => (
										<li className="list-none m-1" key={i}>
											{item}
										</li>
									))}
								</div>
							</div>
						</div>


<h2> AvailabilityCalendar.tsx and reserve block</h2>
						
					</div>
				</div>
			</div>
		</section>
	);
};

export default SingleProperty;
