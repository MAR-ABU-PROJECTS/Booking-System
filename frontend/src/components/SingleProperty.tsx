"use client";
import PropertyImagesGallery from "./PropertyImageGallery";
import type { Property } from "@lib/type";
import AvailabilityCalendar from "@components/AvailabilityCalendar";
import { Calendar } from "@components/ui/calendar";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookSchema } from "@lib/schemas";
import dayjs from "dayjs";
import { Bath, Bed, Share, Heart } from "lucide-react";
import { useDispatch } from "react-redux";
import { updateBooking } from "@lib/features/bookingSlice";
import { useEffect } from "react";
import { toTitleCase } from "@lib/utils";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const SingleProperty = ({ property }: { property: Property }) => {
	const router = useRouter();
	const dispatch = useDispatch();
	const form = useForm<z.infer<typeof BookSchema>>({
		resolver: zodResolver(BookSchema),
		defaultValues: {
			id: "",
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

	useEffect(() => {
		form.reset({
			id: property.id,
		});
	}, [form, property.id]);

	useEffect(() => {
		dispatch(updateBooking({ key: "id", value: property.id }));
		dispatch(updateBooking({ key: "location", value: property.location }));
		dispatch(updateBooking({ key: "name", value: property.name }));
	}, [dispatch, property.name, property.location, property.id]);

	const handleShare = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			toast.success("link copied!", {
				closeOnClick: true,
				progress: undefined,
			});
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (error: any) {
			toast.error(
				`failed to copy!: ${error?.message ?? "unknown error"}`,
				{
					closeOnClick: true,
					progress: undefined,
				}
			);
		}
	};

	const onSubmit = (values: z.infer<typeof BookSchema>) => {
		router.push(`/booking?id=${values.id}`);
	};

	return (
		<section className="mt-[160px] lg:mt-[110px]">
			<div className="max-w-7xl mx-auto px-4  pb-10">
				<div>
					<div className="flex justify-between items-center">
						<h2 className="font-medium text-[18px] sm:text-2xl">
							{toTitleCase(property.name)}, {property.location}
						</h2>

						<div className="flex items-center gap-6">
							<button
								name="share link"
								className="flex items-center gap-1.5 hover:scale-95 !cursor-pointer"
								onClick={handleShare}
							>
								<Share size={18} className="text-black" />
								<span className="text-sm text-black font-medium underline">
									Share
								</span>
							</button>
							<div className="flex items-center gap-1.5 !cursor-pointer">
								<Heart
									size={18}
									className="text-black hover:fill-red-600"
								/>
								<span className="text-sm text-black font-medium underline">
									Save
								</span>
							</div>
						</div>
					</div>

					<PropertyImagesGallery images={property.images} />
					<FormProvider {...form}>
						<form
							className="md:pt-9 lg:pt-12 md:flex md:justify-between"
							onSubmit={form.handleSubmit(onSubmit)}
						>
							<div className="md:basis-[52%] lg:basis-[58%] mb-6">
								<div className="mt-3 py-4 md:py-5 border-b-[1px] border-black/20 w-full flex justify-between gap-4 items-center">
									<div className="flex items-center gap-6">
										<div className="flex items-center gap-2">
											<Bed
												size={18}
												className="text-black"
											/>
											<span className="text-sm text-black font-medium">
												{property.bed} Bed
												{property.bed > 1 ? "s" : ""}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Bath
												size={18}
												className="text-black"
											/>
											<span className="text-sm text-black font-medium">
												{property.baths} Bath
												{property.baths > 1 ? "s" : ""}
											</span>
										</div>
									</div>
								</div>

								<div className="py-5  border-b-[1px] border-black/20">
									<h3 className="font-semibold mb-3 text-[18px] sm:text-[22px] lg:text-[30px] text-black">
										About this place
									</h3>
									<p>{property.desc}</p>
								</div>

								<div className="py-5 sm:py-7 border-b-[1px] border-black/20">
									<p className="font-semibold mb-3 text-[18px] sm:text-[22px] lg:text-[30px] text-black">
										Ameneties
									</p>

									<ul className="grid grid-cols-2 gap-4 list-disc">
										{property.amenities.map((item, i) => (
											<li className="m-1" key={i}>
												{item}
											</li>
										))}
									</ul>
								</div>
								<div className="py-5 sm:py-7 border-b-[1px] border-black/20">
									<p className="font-semibold mb-3 text-[18px] sm:text-[22px] lg:text-[30px] text-black">
										What this place Offers
									</p>

									<ul className="grid sm:grid-cols-2 gap-5 list-disc">
										{property.specials?.map((item, i) => (
											<li className="m-1" key={i}>
												{item
													.replace(/&apos;/g, "'")
													.replace(/&ndash;/g, "-")}
											</li>
										))}
									</ul>
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
													if (dateRange) {
														dispatch(
															updateBooking({
																key: "checkIn",
																value: dateRange?.from?.toISOString(),
															})
														);
														dispatch(
															updateBooking({
																key: "checkOut",
																value: dateRange?.to?.toISOString(),
															})
														);
													}
												}}
											/>
										</div>
									)}
								/>
							</div>

							<div className="border-[1px] rounded-[13px] md:basis-[35%] lg:basis-[30%] md:sticky md:top-[95px] lg:top-[105px] h-full shadow-lg">
								<AvailabilityCalendar />
							</div>
						</form>
					</FormProvider>
				</div>
			</div>
		</section>
	);
};

export default SingleProperty;
