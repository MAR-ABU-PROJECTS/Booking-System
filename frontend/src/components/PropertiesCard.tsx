"use client";
import { Bath, Bed, MapPin } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { properties } from "@lib/mockData";
import { formatCurrency } from "@lib/utils";

const PropertiesCard = () => {
	// const cardContent = [
	// 	{
	// 		id: 1,
	// 		status: "Premium",
	// 		desc: "Exquisite penthouse with panoramic Lagos lagoon views and premium finishes",
	// 		name: "MAR Luxury Penthouse - Victoria Island",
	// 		location: "Victoria Island, Lagos",
	// 		amenities: ["Ocean View", "Concierge", "Gym"],
	// 		bed: 4,
	// 		baths: 5,
	// 		roomStatus: "AVAILABLE",
	// 		statusColor: "#12B76A",
	// 		amount: "₦285,000",
	// 	},
	// 	{
	// 		id: 2,
	// 		status: "Executive",
	// 		desc: "Sophisticated executive suites with contemporary design and premium amenities",
	// 		name: "MAR Executive Suites - Ikoyi Heights",
	// 		location: "Ikoyi, Lagos",
	// 		amenities: ["City View", "Rooftop Terrance", "Fitness Center"],
	// 		bed: 3,
	// 		baths: 2,
	// 		roomStatus: "LIMITED",
	// 		statusColor: "#F4A857",
	// 		amount: "₦195,000",
	// 	},
	// 	{
	// 		id: 3,
	// 		status: "Water Front",
	// 		desc: "Modern waterfront residence with direct lagoon access and luxury finishes",
	// 		name: "MAR Waterfront Residences - Lekki Phase 1",
	// 		location: "Lekki, Lagos",
	// 		amenities: ["Water Front", "Private Jetty", "Garden"],
	// 		bed: 3,
	// 		baths: 3,
	// 		roomStatus: "AVAILABLE",
	// 		statusColor: "#12B76A",
	// 		amount: "₦165,000",
	// 	},
	// 	{
	// 		id: 4,
	// 		status: "Presidential",
	// 		desc: "Ultra-luxury presidential villa with private beach access and world-class amenities",
	// 		name: "MAR Presidential Villa - Banana Island",
	// 		location: "Banana Island, Lagos",
	// 		amenities: ["Private Beach", "Infinity Pool", "Home Cinema"],
	// 		bed: 5,
	// 		baths: 4,
	// 		roomStatus: "AVAILABLE",
	// 		statusColor: "#12B76A",
	// 		amount: "₦450,000",
	// 	},
	// 	{
	// 		id: 5,
	// 		status: "Corporate",
	// 		desc: "Premium corporate accommodation in the heart of Nigeria's capital city",
	// 		name: "MAR Corporate Towers - Wuse 2, Abuja",
	// 		location: "Wuse 2, Abuja",
	// 		amenities: ["Business Center", "Meeting Rooms", "High-Speed Wifi"],
	// 		bed: 2,
	// 		baths: 2,
	// 		roomStatus: "AVAILABLE",
	// 		statusColor: "#12B76A",
	// 		amount: "₦125,000",
	// 	},
	// 	{
	// 		id: 6,
	// 		status: "Garden",
	// 		desc: "Serene garden court residence in Abuja's most prestigious diplomatic zone",
	// 		name: "MAR Garden Court - Maitama, Abuja",
	// 		location: "Maitama, Abuja",
	// 		amenities: ["Private Garden", "Diplomatic Security", "Quiet Zone"],
	// 		bed: 3,
	// 		baths: 2,
	// 		roomStatus: "LIMITED",
	// 		statusColor: "#F4A857",
	// 		amount: "₦155,000",
	// 	},
	// 	{
	// 		id: 7,
	// 		status: "Skyline",
	// 		desc: "Modern skyline apartments with panoramic city views in Port Harcourt's premier district",
	// 		name: "MAR Skyline Apartments - GRA, Port Harcourt",
	// 		location: "GRA Phase 2, Port Harcourt",
	// 		amenities: ["City Views", "Business District", "Airport Proximity"],
	// 		bed: 2,
	// 		baths: 2,
	// 		roomStatus: "AVAILABLE",
	// 		statusColor: "#12B76A",
	// 		amount: "₦95,000",
	// 	},
	// 	{
	// 		id: 8,
	// 		status: "Heritage",
	// 		desc: "Magnificent heritage mansion in Abuja's most exclusive residential district",
	// 		name: "MAR Heritage Mansion - Asokoro, Abuja",
	// 		location: "Asokoro District, Abuja",
	// 		amenities: [
	// 			"Exclusive District",
	// 			"Private Gardens",
	// 			"VIP Security",
	// 		],
	// 		bed: 4,
	// 		baths: 3,
	// 		roomStatus: "UNAVAILABLE",
	// 		statusColor: "#F04438",
	// 		amount: "₦225,000",
	// 	},
	// ];

	const renderStatus = (roomStatus: string) => {
		let statusColor = "";

		switch (roomStatus.toUpperCase()) {
			case "AVAILABLE":
				statusColor = "#12B76A";
				break;
			case "LIMITED":
				statusColor = "#FFF";
				break;
			case "UNAVAILABLE":
				statusColor = "#F04438";
				break;
			default:
				statusColor = "#D0D5DD";
				break;
		}

		return (
			<div className="absolute top-4 left-4 z-10">
				<Badge
					className="flex items-center gap-2 px-3 py-1 border-0 shadow-md backdrop-blur-sm font-medium"
					style={{
						backgroundColor: statusColor + "15", // transparent background
						color: statusColor,
					}}
				>
					<div
						className="w-2 h-2 rounded-full"
						style={{ backgroundColor: statusColor }}
					/>
					{roomStatus}
				</Badge>
			</div>
		);
	};

	return (
		<div className="mt-[150px] lg:mt-[100px] px-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 py-8 max-w-7xl mx-auto">
			{properties.map((card) => (
				<motion.div
					key={card.id}
					whileHover={{ y: -12, scale: 1.01 }}
					transition={{ type: "spring", stiffness: 300, damping: 25 }}
					className="cursor-pointer group"
				>
					<Card className="relative overflow-hidden bg-white border-0 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl h-[500px] p-0">
						{/* Image Header with Overlay */}
						<div className="relative h-[240px] overflow-hidden rounded-t-2xl group">
							{/* Background Image with Hover effect */}
							{/* <div className="absolute inset-0 bg-center bg-no-repeat bg-[url('/banner/sample.jpg')] bg-cover group-hover:filter-none filter blur-[2px] transition-all duration-500"></div> */}
							<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
							{card.images.length > 0 && (
								<div
									className="absolute inset-0 bg-center bg-no-repeat bg-cover group-hover:filter-none filter blur-[2px] transition-all duration-500"
									style={{
										backgroundImage: `url(${card.images[0]})`,
									}}
								/>
							)}

							{/* Status Badge - Top Right */}
							{card.status && (
								<div className="absolute top-4 right-4 z-10">
									<Badge className="bg-white/90 text-gray-900 border-0 shadow-md font-medium px-3 py-1 backdrop-blur-sm">
										{card.status}
									</Badge>
								</div>
							)}

							{/* Availability Status - Top Left */}
							<div className="absolute top-4 left-4 z-10">
								<Badge
									className="flex items-center gap-2 px-3 py-1 border-0 shadow-md backdrop-blur-sm font-medium"
									style={{
										backgroundColor:
											card.statusColor + "15",
										color: card.statusColor,
									}}
								>
									<div
										className="w-2 h-2 rounded-full"
										style={{
											backgroundColor: card.statusColor,
										}}
									/>
									{card.roomStatus}
								</Badge>
							</div>
							{renderStatus(card.roomStatus)}

							{/* Property Description Overlay */}
							<div className="absolute bottom-4 left-4 right-4 z-10">
								<p className="text-white text-sm leading-relaxed font-light">
									{card.desc}
								</p>
							</div>
						</div>

						<Link href={`/property/${card.id}`}>
							<CardContent className="pb-6 flex flex-col justify-between h-[260px]">
								{/* Property Name & Location */}
								<div className="space-y-3">
									<h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">
										{card.name}
									</h3>
									<div className="flex items-center gap-2 border-t border-gray-100 pt-2">
										<MapPin
											size={16}
											className="text-amber-500 flex-shrink-0"
										/>
										<p className="text-sm text-gray-600 font-medium">
											{card.location}
										</p>
									</div>

									{/* Amenities */}
									<div className="flex flex-wrap gap-2">
										{card.amenities
											.slice(0, 3)
											.map((item, idx) => (
												<Badge
													key={idx}
													className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium px-2 py-1"
												>
													{item}
												</Badge>
											))}
										{card.amenities.length > 3 && (
											<Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-xs font-medium px-2 py-1">
												+{card.amenities.length - 3}{" "}
												more
											</Badge>
										)}
									</div>
								</div>

								{/* Bottom Section */}
								<div className="space-y-4 mt-1.5">
									{/* Bed & Bath Info */}
									<div className="flex items-center gap-6">
										<div className="flex items-center gap-2">
											<Bed
												size={18}
												className="text-gray-500"
											/>
											<span className="text-sm text-gray-600 font-medium">
												{card.bed} Bed
												{card.bed > 1 ? "s" : ""}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Bath
												size={18}
												className="text-gray-500"
											/>
											<span className="text-sm text-gray-600 font-medium">
												{card.baths} Bath
												{card.baths > 1 ? "s" : ""}
											</span>
										</div>
									</div>

									{/* Price & CTA */}
									<div className="flex justify-between items-center pt-2 border-t border-gray-100">
										<div className="flex flex-col">
											<div className="flex items-baseline gap-1">
												<span className="text-2xl font-bold text-gray-900">
													{formatCurrency(card.price)}
												</span>
												<span className="text-sm text-gray-500 font-medium">
													/night
												</span>
											</div>
										</div>

										<Button
											asChild
											size="sm"
											className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 px-6 font-medium cursor-pointer"
										>
											<Link href={`/property/${card.id}`}>
												View Details
											</Link>
										</Button>
									</div>
								</div>
							</CardContent>
						</Link>
					</Card>
				</motion.div>
			))}
		</div>
	);
};

export default PropertiesCard;
