"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BookingCardType } from "@lib/type";
import { formatCurrency } from "@lib/utils";
import Image from "next/image";
import BookingStatus from '@components/BookingStatus';
import PaymentStatus from '@components/PaymentStatus';

const BookingCard = ({
	checkIn,
	checkOut,
	guests,
	totalAmount,
	images,
	status,
	paymentStatus,
}: BookingCardType) => {
	const [currentImageIndex, setCurrentImageIndex] = useState(0);

	const formattedPrice = formatCurrency(totalAmount);

	const nextImage = (e: React.MouseEvent) => {
		e.stopPropagation();
		setCurrentImageIndex((prev) => (prev + 1) % (images.length || 1));
	};

	const prevImage = (e: React.MouseEvent) => {
		e.stopPropagation();
		setCurrentImageIndex((prev) =>
			prev === 0 ? images.length - 1 : prev - 1
		);
	};

	return (
		<motion.div
			className="group cursor-pointer"
			whileHover={{ y: -4 }}
			transition={{ duration: 0.2 }}
		>
			{/* Image Carousel */}
			<div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3">
				<div className="w-full h-full transition-all duration-500 ease-in-out relative">
					{images.length > 0 ? (
						<Image
							src={images[currentImageIndex]}
							alt={`Booking image ${currentImageIndex + 1}`}
							className="w-full h-full object-cover rounded-md"
							fill
						/>
					) : (
						<span className="text-gray-500 flex items-center justify-center h-full w-full">
							No images available
						</span>
					)}
				</div>

				{/* Navigation Arrows */}
				{images.length > 1 && (
					<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between px-2">
						<motion.button
							className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md !cursor-pointer"
							onClick={prevImage}
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
						>
							<ChevronLeft className="w-4 h-4 text-gray-700" />
						</motion.button>

						<motion.button
							className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md !cursor-pointer"
							onClick={nextImage}
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
						>
							<ChevronRight className="w-4 h-4 text-gray-700" />
						</motion.button>
					</div>
				)}
			</div>

			{/* Content */}
			<div className="space-y-1.5 text-[17px] mt-4">
				{/* Booking Dates & Guests separated */}
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Check-in:</p>
					<p className="text-sm text-gray-700">{checkIn}</p>
				</div>
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Check-Out:</p>
					<p className="text-sm text-gray-700">{checkOut}</p>
				</div>
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Guests:</p>
					<p className="text-sm text-gray-700">{guests}</p>
				</div>
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Total:</p>
					<span className="font-semibold text-gray-900">
						{formattedPrice}
					</span>
				</div>


				

      	<div className="flex justify-between font-[600] !mb-2">
					<p className="text-sm text-gray-700">Booking Status:</p>
					<span>
            <BookingStatus status={status} />
          </span>
				</div>

        <div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Payment Status:</p>
					<span>
            <PaymentStatus status={paymentStatus} />
          </span>
				</div>

			
			</div>
		</motion.div>
	);
};

export default BookingCard;
