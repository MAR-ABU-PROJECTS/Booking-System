"use client";
import { MapPin, ShieldHalf } from "lucide-react";
import { bookingDetailsSchema } from "../../lib/schemas";
import { useFormContext } from "react-hook-form";
import { z } from "zod";
import dayjs from "dayjs";
import { RootState } from "../../lib/features/store";
import {useSelector} from "react-redux"

const BookingSummary = () => {
  const booking = useSelector((state: RootState) => state.booking );
	const { watch } = useFormContext<z.infer<typeof bookingDetailsSchema>>();
	const adultCount = watch("adults");
	const childCount = watch("children");
	const checkInDate = watch("checkInDate");
	const checkOutDate = watch("checkOutDate");
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

	const formatCurrency = (amount: number) =>
		`₦${new Intl.NumberFormat("en-NG").format(amount)}`;

	return (
		<div className="flex flex-col w-full h-[890px] md:h-[970px] lg:h-[890px] xl:h-[870px] py-[40px] px-[20px] bg-white rounded-xl border-2 border-[#f7d5b0] static">
			<div className="flex flex-col gap-[5px]">
				<div className="flex w-full h-[200px] justify-center items-center bg-[#F4A857] rounded-xl">
					🏠
				</div>
				<div className="flex justify-center items-center">
					<p className="text-[18px] font-semibold">
						MAR Executive Suite
					</p>
				</div>
				<div className="flex justify-center items-center gap-[5px]">
					<MapPin color="red" fontSize={"10px"} />
					<p className="text-[16px] text-[#667085]">
						Ibeju-Lekki, Lagos, Nigeria
					</p>
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
							{childCount} Child{childCount !== 1 && "ren"}
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
