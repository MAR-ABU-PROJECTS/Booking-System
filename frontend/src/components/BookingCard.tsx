"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { BookingCardType } from "@lib/type";
import { formatCurrency } from "@lib/utils";
// import Image from "next/image";
import BookingStatus from "@components/BookingStatus";
import PaymentStatus from "@components/PaymentStatus";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { Button } from "./ui/button";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { toast } from "react-toastify";
import { Loader2, MapPin, Users } from "lucide-react";
import { isAxiosError } from "axios";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./ui/card";
import Link from "next/link";

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
	cautionFee,
	baseAmount,
	id,
	cleaningFee,
}: BookingCardType) => {
	dayjs.extend(advancedFormat);
	// const [currentImageIndex, setCurrentImageIndex] = useState(0);

	const formattedCheckin = dayjs(checkInDate).format("Do, MMM YYYY");
	const formattedCheckOut = dayjs(checkOutDate).format("Do, MMM YYYY");
	const formattedDateBooked = dayjs(createdAt).format("Do, MMM YYYY");

	const formattedPrice = formatCurrency(total);

	const totalGuests = adults + children + infants;

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

	const [confirm, setConfirm] = useState(false);
	const queryClient = useQueryClient();
	const [reason, setReason] = useState("");

	const mutation = useMutation({
		mutationFn: async () => {
			return await apiService.post(`/bookings/${id}/cancel`, {
				reason,
			});
		},
		onSuccess: (data) => {
			if (data.success) {
				setConfirm(false);
				setReason("");
				toast.success(data.message as string, {
					closeOnClick: true,
				});
				queryClient.invalidateQueries({
					queryKey: ["booking-history"],
					exact: false,
				});
			} else {
				toast.error(data.message as string, {
					closeOnClick: true,
				});
			}
		},
		onError(error) {
			if (isAxiosError(error)) {
				const message = error.response?.data?.message;
				toast.error(message as string, {
					closeOnClick: true,
				});
			} else
				toast.error(error.message as string, {
					closeOnClick: true,
				});
		},
	});

	useEffect(() => {
		if (!confirm) {
			setReason("");
		}
	}, [reason, confirm]);

	return (
		<div>
			<motion.div
				className="group cursor-pointer hidden"
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
						<p className="text-sm text-gray-700">
							{property.state}
						</p>
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
						<p className="text-sm text-gray-700">
							{formattedDateBooked}
						</p>
					</div>
					<div className="flex justify-between font-[600]">
						<p className="text-sm text-gray-700">Check-in Date:</p>
						<p className="text-sm text-gray-700">
							{formattedCheckin}
						</p>
					</div>
					<div className="flex justify-between font-[600]">
						<p className="text-sm text-gray-700">Check-Out Date:</p>
						<p className="text-sm text-gray-700">
							{formattedCheckOut}
						</p>
					</div>
					<div className="flex justify-between font-[600]">
						<p className="text-sm text-gray-700">Guests:</p>
						<p className="text-sm text-gray-700">{totalGuests}</p>
					</div>
					<div className="flex justify-between font-[600]">
						<p className="text-sm text-gray-700">Price / Night:</p>
						<p className="text-sm text-gray-700">
							{formatCurrency(baseAmount)}
						</p>
					</div>
					<div className="flex justify-between font-[600]">
						<p className="text-sm text-gray-700">Caution Fee:</p>
						<p className="text-sm text-gray-700">
							{formatCurrency(cautionFee)}
						</p>
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

					{status.toLowerCase() != "cancelled" && (
						<Button
							variant={"destructive"}
							onClick={() => setConfirm(true)}
							className="w-full mt-2"
						>
							Cancel Booking
						</Button>
					)}
				</div>
			</motion.div>

			<Card className="overflow-hidden transition-shadow hover:shadow-md">
				<CardHeader className="border-b pb-4">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<CardTitle className="text-lg">
								{property.name}
							</CardTitle>
							<CardDescription className="mt-1 flex items-center gap-1">
								<MapPin className="h-4 w-4" />
								{property.state} • {property.type}
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="">
					{/* Booking Code */}
					<div className="mb-6 rounded-lg bg-muted p-3">
						<p className="text-sm font-medium text-muted-foreground">
							Booking Code
						</p>
						<p className="font-mono text-sm font-semibold">
							{bookingCode}
						</p>
					</div>

					{/* Details Grid */}
					<div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
						{/* Dates */}
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Check-in
							</p>
							<p className="mt-1 font-semibold">
								{formattedCheckin}
							</p>
							<p className="text-sm text-muted-foreground">
								to {formattedCheckOut}
							</p>
						</div>

						{/* Guests */}
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Guests
							</p>
							<div className="mt-1 flex items-center gap-2">
								<Users className="h-4 w-4 text-muted-foreground" />
								<p className="font-semibold">{totalGuests}</p>
							</div>
						</div>

						{/* Price */}
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Price/Night
							</p>
							<p className="mt-1 font-semibold">
								{formatCurrency(baseAmount)}
							</p>
						</div>

						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Caution Fee
							</p>
							<p className="mt-1 font-semibold">
								{formatCurrency(cautionFee)}
							</p>
						</div>

						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Cleaning Fee
							</p>
							<p className="mt-1 font-semibold">
								{formatCurrency(cleaningFee)}
							</p>
						</div>

						{/* Total */}
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Total
							</p>
							<p className="mt-1 font-semibold text-primary">
								{formattedPrice}
							</p>
						</div>
					</div>

					{/* Status Badges */}
					<div className="mt-6 flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium text-muted-foreground">
								Booking:
							</span>
							<BookingStatus status={status} />
						</div>
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium text-muted-foreground">
								Payment:
							</span>
							<PaymentStatus status={paymentStatus} />
						</div>
					</div>

					{/* Action Buttons */}

					{status.toLowerCase() != "cancelled" ? (
						<div className="mt-6 flex gap-2">
							<Button
								variant={"destructive"}
								onClick={() => setConfirm(true)}
								size="sm"
								className="flex-1 h-[40px] text-[14px]"
							>
								Cancel Booking
							</Button>
							<Button
								size="sm"
								className="flex-1 h-[40px] text-[14px]"
								asChild
							>
								<Link href={`/booking?id=${property.id}`}>
									Book Again
								</Link>
							</Button>
						</div>
					) : (
						<Button
							size="sm"
							className="flex-1 h-[40px] text-[14px] mt-6 w-full"
							asChild
						>
							<Link href={`/booking?id=${property.id}`} className="w-full">
								Book Again
							</Link>
						</Button>
					)}
					{/* <div className="mt-6 flex gap-2">
						<Button
							variant={"destructive"}
							onClick={() => setConfirm(true)}
							size="sm"
							className="flex-1 h-[40px] text-sm"
						>
							Cancel Booking
						</Button>
						<Button
							size="sm"
							className="flex-1 h-[40px] text-sm"
							asChild
						>
							<Link href={`/booking?id=${property.id}`}>
								Book Again
							</Link>
						</Button>
					</div> */}
				</CardContent>
			</Card>

			<AlertDialog open={confirm} onOpenChange={setConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Booking</AlertDialogTitle>
						<AlertDialogDescription className="text-[15px]">
							Are you sure you want to cancel this booking?
						</AlertDialogDescription>

						<div className="mt-3">
							<textarea
								className="w-full border-[1px] h-[100px] p-1.5"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="If yes please enter your reason for cancelling"
							/>
						</div>

						<div className="flex gap-4 mt-2">
							<Button
								onClick={() => {
									mutation.mutate();
								}}
								className="flex-1 h-[45px] text-[15px]"
								type="button"
								disabled={mutation.isPending}
								variant="default"
							>
								{mutation.isPending && (
									<Loader2 className="animate-spin text-white mr-1.5" />
								)}
								Continue
							</Button>
							<Button
								type="button"
								className="flex-1 h-[45px] text-[15px]"
								onClick={() => {
									setConfirm(false);
								}}
								variant="destructive"
								disabled={mutation.isPending}
							>
								Cancel
							</Button>
						</div>
					</AlertDialogHeader>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default BookingCard;
