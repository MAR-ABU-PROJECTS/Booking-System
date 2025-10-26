"use client";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import CompleteBookingStep from "./bookingComponents/CompletebookingStep";
import { QueryStateHandler } from "./QueryStateHandler";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import { SummaryData } from "@lib/type";
import BookingSummary from "./bookingComponents/BookingSummary";
import Navbar from "@components/Navigation";
import BookingPayment from "./BookingPayment";

const CompleteBooking = ({
	bookingId,
	apartmentId,
}: {
	bookingId: string;
	apartmentId: string;
}) => {
	const [step, setStep] = useState(0);
	const [summaryData, setSummaryData] = useState<SummaryData>({
		id: "",
		bookingCode: "",
		checkInDate: "",
		checkOutDate: "",
		nights: 0,
		adults: 0,
		children: 0,
		infants: 0,
		status: undefined,
		paymentStatus: undefined,
		baseAmount: 0,
		cautionFee: 0,
		discount: 0,
		total: 0,
		paidAmount: 0,
		currency: "NGN",
		guestName: "",
		guestEmail: "",
		guestPhone: "",
		guestAddress: null,
		specialRequests: null,
		arrivalTime: null,
		source: null,
		cancellationReason: null,
		cancelledAt: null,
		cancelledBy: null,
		refundAmount: null,
		adminNotes: null,
		approvedBy: null,
		approvedAt: null,
		completedAt: null,
		paidAt: null,
		createdAt: "",
		updatedAt: "",
		customerId: "",
		propertyId: "",
		property: {
			name: "",
			host: {
				firstName: "",
				lastName: "",
				email: "",
			},
		},
		customer: {
			firstName: "",
			lastName: "",
			email: "",
		},
	});
	const [paymentId, setPaymentId] = useState("");
	const [instructions, setInstructions] = useState<string[]>();

	const getBooking = useQuery({
		queryKey: ["booking-id", { bookingId }],
		queryFn: async () => {
			try {
				 

				const response = await apiService.get(`/bookings/${bookingId}`);
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
					closeOnClick: true,
					progress: undefined,
				});
				throw new Error(errorMessage);
			}
		},
	});

	useEffect(() => {
		if (getBooking.data?.success) {
			setSummaryData(getBooking.data?.data);
			handleNext();
		}
	}, [getBooking.data]);

	const handleNext = () => {
		if (step == 3) return;
		setStep((step) => step + 1);
	};

	const handleBack = () => {
		if (step == 1) return;
		setStep((step) => step - 1);
	};
	return (
		<div>
			<Navbar />
			<div className="bg-[#F1F1F1] min-h-screen">
				<div className="mx-auto max-w-4xl px-[20px] lg:px-12 pt-[100px]">
					<CompleteBookingStep activeStep={step} />
				</div>

				<div className="mx-auto max-w-4xl px-[20px] lg:px-12 pt-[20px] pb-[30px]">
					<div className="mb-4">
						{step > 1 && (
							<button
								type="button"
								className="mb-4 cursor-pointer text-amber-600 flex items-center active:scale-95 hover:scale-95 transition-all"
								onClick={handleBack}
							>
								{" "}
								<ChevronLeft /> Back
							</button>
						)}
					</div>
					<QueryStateHandler
						query={getBooking}
						emptyMessage={`Booking Not Found`}
						getItems={(res) => res.data}
						loadingComponent={
							<div className="flex justify-center">
								<Loader2 className="animate-spin text-amber-400" />
							</div>
						}
						render={() => {
							return (
								<div>
									{step === 1 && (
										<BookingSummary
											propertyId={apartmentId}
											summaryData={summaryData}
											handleNext={handleNext}
											setPaymentId={setPaymentId}
											setInstructions={setInstructions}
										/>
									)}

									{step === 2 && (
										<BookingPayment
											summaryData={summaryData}
											paymentId={paymentId}
											instructions={instructions}
										/>
									)}
								</div>
							);
						}}
					/>
				</div>
			</div>
		</div>
	);
};

export default CompleteBooking;
