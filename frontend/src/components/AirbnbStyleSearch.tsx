"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import GuestCounter from "@components/GuestCounter";
import { Calendar } from "@components/ui/calendar";
import { useDispatch } from "react-redux";
import { updateBooking } from "@lib/features/bookingSlice";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { homePageBookingSchema } from "@lib/schemas";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { z } from "zod";

const AirbnbStyleSearch = () => {
	const [activeTab, setActiveTab] = useState<string | null>(null);
	const router = useRouter();

	const dispatch = useDispatch();

	const handleTabClick = (tab: string) => {
		setActiveTab(activeTab === tab ? null : tab);
	};

	const handleClose = () => {
		setActiveTab(null);
	};

	// MAR ABU HOMES current apartments
	const marAbuApartments = [
		{
			id: "cmdwwite80003wgkoehn3r6ng",
			name: "WHITE-STONE",
			location: "Victoria Island, Lagos",
			type: "Luxury Apartment",
			price: 85000,
		},
		{
			id: "cmdwwitew000dwgkoewq2h7d9",
			name: "ABIKE PENTHOUSE",
			location: "Ikoyi, Lagos",
			type: "Premium Penthouse",
			price: 120000,
		},
		{
			id: "cmdwwitf8000lwgkod167qhhq",
			name: "OBUDU VILLA",
			location: "Lekki Phase 1, Lagos",
			type: "Executive Villa",
			price: 95000,
		},
		{
			id: "cmdwwitfh000uwgkom0t5wj8u",
			name: "ZIRCON",
			location: "Banana Island, Lagos",
			type: "Luxury Suite",
			price: 110000,
		},
	];

	const form = useForm({
		resolver: zodResolver(homePageBookingSchema),
		defaultValues: {
			stepOne: { location: "", name: "", id:"" },
			stepTwo: { checkin: undefined },
			stepThree: { checkout: undefined },
			stepFour: {
				Guests: {
					adults: 1,
					children: 0,
					infants: 0,
				},
			},
		},
	});

	const location = form.watch("stepOne.location");

	const checkIn = form.watch("stepTwo.checkin");
	const checkOut = form.watch("stepThree.checkout");

	const parsedCheckIn = checkIn ? dayjs(checkIn).format("D MMM") : "";
	const parsedCheckOut = checkOut ? dayjs(checkOut).format("D MMM") : "";

	const guests = form.watch("stepFour.Guests");

	const onSubmit = (data: z.infer<typeof homePageBookingSchema>) => {
		handleClose();
		dispatch(
			updateBooking({ key: "id", value: data.stepOne.id })
		);
		dispatch(
			updateBooking({ key: "location", value: data.stepOne.location })
		);
		dispatch(updateBooking({ key: "name", value: data.stepOne.name }));
		dispatch(updateBooking({ key: "price", value: data.stepOne.price }));
		dispatch(
			updateBooking({ key: "checkIn", value: data.stepTwo.checkin })
		);
		dispatch(
			updateBooking({ key: "checkOut", value: data.stepThree.checkout })
		);
		dispatch(
			updateBooking({ key: "adults", value: data.stepFour.Guests.adults })
		);
		dispatch(
			updateBooking({
				key: "children",
				value: data.stepFour.Guests.children,
			})
		);
		dispatch(
			updateBooking({
				key: "infants",
				value: data.stepFour.Guests.infants,
			})
		);
		router.push(`/booking?id=${data.stepOne.id}`);
	};

	return (
		<div className="relative z-20 px-4 mx-auto max-w-7xl -mt-24">
			<motion.div
				className="bg-white !rounded-[20px] md:rounded-full shadow-xl border border-gray-100 overflow-hidden"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				{/* Main Search Bar */}
				<div className="flex flex-col md:flex-row">
					{/* Where */}
					<div
						className={`relative flex-1 border-b md:border-b-0 md:border-r border-gray-200 ${activeTab === "where" ? "bg-gray-50" : ""}`}
						onClick={() => handleTabClick("where")}
					>
						<div className="px-6 py-4 cursor-pointer">
							<div className="text-xs font-bold text-gray-900 mb-1">
								Where
							</div>
							<div className="text-sm text-gray-500">
								{location || "Search destinations"}
							</div>
						</div>
					</div>

					{/* Check-in */}
					<div
						className={`relative flex-1 border-b md:border-b-0 md:border-r border-gray-200 ${activeTab === "checkin" ? "bg-gray-50" : ""}`}
						onClick={() => handleTabClick("checkin")}
					>
						<div className="px-6 py-4 cursor-pointer">
							<div className="text-xs font-bold text-gray-900 mb-1">
								Check in
							</div>
							<div className="text-sm text-gray-500">
								{parsedCheckIn || "Add dates"}
							</div>
						</div>
					</div>

					{/* Check-out */}
					<div
						className={`relative flex-1 border-b md:border-b-0 md:border-r border-gray-200 ${activeTab === "checkout" ? "bg-gray-50" : ""}`}
						onClick={() => handleTabClick("checkout")}
					>
						<div className="px-6 py-4 cursor-pointer">
							<div className="text-xs font-bold text-gray-900 mb-1">
								Check out
							</div>
							<div className="text-sm text-gray-500">
								{parsedCheckOut || "Add dates"}
							</div>
						</div>
					</div>

					{/* Who */}
					<div
						className={`relative flex-1 flex items-center ${activeTab === "who" ? "bg-gray-50" : ""}`}
						onClick={() => handleTabClick("who")}
					>
						<div className="px-6 py-4 flex-grow cursor-pointer">
							<div className="text-xs font-bold text-gray-900 mb-1">
								Who
							</div>
							<div className="text-sm text-gray-500">
								{guests?.adults > 0 ||
								guests?.children > 0 ||
								guests?.infants > 0 ? (
									<>
										{guests.adults > 0 &&
											`${guests.adults} Adult${guests.adults > 1 ? "s" : ""} `}
										{guests.children > 0 &&
											` ${guests.children} Children `}
										{guests.infants > 0 &&
											`${guests.infants} Infant${guests.infants > 1 ? "s" : ""}`}
									</>
								) : (
									"Add guests"
								)}
							</div>
						</div>

						<div className="pr-2">
							<button className="p-3 bg-amber-500 rounded-full text-white hover:bg-amber-600 transition-colors">
								<Search className="w-5 h-5" />
							</button>
						</div>
					</div>
				</div>

				{/* Expanded Search Panels */}
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<AnimatePresence>
						{activeTab && (
							<motion.div
								className="absolute left-0 right-0 bg-white shadow-2xl rounded-3xl mt-2 border border-gray-200 overflow-hidden"
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.3 }}
							>
								{/* Close Button */}
								<button
									className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100"
									onClick={handleClose}
								>
									<X className="w-4 h-4 text-gray-500" />
								</button>

								{/* Where Panel */}
								{activeTab === "where" && (
									<div className="p-4">
										<h3 className="text-base font-semibold mb-3">
											Choose Your Apartment
										</h3>

										<div className="grid grid-cols-2 gap-2">
											{marAbuApartments.map(
												(apartment, index) => (
													<button
														key={index}
														type="button"
														className="flex items-center gap-2 p-2 border border-gray-100 rounded-lg hover:bg-amber-50 hover:border-amber-200 text-left transition-all duration-200"
														onClick={async () => {
															form.setValue(
																"stepOne.location",
																apartment.location
															);
															form.setValue(
																"stepOne.name",
																apartment.name
															);
															form.setValue(
																"stepOne.price",
																apartment.price
															);
															form.setValue(
																"stepOne.id",
																apartment.id
															);
															const isValid =
																await form.trigger(
																	"stepOne"
																);
															if (isValid) {
																setActiveTab(
																	"checkin"
																);
															}
														}}
													>
														<div className="w-6 h-6 bg-amber-100 rounded-md flex items-center justify-center flex-shrink-0">
															<span className="text-amber-600 font-medium text-xs">
																{apartment.name.charAt(
																	0
																)}
															</span>
														</div>
														<div className="min-w-0 flex-1">
															<div className="font-medium text-gray-900 text-xs truncate">
																{apartment.name}
															</div>
															<div className="text-xs text-gray-500 truncate">
																{
																	apartment.location.split(
																		","
																	)[0]
																}
															</div>
														</div>
													</button>
												)
											)}
										</div>
									</div>
								)}

								{/* Check-in Panel */}
								{activeTab === "checkin" && (
									<div className="p-6">
										<h3 className="text-lg font-bold mb-4">
											When&apos;s your trip?
										</h3>
										<div className="bg-gray-100 p-4 rounded-lg text-center mb-4">
											<p className="text-sm text-gray-600">
												Calendar placeholder
											</p>
											<p className="text-xs text-gray-500 mt-2">
												Select check-in date
											</p>
										</div>

										<div className="flex justify-center">
											<Controller
												control={form.control}
												name="stepTwo.checkin"
												render={({ field }) => (
													<Calendar
														className="w-full max-w-[400px]"
														mode="single"
														disabled={(date) => {
															const today =
																dayjs().startOf(
																	"day"
																);
															return dayjs(
																date
															).isBefore(today);
														}}
														onSelect={(date) => {
															field.onChange(
																date
															);
															setActiveTab(
																"checkout"
															);
														}}
														selected={field.value}
													/>
												)}
											/>
										</div>
									</div>
								)}

								{/* Check-out Panel */}
								{activeTab === "checkout" && (
									<div className="p-6">
										<h3 className="text-lg font-bold mb-4">
											When will you leave?
										</h3>
										<div className="bg-gray-100 p-4 rounded-lg text-center mb-4">
											<p className="text-sm text-gray-600">
												Calendar placeholder
											</p>
											<p className="text-xs text-gray-500 mt-2">
												Select check-out date
											</p>
										</div>

										<div className="flex justify-center">
											<Controller
												control={form.control}
												name="stepThree.checkout"
												render={({ field }) => (
													<Calendar
														className="w-full max-w-[400px]"
														mode="single"
														disabled={(date) => {
															const checkinDay =
																dayjs(
																	checkIn
																).startOf(
																	"day"
																);
															return dayjs(
																date
															).isBefore(
																checkinDay
															);
														}}
														onSelect={(date) => {
															field.onChange(
																date
															);
															setActiveTab("who");
														}}
														selected={field.value}
													/>
												)}
											/>
										</div>
									</div>
								)}

								{/* Who Panel */}
								{activeTab === "who" && (
									<div className="p-6">
										<h3 className="text-lg font-bold mb-4">
											Who&apos;s coming?
										</h3>

										<div className="space-y-4">
											<Controller
												control={form.control}
												name="stepFour.Guests.adults"
												render={({ field }) => (
													<GuestCounter
														title="Adults"
														subtitle="Ages 13 or above"
														value={field.value}
														onChange={
															field.onChange
														}
													/>
												)}
											/>

											<Controller
												control={form.control}
												name="stepFour.Guests.children"
												render={({ field }) => (
													<GuestCounter
														title="Children"
														subtitle="Ages 2-12"
														value={field.value}
														onChange={
															field.onChange
														}
													/>
												)}
											/>

											<Controller
												control={form.control}
												name="stepFour.Guests.infants"
												render={({ field }) => (
													<GuestCounter
														title="Infants"
														subtitle="Under 2"
														value={field.value}
														onChange={
															field.onChange
														}
													/>
												)}
											/>
										</div>

										<div className="mt-6 flex justify-between items-center">
											<button
												type="button"
												className="text-sm font-medium underline"
												onClick={() => {
													form.reset();
													handleClose();
												}}
											>
												Clear
											</button>

											<button
												type="submit"
												className="px-6 py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
												// onClick={() => {
												// 	handleClose();
												// 	router.push
												// }}
											>
												Save
											</button>
										</div>
									</div>
								)}
							</motion.div>
						)}
					</AnimatePresence>
				</form>
			</motion.div>
		</div>
	);
};

export default AirbnbStyleSearch;
