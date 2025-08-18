"use client";
import { MapPin, ShieldHalf } from "lucide-react";
import dayjs from "dayjs";
import { RootState } from "@lib/features/store";
import { useSelector } from "react-redux";
import { formatCurrency } from "@lib/utils";
import PropertyCarousel from "@components/PropertyCarousel";
import type { SummaryData } from "@lib/type";
import { apiService } from "@lib/apiService";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { isAxiosError } from "axios";

const BookingSummary = ({
	summaryData,
	propertyId,
}: {
	summaryData: SummaryData;
	propertyId: string;
}) => {
	const booking = useSelector((state: RootState) => state.booking);
	const nights = summaryData.nights;

	const nightsLabel = nights === 1 ? "1 Night" : `${nights} Nights`;
	const formattedCheckIn = summaryData.checkInDate
		? dayjs(summaryData.checkInDate).format("ddd, MMM D")
		: "";
	const formattedCheckOut = summaryData.checkOutDate
		? dayjs(summaryData.checkOutDate).format("ddd, MMM D")
		: "";

	const ratePerNight = summaryData.baseAmount;
	const subtotal = ratePerNight * nights;
	const serviceFee = summaryData.serviceFee;
	const totalAmount = subtotal + serviceFee;
	const location = booking.location;
	// const name = booking.name;

	const images = [
		"/apartment-images/IMG_5673.JPG",
		"/apartment-images/IMG_5674.JPG",
		"/apartment-images/IMG_5675.JPG",
		"/apartment-images/IMG_5676.JPG",
		"/apartment-images/IMG_5677.JPG",
		"/apartment-images/IMG_5678.JPG",
	];

	const getProperty = useQuery({
		queryKey: ["property", propertyId],
		queryFn: async () => {
			try {
				const response = await apiService.get(
					`/properties/${propertyId}`
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
		retry: false,
	});

	const statusColors: Record<string, string> = {
		PENDING: "bg-yellow-100 text-yellow-800",
		APPROVED: "bg-blue-100 text-blue-800",
		CONFIRMED: "bg-green-100 text-green-800",
		CANCELLED: "bg-gray-100 text-gray-800",
		COMPLETED: "bg-green-200 text-green-900",
		EXPIRED: "bg-red-100 text-red-800",
		REJECTED: "bg-red-200 text-red-900",
		CHECKED_IN: "bg-indigo-100 text-indigo-800",
		CHECKED_OUT: "bg-purple-100 text-purple-800",
		REFUNDED: "bg-orange-100 text-orange-800",
	};

	function BookingStatusBadge({
		status,
	}: {
		status?: keyof typeof statusColors;
	}) {
		if (!status) return null;

		return (
			<span
				className={`px-3 py-1 rounded-full text-sm font-medium ${
					statusColors[status] ?? "bg-gray-100 text-gray-800"
				}`}
			>
				{status.replace("_", " ")}
			</span>
		);
	}

	return (
		<div className="order-[-1] md:order-2 flex flex-col w-full py-[40px] px-[20px] bg-white rounded-xl border-2 border-[#f7d5b0] static self-start">
			<div className="flex flex-col gap-[5px]">
				<div className="w-full rounded-xl -mt-1">
					<PropertyCarousel images={images} />
				</div>
				<div className="flex justify-center items-center">
					<p className="text-[18px] font-semibold">
						{getProperty?.data?.data?.name}
					</p>
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
							{summaryData.adults} Adult
							{summaryData.adults !== 1 && "s"},{" "}
							{summaryData.children} Child
							{summaryData.children !== 1 && "ren"},{" "}
							{summaryData.infants} Infant
							{summaryData.infants > 1 ? "s" : ""}
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
				<hr className="h-px my-[10px] bg-[#fae7d1] border-0" />
				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">
							Booking Code:
						</p>
					</div>
					<div>
						<p className="text-[14px] font-[500]"></p>
					</div>
				</div>
				<hr className="h-px my-[10px] bg-[#fae7d1] border-0" />

				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">Status:</p>
					</div>
					<div>
						<BookingStatusBadge status={"APPROVED"} />
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
