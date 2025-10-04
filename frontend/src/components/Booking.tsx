"use client";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Navbar from "@components/Navigation";
import BookingForm from "@components/bookingComponents/BookingForm";
import BookingSummary from "@components/bookingComponents/BookingSummary";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBookingSchema } from "@lib/schemas";
import { z } from "zod";
import { RootState } from "@lib/features/store";
import { useSelector } from "react-redux";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { apiService } from "@lib/apiService";
import dayjs from "dayjs";
import type { SummaryData } from "@lib/type";
import BookingStep from "@components/bookingComponents/BookingStep";
import { ChevronLeft } from "lucide-react";
import BookingPayment from "./BookingPayment";

const Booking = ({ propertyId }: { propertyId: string }) => {
	const booking = useSelector((state: RootState) => state.booking);
	const user = useSelector((state: RootState) => state.auth);

	const [paymentId, setPaymentId] = useState("");

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
		cleaningFee: 0,
		serviceFee: 0,
		taxes: 0,
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

	const form = useForm<z.infer<typeof createBookingSchema>>({
		resolver: zodResolver(createBookingSchema),
		defaultValues: {
			propertyId: propertyId,
			checkIn: new Date(),
			checkOut: dayjs().add(1, "day").toDate(),
			guestEmail: "",
			agree: false,
			specialRequests: "",
			children: 0,
			adults: 1,
			infants: 0,
			guestPhone: "",
			guestName: "",
		},
		mode: "onChange",
	});
	const [step, setStep] = useState(1);

	const handleNext = () => {
		if (step == 3) return;
		setStep((step) => step + 1);
	};

	const handleBack = () => {
		if (step == 1) return;
		setStep((step) => step - 1);
	};

	const mutation = useMutation({
		mutationFn: async (formData: z.infer<typeof createBookingSchema>) => {
			const checkIn = dayjs(formData.checkIn).format("YYYY-MM-DD");
			const checkOut = dayjs(formData.checkOut).format("YYYY-MM-DD");

			const response = await apiService.post("/bookings", {
				propertyId: formData.propertyId,
				checkIn: checkIn,
				checkOut: checkOut,
				adults: formData.adults,
				children: formData.children,
				infants: formData.infants,
				guestName: formData.guestName,
				guestEmail: formData.guestEmail,
				guestPhone: formData.guestPhone,
				specialRequests: formData?.specialRequests,
			});
			return response;
		},

		onSuccess: async (res) => {
			
			if (res?.success) {
				const message = res?.message as string;
				toast.success(message, {
					closeOnClick: false,
					progress: undefined,
				});

				setSummaryData(res.data);
				handleNext();
			} else {
				const message = res?.message as string;
				toast.error(message, {
					closeOnClick: false,
					progress: undefined,
				});
			}
		},

		onError: (error) => {
			if (isAxiosError(error)) {
				const errorList = error.response?.data?.errors;
				if (Array.isArray(errorList)) {
					errorList.forEach((err) => {
						if (err.path && err.msg) {
							form.setError(err.path, {
								type: "server",
								message: err.msg,
							});
						}
					});
				} else {
					const message =
						(error.response?.data?.message as string) ||
						"Something went wrong";
					toast.error(`${message}`, {
						closeOnClick: false,
						progress: undefined,
					});
				}
			} else {
				toast.error("Unexpected error, please try again", {
					closeOnClick: false,
					progress: undefined,
				});
			}
		},
	});

	const onSubmit: SubmitHandler<z.infer<typeof createBookingSchema>> = (
		values
	) => {
		mutation.mutate(values);
	};

	useEffect(() => {
		if (booking?.checkIn) {
			form.setValue("checkIn", new Date(booking.checkIn));
		}
		if (booking?.checkOut) {
			form.setValue("checkOut", new Date(booking.checkOut));
		}
		if (booking?.adults) {
			form.setValue("adults", booking.adults);
		}
		if (booking?.children) {
			form.setValue("children", booking.children);
		}

		if (user?.user?.email) {
			form.setValue("guestEmail", user.user.email);
		}
		if (user?.user?.name) {
			form.setValue("guestName", user?.user?.name);
		}
	}, [booking, form, user]);

	useEffect(() => {
		toast("Welcome to MAR ABU luxury booking experience!", {
			position: "top-right",
			autoClose: 5000,
			hideProgressBar: false,
			closeOnClick: false,
			pauseOnHover: true,
			draggable: true,
			progress: undefined,
			theme: "colored",
			style: {
				background: "#3b82f6",
				color: "#ffffff",
				fontFamily: "Sora, sans-serif",
				fontSize: "14px",
				fontWeight: "600",
				borderRadius: "8px",
				textTransform: "capitalize",
				boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
				padding: "16px",
			},
		});
	}, []);

	const [instructions, setInstructions] = useState<string[]>();

	return (
		<>
			<Navbar />
			<FormProvider {...form}>
				<div className="bg-[#F1F1F1]">
					<div className="mx-auto max-w-5xl px-[20px] lg:px-12 pt-[100px]">
						<BookingStep activeStep={step} />
					</div>

					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="mx-auto max-w-5xl px-[20px] lg:px-12 pt-[20px] pb-[30px]"
					>
						<div className="mb-4">
							{step != 1 && (
								<button
									type="button"
									className="mb-4 cursor-pointer text-amber-500 flex items-center active:scale-95 hover:scale-95 transition-all"
									onClick={handleBack}
								>
									{" "}
									<ChevronLeft /> Back
								</button>
							)}
						</div>

						{step === 1 && (
							<BookingForm isSubmitting={mutation.isPending} />
						)}

						{step === 2 && (
							<BookingSummary
								propertyId={propertyId}
								summaryData={summaryData}
								handleNext={handleNext}
								setPaymentId={setPaymentId}
								setInstructions={setInstructions}
							/>
						)}

						{step === 3 && (
							<BookingPayment
								summaryData={summaryData}
								paymentId={paymentId}
								instructions={instructions}
							/>
						)}
					</form>
				</div>
			</FormProvider>
		</>
	);
};

export default Booking;
