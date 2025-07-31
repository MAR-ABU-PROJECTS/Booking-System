"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import PropertyCard from "./PropertyCard";
import { MapPin, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {properties} from "../lib/mockData";

const PropertyListings = () => {
	const [showMap, setShowMap] = useState(false);
	const [showFilters, setShowFilters] = useState(false);
	const searchParams = useSearchParams();
	const query = searchParams.get("q");

	// Sample property data
	// const properties = [
	// 	{
	// 		id: 1,
	// 		title: "MAR Luxury Penthouse",
	// 		location: "Victoria Island, Lagos",
	// 		price: "₦85,000",
	// 		rating: 4.9,
	// 		reviews: 127,
	// 		images: [],
	// 		bedrooms: 3,
	// 		bathrooms: 2,
	// 		guests: 6,
	// 		isSuperhost: true,
	// 	},
	// 	{
	// 		id: 2,
	// 		title: "MAR Executive Suites",
	// 		location: "Ikoyi Heights, Lagos",
	// 		price: "₦65,000",
	// 		rating: 4.8,
	// 		reviews: 89,
	// 		images: [],
	// 		bedrooms: 2,
	// 		bathrooms: 2,
	// 		guests: 4,
	// 	},
	// 	{
	// 		id: 3,
	// 		title: "MAR Waterfront Residences",
	// 		location: "Lekki Phase 1, Lagos",
	// 		price: "₦95,000",
	// 		rating: 5.0,
	// 		reviews: 156,
	// 		images: [],
	// 		bedrooms: 4,
	// 		bathrooms: 3,
	// 		guests: 8,
	// 		isNew: true,
	// 	},
	// 	{
	// 		id: 4,
	// 		title: "MAR Presidential Villa",
	// 		location: "Banana Island, Lagos",
	// 		price: "₦150,000",
	// 		rating: 4.9,
	// 		reviews: 203,
	// 		images: [],
	// 		bedrooms: 5,
	// 		bathrooms: 4,
	// 		guests: 10,
	// 		isSuperhost: true,
	// 	},
	// 	{
	// 		id: 5,
	// 		title: "MAR Corporate Towers",
	// 		location: "Wuse 2, Abuja",
	// 		price: "₦75,000",
	// 		rating: 4.7,
	// 		reviews: 118,
	// 		images: [],
	// 		bedrooms: 2,
	// 		bathrooms: 2,
	// 		guests: 4,
	// 	},
	// 	{
	// 		id: 6,
	// 		title: "MAR Garden Court",
	// 		location: "Maitama, Abuja",
	// 		price: "₦85,000",
	// 		rating: 4.8,
	// 		reviews: 95,
	// 		images: [],
	// 		bedrooms: 3,
	// 		bathrooms: 2,
	// 		guests: 6,
	// 	},
	// 	{
	// 		id: 7,
	// 		title: "MAR Skyline Apartments",
	// 		location: "GRA, Port Harcourt",
	// 		price: "₦70,000",
	// 		rating: 4.6,
	// 		reviews: 87,
	// 		images: [],
	// 		bedrooms: 2,
	// 		bathrooms: 2,
	// 		guests: 4,
	// 		isNew: true,
	// 	},
	// 	{
	// 		id: 8,
	// 		title: "MAR Heritage Mansion",
	// 		location: "Asokoro, Abuja",
	// 		price: "₦120,000",
	// 		rating: 4.9,
	// 		reviews: 142,
	// 		images: [],
	// 		bedrooms: 4,
	// 		bathrooms: 3,
	// 		guests: 8,
	// 		isSuperhost: true,
	// 	},
	// ];

	return (
		<section className="mt-[150px] lg:mt-[130px] px-4 mx-auto max-w-7xl">
			{/* Header with Filters and Map Toggle */}
			<div className="flex justify-between items-center mb-6">
				{query ? (
					<h2 className="text-2xl font-bold text-gray-900">
						{properties.length} properties in {query}
					</h2>
				) : (
					<div />
				)}

				<div className="flex gap-3">
					{/* Filters Button */}
					<motion.button
						className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm text-sm font-medium text-gray-700"
						onClick={() => setShowFilters(!showFilters)}
						whileHover={{ y: -2 }}
						whileTap={{ scale: 0.95 }}
					>
						<SlidersHorizontal className="w-4 h-4" />
						Filters
					</motion.button>

					{/* Map Toggle Button */}
					<motion.button
						className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm text-sm font-medium text-gray-700"
						onClick={() => setShowMap(!showMap)}
						whileHover={{ y: -2 }}
						whileTap={{ scale: 0.95 }}
					>
						<MapPin className="w-4 h-4" />
						{showMap ? "Hide map" : "Show map"}
					</motion.button>
				</div>
			</div>

			{/* Property Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{properties.map((property) => (
					<PropertyCard key={property.id} {...property} />
				))}
			</div>

			{/* Show More Button */}
			<div className="mt-10 text-center">
				<motion.button
					className="px-6 py-3 bg-amber-500 text-white font-medium rounded-xl shadow-md hover:bg-amber-600 transition-colors"
					whileHover={{ scale: 1.03 }}
					whileTap={{ scale: 0.97 }}
				>
					Show more properties
				</motion.button>
			</div>

			{/* Map View (Placeholder) */}
			{showMap && (
				<div className="fixed inset-0 z-40 bg-white">
					<div className="h-full flex items-center justify-center bg-gray-100">
						<div className="text-center">
							<p className="text-xl font-medium text-gray-700 mb-4">
								Map View
							</p>
							<button
								className="px-4 py-2 bg-amber-500 text-white rounded-lg"
								onClick={() => setShowMap(false)}
							>
								Close Map
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Filters Modal (Placeholder) */}
			{showFilters && (
				<div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center">
					<div className="bg-white rounded-2xl p-6 max-w-md w-full">
						<h3 className="text-xl font-bold mb-4">Filters</h3>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Price range
								</label>
								<div className="h-4 bg-gray-200 rounded-full"></div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Rooms and beds
								</label>
								<div className="flex gap-2">
									{[1, 2, 3, 4, "5+"].map((num) => (
										<button
											key={num}
											className="px-4 py-2 border border-gray-200 rounded-full text-sm"
										>
											{num}
										</button>
									))}
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Property type
								</label>
								<div className="grid grid-cols-2 gap-2">
									{[
										"Apartment",
										"Villa",
										"Penthouse",
										"Mansion",
									].map((type) => (
										<button
											key={type}
											className="px-4 py-2 border border-gray-200 rounded-xl text-sm"
										>
											{type}
										</button>
									))}
								</div>
							</div>
						</div>

						<div className="mt-6 flex justify-between">
							<button
								className="px-4 py-2 text-gray-700 font-medium"
								onClick={() => setShowFilters(false)}
							>
								Clear all
							</button>
							<button
								className="px-6 py-2 bg-amber-500 text-white font-medium rounded-lg"
								onClick={() => setShowFilters(false)}
							>
								Show results
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
};

export default PropertyListings;
