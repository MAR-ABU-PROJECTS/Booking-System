"use client";
import React, { useEffect, useState } from "react";
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
}: BookingCardType) => {
	dayjs.extend(advancedFormat);

	const formattedCheckin = dayjs(checkInDate).format("Do, MMM YYYY");
	const formattedCheckOut = dayjs(checkOutDate).format("Do, MMM YYYY");
	const formattedDateBooked = dayjs(createdAt).format("Do, MMM YYYY");
	const formattedPrice = formatCurrency(total);
	const totalGuests = adults + children + infants;
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

					<div className="flex justify-between items-center mb-6 rounded-lg bg-muted p-3">
						<div className="">
							<p className="text-sm font-medium text-muted-foreground">
								Date Booked
							</p>
							<p className="text-[14px] font-semibold">
								{formattedDateBooked}
							</p>
						</div>
						<div className="">
							<p className="text-sm font-medium text-muted-foreground">
								Booking Code
							</p>
							<p className="text-[14px] font-semibold">
								{bookingCode}
							</p>
						</div>
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

					{status.toLowerCase() !== "cancelled" ? (
						// Booking is NOT cancelled
						<div className="mt-6 flex gap-2 w-full">
							<Button
								variant="destructive"
								onClick={() => setConfirm(true)}
								size="sm"
								className="flex-1 h-[40px] text-[15px]"
							>
								Cancel Booking
							</Button>

							{paymentStatus.toLowerCase() === "pending" ? (
								<Button
									size="sm"
									className="flex-1 h-[40px] text-[14px] bg-green-400 hover:bg-green-400"
									asChild
								>
									<Link
										href={`/complete-booking?id=${id}&apartmentId=${property.id}`}
										className="text-[15px] w-full"
									>
										Complete Booking
									</Link>
								</Button>
							) : (
								<Button
									size="sm"
									className="flex-1 h-[40px] text-[14px]"
									asChild
								>
									<Link
										href={`/booking?id=${property.id}`}
										className="text-[15px] w-full"
									>
										Book Again
									</Link>
								</Button>
							)}
						</div>
					) : (
						// Booking IS cancelled
						<div className="mt-6 flex gap-2 w-full">
							<Button
								size="sm"
								className="flex-1 h-[40px] text-[14px]"
								asChild
							>
								<Link
									href={`/booking?id=${property.id}`}
									className="text-[15px] w-full"
								>
									Book Again
								</Link>
							</Button>
						</div>
					)}
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
