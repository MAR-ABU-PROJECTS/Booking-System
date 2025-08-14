"use client";
import { MapPin, ShieldHalf } from "lucide-react";
import { bookingDetailsSchema } from "@lib/schemas";
import { useFormContext } from "react-hook-form";
import { z } from "zod";
import dayjs from "dayjs";
import { RootState } from "@lib/features/store";
import { useSelector } from "react-redux";
import { formatCurrency } from "@lib/utils";
import PropertyCarousel from "@components/PropertyCarousel";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import { useSearchParams } from "next/navigation";

const BookingSummary = () => {
	const searchParams = useSearchParams();
	const propertyId = searchParams.get("id");

	const booking = useSelector((state: RootState) => state.booking);
	const { watch } = useFormContext<z.infer<typeof bookingDetailsSchema>>();
	const adultCount = watch("adults");
	const childCount = watch("children");
	const infantCount = watch("infants");
	const checkInDate = watch("checkIn");
	const checkOutDate = watch("checkOut");
	const nights =
		checkInDate && checkOutDate
			? dayjs(checkOutDate).diff(dayjs(checkInDate), "day")
			: 0;
	const nightsLabel = nights === 1 ? "1 Night" : `${nights} Nights`;
	const formattedCheckIn = checkInDate
		? dayjs(checkInDate).format("ddd, MMM D")
		: "";
	const formattedCheckOut = checkOutDate
		? dayjs(checkOutDate).format("ddd, MMM D")
		: "";

	const ratePerNight = booking.price;
	const subtotal = ratePerNight * nights;
	const serviceFee = subtotal * 0.05;
	const totalAmount = subtotal + serviceFee;
	const location = booking.location;
	const name = booking.name;

	const images = [
		"/apartment-images/IMG_5673.JPG",
		"/apartment-images/IMG_5674.JPG",
		"/apartment-images/IMG_5675.JPG",
		"/apartment-images/IMG_5676.JPG",
		"/apartment-images/IMG_5677.JPG",
		"/apartment-images/IMG_5678.JPG",
	];


	const checkIn = checkInDate
		? dayjs(checkInDate).format("YYYY-MM-DD")
		: "";
		const checkOut = checkOutDate
		? dayjs(checkOutDate).format("YYYY-MM-DD")
		: "";	
	const params = {
		propertyId: propertyId,
		adults: adultCount,
		children: childCount,
		infants: infantCount,
		checkIn: checkIn,
		checkOut: checkOut,
	};

	const getSummary = useQuery({
		queryKey: ["bookingSummary", params],
		queryFn: async () => {
			try {
				const queryString = new URLSearchParams(
					Object.entries(params).reduce(
						(acc, [key, value]) => {
							if (
								value !== undefined &&
								value !== null &&
								value !== ""
							) {
								acc[key] = String(value);
							}
							return acc;
						},
						{} as Record<string, string>
					)
				).toString();

				const response = await apiService.get(
					`/bookings/pricing?${queryString}`
				);
				return response;
			} catch (error) {
				let errorMessage = "An unexpected error occurred";
				if (isAxiosError(error)) {
					errorMessage = error.response
						? error.response.data.message
						: error.message;
				} else if (error instanceof Error) {
					errorMessage = error.message;
				}
				toast.error(errorMessage, {
					closeOnClick: false,
					progress: undefined,
				});

				throw new Error(errorMessage);
			}
 		},
		enabled: Boolean(propertyId),
		retry:false
	});


	return (
		<div className="flex flex-col w-full py-[40px] px-[20px] bg-white rounded-xl border-2 border-[#f7d5b0] static self-start">
			<div className="flex flex-col gap-[5px]">
				<div className="w-full rounded-xl -mt-1">
					<PropertyCarousel images={images} />
				</div>
				<div className="flex justify-center items-center">
					<p className="text-[18px] font-semibold">{name}</p>
				</div>
				<div className="flex justify-center items-center gap-[5px]">
					<MapPin color="red" fontSize={"10px"} />
					<p className="text-[16px] text-[#667085]">{location}</p>
				</div>
			</div>
			<hr className="h-px my-[20px] bg-[#fae7d1] border-0" />
			<div className="flex flex-col">
				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">Check-in:</p>
					</div>
					<div>
						<p className="text-[14px] font-[500]">
							{formattedCheckIn}
						</p>
					</div>
				</div>
				<hr className="h-px my-[10px] bg-[#fae7d1] border-0" />
				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">Check-Out:</p>
					</div>
					<div>
						<p className="text-[14px] font-[500]">
							{formattedCheckOut}
						</p>
					</div>
				</div>
				<hr className="h-px my-[10px] bg-[#fae7d1] border-0" />
				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">Duration:</p>
					</div>
					<div>
						<p className="text-[14px] font-[500]">{nightsLabel}</p>
					</div>
				</div>
				<hr className="h-px my-[10px] bg-[#fae7d1] border-0" />
				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">Guests:</p>
					</div>
					<div>
						<p className="text-[14px] font-[500]">
							{adultCount} Adult{adultCount !== 1 && "s"},{" "}
							{childCount} Child{childCount !== 1 && "ren"},{" "}
							{infantCount} Infant{infantCount > 0 && "s"}
						</p>
					</div>
				</div>
				<hr className="h-px my-[10px] bg-[#fae7d1] border-0" />
				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">
							Rate per night:
						</p>
					</div>
					<div>
						<p className="text-[14px] font-[500]">
							{" "}
							{formatCurrency(ratePerNight)}
						</p>
					</div>
				</div>
			</div>
			<div className="flex flex-col bg-[#fae7d1] border-2 border-[#f7d5b0] py-[15px] px-[10px] rounded-xl gap-[10px] my-[15px]">
				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">Subtotal:</p>
					</div>
					<div>
						<p className="text-[14px] font-[500]">
							{formatCurrency(subtotal)}
						</p>
					</div>
				</div>
				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">
							Service Fee (5%):
						</p>
					</div>
					<div>
						<p className="text-[14px] font-[500]">
							{" "}
							{formatCurrency(serviceFee)}
						</p>
					</div>
				</div>
				<hr className="h-px my-[10px] bg-[#F4A857] border-0" />
				<div className="flex justify-between items-center">
					<div>
						<p className="text-[16px] font-[400]">Total Amount:</p>
					</div>
					<div>
						<p className="text-[16px] text-[#F4A857] font-[600]">
							{formatCurrency(totalAmount)}
						</p>
					</div>
				</div>
			</div>
			<div className="flex flex-col bg-[#e7f8f0] border-2 border-[#a6e4c8] py-[15px] px-[10px] rounded-xl gap-[10px]">
				<div className="flex gap-[10px]">
					<div className="flex w-[40px] h-[30px] p-[10px] justify-center items-center bg-[#12b76a] rounded-full">
						<ShieldHalf color="red" />
					</div>
					<div className="flex flex-col gap-[5px]">
						<p className="text-[15px] text-[#12B76A] font-[400]">
							Secure Booking Guaranteed
						</p>
						<p className="text-[12px] text-[#667085]">
							Your personal and payment information is protected
							with bank-grade 256-bit SSL encryption and verified
							by MAR ABU security protocols.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default BookingSummary;
