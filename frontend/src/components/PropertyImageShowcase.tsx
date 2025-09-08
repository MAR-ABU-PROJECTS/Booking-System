"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Maximize2, MapPin } from "lucide-react";
import { properties } from "../lib/mockData"; // import your properties array
import { formatCurrency } from "@lib/utils";
import Link from "next/link";

interface PropertyImage {
	id: number;
	src: string;
	alt: string;
	category: string;
}

const PropertyImageShowcase = () => {
	const [selectedApartment, setSelectedApartment] = useState<string | null>(
		null
	);
	const [activeCategory, setActiveCategory] = useState<string>("all");
	const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
		null
	);

	// Categories for room types (optional)
	const categories = ["All", "Living room", "Bedroom", "Bathroom", "Kitchen"];

	// Get the selected apartment object
	const apartment = properties.find((p) => p.name === selectedApartment);

	// Generate PropertyImage array from apartment images
	const propertyImages: PropertyImage[] = apartment
		? apartment.images.map((src, idx) => ({
				id: idx,
				src,
				alt: `${apartment.name} - Image ${idx + 1}`,
				category: categories[idx % categories.length], // optional category mapping
			}))
		: [];

	return (
		<section className="py-12 px-4 mx-auto max-w-7xl">
			<div className="text-center mb-10">
				<h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
					Explore Our Luxury Spaces
				</h2>
				<p className="text-lg text-gray-600 max-w-3xl mx-auto">
					Immerse yourself in the elegance and comfort of our premium apartments
				</p>
			</div>

			{/* Apartment Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				{properties.map((apt) => (
					<motion.div
						key={apt.id}
						className={`bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 cursor-pointer ${
							selectedApartment === apt.name ? "ring-2 ring-amber-500" : ""
						}`}
						whileHover={{ y: -5 }}
						transition={{ duration: 0.2 }}
						onClick={() => {
							setSelectedApartment(apt.name);
							setActiveCategory("all");
							setSelectedImageIndex(null);
						}}
					>
						{/* Apartment Image */}
						<div className="relative h-48">
							{/* Using indoor.jpg as background for all apartments */}
							<div
								className="absolute inset-0 bg-center bg-cover"
								style={{
									backgroundImage: `url(${apt.images[0]})`,
								}}
							>
								<div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
							</div>

							{/* Property Type Badge */}
							<div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-800">
								{apt.type}
							</div>

							{/* Rating Badge */}
							<div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs">
								<span className="text-amber-500">★</span>
								<span className="font-medium">{apt.rating}</span>
							</div>
						</div>

						{/* Apartment Details */}
						<div className="p-4">
							<h4 className="text-lg font-bold text-gray-900 mb-1">
								{apt.name}
							</h4>
							<div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
								<MapPin className="w-3 h-3" />
								<span>{apt.location}</span>
							</div>

							<p className="text-sm text-gray-600 mb-3 line-clamp-2">
								{apt.desc}
							</p>

							{/* Amenities */}
							<div className="flex flex-wrap gap-1 mb-3">
								{apt.amenities.slice(0, 2).map((amenity, idx) => (
									<span
										key={idx}
										className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700"
									>
										{amenity}
									</span>
								))}
								{apt.amenities.length > 2 && (
									<span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
										+{apt.amenities.length - 2} more
									</span>
								)}
							</div>

							{/* Price and Reviews */}
							<div className="flex justify-between items-center mb-3">
								<div>
									<span className="text-lg font-bold text-amber-600">
										{formatCurrency(apt.price)}{" "}
									</span>
								</div>
								<div className="text-xs text-gray-500">
									{apt.reviews} reviews
								</div>
							</div>

							{/* Book Button */}
							<Link href={`property/${apt.id}`}>
								<button className="!cursor-pointer w-full py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium">
									View
								</button>
							</Link>
						</div>
					</motion.div>
				))}
			</div>

			{/* Category Filters + Image Grid */}
			{selectedApartment && (
				<AnimatePresence>
					<motion.div
						key="category-grid"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 10 }}
						transition={{ duration: 0.3 }}
					>
						{/* Category Filters */}
						<div className="flex items-center gap-3 overflow-x-auto pb-4 mb-8 scrollbar-hide">
							{categories.map((category) => (
								<button
									key={category}
									className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
										activeCategory === category
											? "bg-amber-500 text-white"
											: "bg-gray-100 text-gray-700 hover:bg-gray-200"
									}`}
									onClick={() => setActiveCategory(category)}
								>
									{category}
								</button>
							))}
						</div>

						{/* Image Grid */}
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{propertyImages
								.filter(
									(img) =>
										activeCategory === "all" || img.category === activeCategory
								)
								.map((img, idx) => (
									<motion.div
										key={img.id}
										className="relative aspect-square rounded-xl overflow-hidden cursor-pointer"
										whileHover={{ scale: 1.02 }}
										onClick={() => setSelectedImageIndex(idx)}
									>
										<div
											className="w-full h-full bg-center bg-cover"
											style={{ backgroundImage: `url(${img.src})` }}
										>
											<div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
											<div className="absolute bottom-4 left-4 right-4">
												<span className="text-white text-sm font-medium">
													{img.alt}
												</span>
											</div>
										</div>

										<div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
											<button className="p-2 bg-white/80 backdrop-blur-sm rounded-full">
												<Maximize2 className="w-5 h-5 text-gray-700" />
											</button>
										</div>
									</motion.div>
								))}
						</div>
					</motion.div>
				</AnimatePresence>
			)}

			{/* Fullscreen Modal */}
			{selectedApartment !== null && selectedImageIndex !== null && (
				<AnimatePresence>
					<motion.div
						className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setSelectedImageIndex(null)}
					>
						<button
							className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white"
							onClick={() => setSelectedImageIndex(null)}
						>
							<X className="w-6 h-6" />
						</button>

						<motion.div
							className="relative max-w-5xl max-h-[80vh] w-full"
							onClick={(e) => e.stopPropagation()}
						>
							<div
								className="w-full h-[80vh] rounded-lg bg-center bg-contain bg-no-repeat"
								style={{
									backgroundImage: `url(${apartment!.images[selectedImageIndex]})`,
									backgroundColor: "#1a1a1a",
								}}
							/>

							{/* Navigation */}
							<div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4">
								<button
									className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white"
									onClick={(e) => {
										e.stopPropagation();
										setSelectedImageIndex(
											(selectedImageIndex! - 1 + apartment!.images.length) %
												apartment!.images.length
										);
									}}
								>
									<ChevronLeft className="w-6 h-6" />
								</button>
								<button
									className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white"
									onClick={(e) => {
										e.stopPropagation();
										setSelectedImageIndex(
											(selectedImageIndex! + 1) % apartment!.images.length
										);
									}}
								>
									<ChevronRight className="w-6 h-6" />
								</button>
							</div>
						</motion.div>
					</motion.div>
				</AnimatePresence>
			)}

			<style jsx global>{`
				.scrollbar-hide::-webkit-scrollbar {
					display: none;
				}
				.scrollbar-hide {
					-ms-overflow-style: none;
					scrollbar-width: none;
				}
			`}</style>
		</section>
	);
};

export default PropertyImageShowcase;
