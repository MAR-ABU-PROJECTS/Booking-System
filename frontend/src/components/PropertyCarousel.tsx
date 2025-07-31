"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
	images: string[];
};

const PropertyCarousel = ({ images }: Props) => {
	const [currentImageIndex, setCurrentImageIndex] = useState(0);
	const placeholderImages = [
		"bg-gradient-to-br from-gray-200 to-gray-300",
		"bg-gradient-to-br from-gray-300 to-gray-400",
		"bg-gradient-to-br from-gray-400 to-gray-500",
		"bg-gradient-to-br from-gray-200 to-gray-400",
	];

	const nextImage = (e: React.MouseEvent) => {
		e.stopPropagation();
		setCurrentImageIndex(
			(prev) => (prev + 1) % (images.length || placeholderImages.length)
		);
	};

	const prevImage = (e: React.MouseEvent) => {
		e.stopPropagation();
		setCurrentImageIndex((prev) =>
			prev === 0
				? (images.length || placeholderImages.length) - 1
				: prev - 1
		);
	};

	return (
		<div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 group">
			{/* Image */}
			<div
				className={`w-full h-full ${
					images.length ? "" : placeholderImages[currentImageIndex]
				} transition-all duration-500 ease-in-out`}
			>
				{images.length ? (
					<img
						src={images[currentImageIndex]}
						alt={`Property image ${currentImageIndex + 1}`}
						className="w-full h-full object-cover"
					/>
				) : null}
			</div>

			{/* Navigation Arrows - Only show on hover */}
			<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between px-2">
				<motion.button
					className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md !cursor-pointer"
					type="button"
					onClick={prevImage}
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
				>
					<ChevronLeft className="w-4 h-4 text-gray-700" />
				</motion.button>

				<motion.button
					type="button"
					className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md !cursor-pointer"
					onClick={nextImage}
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
				>
					<ChevronRight className="w-4 h-4 text-gray-700" />
				</motion.button>
			</div>

			{/* Image Pagination Dots */}
			<div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
				{(images.length || placeholderImages.length) > 1 &&
					Array.from({
						length: images.length || placeholderImages.length,
					}).map((_, i) => (
						<div
							key={i}
							className={`w-1.5 h-1.5 rounded-full ${
								i === currentImageIndex
									? "bg-white"
									: "bg-white/50"
							}`}
						/>
					))}
			</div>
		</div>
	);
};

export default PropertyCarousel;
