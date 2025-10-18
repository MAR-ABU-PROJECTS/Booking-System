"use client";
import React from "react";
import { motion } from "framer-motion";
// import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BookingCardType } from "@lib/type";
import { formatCurrency } from "@lib/utils";
// import Image from "next/image";
import BookingStatus from '@components/BookingStatus';
import PaymentStatus from '@components/PaymentStatus';
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";



const BookingCard = ({
	checkInDate,
	checkOutDate,
	status,
	paymentStatus,
	bookingCode,
	createdAt,
	adults,
	children,
	infants,
	property,
	total,
	serviceFee
	
}: BookingCardType) => {
	dayjs.extend(advancedFormat);
	// const [currentImageIndex, setCurrentImageIndex] = useState(0);

	const formattedCheckin = dayjs(checkInDate).format("Do, MMM YYYY");
	const formattedCheckOut = dayjs(checkOutDate).format("Do, MMM YYYY");
	const formattedDateBooked = dayjs(createdAt).format("Do, MMM YYYY");

	const formattedPrice = formatCurrency(total);

	const totalGuests =  adults + children + infants

	// const nextImage = (e: React.MouseEvent) => {
	// 	e.stopPropagation();
	// 	setCurrentImageIndex((prev) => (prev + 1) % (images.length || 1));
	// };

	// const prevImage = (e: React.MouseEvent) => {
	// 	e.stopPropagation();
	// 	setCurrentImageIndex((prev) =>
	// 		prev === 0 ? images.length - 1 : prev - 1
	// 	);
	// };

	return (
		<motion.div
			className="group cursor-pointer"
			whileHover={{ y: -4 }}
			transition={{ duration: 0.2 }}
		>
			{/* Image Carousel */}
			<div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 hidden">
				{/* <div className="w-full h-full transition-all duration-500 ease-in-out relative">
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
				</div> */}

				{/* Navigation Arrows */}
				{/* {images.length > 1 && (
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
				)} */}
			</div>

			{/* Content */}
			<div className="space-y-1.5 text-[17px] mt-4 p-4 bg-gray-100 rounded-xl">
				{/* Booking Dates & Guests separated */}
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Name:</p>
					<p className="text-sm text-gray-700">{property.name}</p>
				</div>
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Location:</p>
					<p className="text-sm text-gray-700">{property.state}</p>
				</div>
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Type:</p>
					<p className="text-sm text-gray-700">{property.type}</p>
				</div>
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Booking Code:</p>
					<p className="text-sm text-gray-700">{bookingCode}</p>
				</div>
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Date Booked:</p>
					<p className="text-sm text-gray-700">{formattedDateBooked}</p>
				</div>
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Check-in Date:</p>
					<p className="text-sm text-gray-700">{formattedCheckin}</p>
				</div>
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Check-Out Date:</p>
					<p className="text-sm text-gray-700">{formattedCheckOut}</p>
				</div>
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Guests:</p>
					<p className="text-sm text-gray-700">{totalGuests}</p>
				</div>
				<div className="flex justify-between font-[600]">
					<p className="text-sm text-gray-700">Caution Fee:</p>
					<p className="text-sm text-gray-700">{formatCurrency(serviceFee)}</p>
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
