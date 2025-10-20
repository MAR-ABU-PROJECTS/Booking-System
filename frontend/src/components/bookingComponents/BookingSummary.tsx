"use client";
import { Dispatch, SetStateAction, useState } from "react";
import { MapPin, ShieldHalf, Loader2 } from "lucide-react";
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
import { Checkbox } from "@components/ui/checkbox";
import { Label } from "@components/ui/label";
import { Button } from "@components/ui/button";
import BookingStatus from "@components/BookingStatus";
import { PaymentMethod } from "@lib/type";
// import { resumePayStackPayment } from "@lib/payments/paystack";
// import { initializeFlutterwavePayment } from "@lib/payments/flutterwave";
import PaymentStatus from "@components/PaymentStatus";
import { CreditCard } from "lucide-react";
import PaymentMethodSelector from "@components/PaymentMethodSelector";
import { getPropertyImages } from "@lib/api";

const BookingSummary = ({
	summaryData,
	propertyId,
	handleNext,
	setPaymentId,
	setInstructions
}: {
	summaryData: SummaryData;
	propertyId: string;
	handleNext: () => void;
	setPaymentId: Dispatch<SetStateAction<string>>;
	setInstructions: Dispatch<SetStateAction<string[] | undefined>>
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
	const cleaningFee = summaryData.cleaningFee;
	const cautionFee = summaryData.cautionFee;
	const taxes = summaryData.taxes;
	const totalAmount = subtotal + cleaningFee + cautionFee + taxes;
	const location = booking.location;
	const images = getPropertyImages(propertyId);





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

	const [checked, setChecked] = useState(false);
	const [paymentMethod, setPaymentMethod] = useState<
		PaymentMethod | undefined
	>();

	const [loading, setLoading] = useState(false);

	const handlePayment = async () => {
		if (!paymentMethod || !checked || !totalAmount || loading) return;
		try {
			setLoading(true);

			const res = await apiService.post("/payment/initialize", {
				bookingId: summaryData.id,
				paymentMethod: paymentMethod,
				currency: "NGN",
			});

			if (paymentMethod === PaymentMethod.BANK_TRANSFER) {
				const Id = res?.data?.payment.id;
				setInstructions(res?.data?.paymentData?.instructions)
				setPaymentId(Id);
				handleNext();
			}

			// if (res?.success && paymentMethod === PaymentMethod.PAYSTACK) {
			// 	resumePayStackPayment({
			// 		accessCode: res.data.paymentData.data.access_code as string,
			// 		onSuccess: async (trx) => {
			// 			if (
			// 				trx?.status === "success" &&
			// 				trx?.message === "Approved"
			// 			) {
			// 				toast.success(trx?.message);
			// 				router.push(
			// 					`/confirmation?bookingId=${summaryData.id}`
			// 				);
			// 			} else {
			// 				toast.error(
			// 					trx?.message ?? "Payment verification failed"
			// 				);
			// 			}
			// 		},
			// 		onCancel: () => {
			// 			toast.error("Payment cancelled");
			// 		},
			// 		onError: (err) => {
			// 			toast.error(`Paystack error: ${err?.message}`);
			// 		},
			// 	});
			// }
			// if (res?.success && paymentMethod === PaymentMethod.FLUTTERWAVE) {
			// 	initializeFlutterwavePayment({
			// 		tx_ref: res?.data?.payment?.reference,
			// 		amount: res?.data?.payment?.amount,
			// 		customer: {
			// 			name: summaryData.guestName,
			// 			email: summaryData.guestEmail,
			// 		},
			// 		currency: res?.data?.payment?.currency,
			// 		onSuccess: (resp) => {
			// 			if (
			// 				(resp.status === "successful" || resp.status === "completed") &&
			// 				(resp.charge_response_code === "00" || resp.charge_response_code === "0")
			// 			) {
			// 				toast.success("Payment successful");

			// 				router.push(
			// 					`/confirmation?bookingId=${summaryData.id}&ref=${resp.tx_ref}`
			// 				);
			// 			} else {
			// 				toast.error("Payment could not be verified. Please contact support.");
			// 			}
			// 		},
			// 		onClose: () => {
			// 			console.log("Payment modal closed");
			// 		},
			// 	});
			// }
		} catch {
		} finally {
			setLoading(false);
		}
	};

	const paymentOptions = [
		{ label: "BANK TRANSFER", value: PaymentMethod.BANK_TRANSFER },
		// { label: "PAYSTACK", value: PaymentMethod.PAYSTACK }
		// { label: "FLUTTERWAVE", value: PaymentMethod.FLUTTERWAVE },
	];

	return (
		<div className="order-[-1] md:order-2 flex flex-col w-full py-[40px] px-[20px] bg-white rounded-xl border-2 border-[#f7d5b0] static self-start">
			<div className="flex flex-col gap-[5px]">
				<div className="w-full rounded-xl max-h-[600px] h-full">
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
						<p className="text-[14px] text-[#667085]">
							Check-in Date:
						</p>
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
						<p className="text-[14px] text-[#667085]">
							Check-Out Date:
						</p>
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
						<p className="text-[14px] text-[#667085]">Nights:</p>
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
							{summaryData.adults > 1 ? "s" : ""},{" "}
							{summaryData.children} Child
							{summaryData.children > 1 ? "ren" : ""},{" "}
							{summaryData.infants} Infant
							{summaryData.infants > 1 ? "s" : ""}
						</p>
					</div>
				</div>
				<hr className="h-px my-[10px] bg-[#fae7d1] border-0" />
				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">
							Rate Per Nights:
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
						<p className="text-[14px] font-[500]">
							{summaryData.bookingCode}
						</p>
					</div>
				</div>
				<hr className="h-px my-[10px] bg-[#fae7d1] border-0" />

				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">
							Booking Status:
						</p>
					</div>
					<div>
						<BookingStatus status={summaryData?.status} />
					</div>
				</div>
				<hr className="h-px my-[10px] bg-[#fae7d1] border-0" />

				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">
							Payment Status:
						</p>
					</div>
					<div>
						<PaymentStatus status={summaryData?.paymentStatus} />
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
							Caution Fee (5%):
						</p>
					</div>
					<div>
						<p className="text-[14px] font-[500]">
							{" "}
							{formatCurrency(cautionFee)}
						</p>
					</div>
				</div>

				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">
							Cleaning Fee:
						</p>
					</div>
					<div>
						<p className="text-[14px] font-[500]">
							{" "}
							{formatCurrency(cleaningFee)}
						</p>
					</div>
				</div>

				<div className="flex justify-between items-center">
					<div>
						<p className="text-[14px] text-[#667085]">Taxes:</p>
					</div>
					<div>
						<p className="text-[14px] font-[500]">
							{" "}
							{formatCurrency(taxes)}
						</p>
					</div>
				</div>

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

			<div className="flex-col w-full gap-[20px]">
				<div className="flex gap-[5px] items-center">
					<div className="p-[3px] bg-[#FEF9F3] rounded-md">
						<CreditCard size={"18px"} />
					</div>
					<p className="text-[18px] font-semibold">
						Payment Information
					</p>
				</div>

				<PaymentMethodSelector
					options={paymentOptions}
					value={paymentMethod as PaymentMethod}
					onChange={(val) => setPaymentMethod(val as PaymentMethod)}
				/>
			</div>

			<div className="items-center gap-[10px] flex mt-3">
				<Checkbox
					id="terms"
					checked={checked}
					onCheckedChange={(val) => setChecked(!!val)}
					className="bg-white border-1 border-black inline-flex !cursor-pointer"
				/>
				<Label
					htmlFor="terms"
					className="text-[12px] md:text-[14px] text-start"
				>
					<div>
						I agree to the{" "}
						<span className="text-[#F4A857] cursor-pointer hover:underline">
							Terms and Conditions
						</span>{" "}
						and{" "}
						<span className="text-[#F4A857] cursor-pointer hover:underline">
							Privacy Policy
						</span>{" "}
						of MAR ABU PROJECTS SERVICES LLC{" "}
						<span className="text-red-600">*</span>
					</div>
				</Label>
			</div>

			<div className="flex mt-3 flex-col bg-[#e7f8f0] border-2 border-[#a6e4c8] py-[15px] px-[10px] rounded-xl gap-[10px]">
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

			<div className="flex flex-col mt-5">
				<Button
					className="!cursor-pointer hover:bg-[#F4A857] py-[22px] text-[16px] items-center transition-transform duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
					type="button"
					disabled={
						!paymentMethod || !checked || !totalAmount || loading
					}
					onClick={handlePayment}
				>
					{loading ? (
						<Loader2
							className="animate-spin size-5"
							strokeWidth={3}
						/>
					) : null}
					Pay
				</Button>
			</div>
		</div>
	);
};

export default BookingSummary;
