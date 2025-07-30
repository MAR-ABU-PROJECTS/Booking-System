"use client";
import PropertyImagesGallery from "./PropertyImageGallery";
import type { Property } from "../lib/type";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { Calendar } from "@/components/ui/calendar";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookSchema } from "../lib/schemas";
import dayjs from "dayjs";
import { Bath, Bed } from "lucide-react";

const SingleProperty = ({ property }: { property: Property }) => {
	const form = useForm<z.infer<typeof BookSchema>>({
		resolver: zodResolver(BookSchema),
		defaultValues: {
			bookingDate: {
				from: new Date(),
				to: undefined,
			},
			children: 0,
			adults: 1,
			infants: 0,
		},
		mode: "onChange",
	});

	return (
		<section className="mt-[150px] lg:mt-[100px]">
			<div className="max-w-7xl mx-auto px-4  pb-10">
				<div>
					<div className="py-2 mb-4">
						<h2 className="font-semibold text-[18px] sm:text-2xl">
							{property.location}
						</h2>
					</div>

					<PropertyImagesGallery images={property.images} />
					<FormProvider {...form}>
						<form className="md:pt-9 lg:pt-12 md:flex md:justify-between">
							<div className="md:basis-[52%] lg:basis-[58%] mb-6">
								<div className="mt-3 py-4 md:py-5 border-b-[1px] border-black/20 w-full flex justify-between gap-4 items-center">
									<div className="flex flex-col">
										<div className="flex flex-wrap gap-x-3">
											<p>{property.bed} beds</p>
											<p>{property.baths} bathroom</p>
										</div>
									</div>
									<div className="flex items-center gap-6">
										<div className="flex items-center gap-2">
											<Bed
												size={18}
												className="text-gray-500"
											/>
											<span className="text-sm text-gray-600 font-medium">
												{property.bed} Bed
												{property.bed > 1 ? "s" : ""}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Bath
												size={18}
												className="text-gray-500"
											/>
											<span className="text-sm text-gray-600 font-medium">
												{property.baths} Bath
												{property.baths > 1 ? "s" : ""}
											</span>
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
											<li
												className="list-none m-1"
												key={i}
											>
												{item}
											</li>
										))}
									</div>
								</div>

								<Controller
									control={form.control}
									name="bookingDate"
									render={({ field }) => (
										<div className="w-full mt-5">
											<Calendar
												mode="range"
												className="w-full"
												selected={field.value}
												captionLayout="dropdown"
												numberOfMonths={2}
												disabled={(date) => {
													const today =
														dayjs().startOf("day");
													const selectedDate =
														dayjs(date).startOf(
															"day"
														);
													return selectedDate.isBefore(
														today
													);
												}}
												onSelect={(dateRange) => {
													field.onChange(dateRange);
												}}
											/>
										</div>
									)}
								/>
							</div>

							<div className="border-[1px] rounded-[13px] md:basis-[35%] lg:basis-[30%] md:sticky md:top-[95px] lg:top-[105px] h-full shadow-lg">
								<AvailabilityCalendar price={property.price} />
							</div>
						</form>
					</FormProvider>
				</div>
			</div>
		</section>
	);
};

export default SingleProperty;
