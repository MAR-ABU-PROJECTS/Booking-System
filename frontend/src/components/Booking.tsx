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
import type {SummaryData} from "@lib/type"
import { useDispatch } from "react-redux";
import { resetBooking } from "@lib/features/bookingSlice";



const Booking = ({ propertyId }: { propertyId: string }) => {
	const booking = useSelector((state: RootState) => state.booking);
	const user = useSelector((state: RootState) => state.auth);
	const dispatch = useDispatch();
	
	const [summaryData, setSummaryData] = useState<SummaryData>({
		checkInDate: "",
		checkOutDate: "",
		nights: 0,
		adults: 0,
		children: 0,
		infants: 0,
		baseAmount: 0,
		serviceFee: 0,
		total: 0,
		property:{
			name:""
		}
	});

	const form = useForm<z.infer<typeof createBookingSchema>>({
		resolver: zodResolver(createBookingSchema),
		defaultValues: {
			propertyId:propertyId,
			checkIn: new Date(),
			checkOut: dayjs().add(1, "day").toDate(),
			guestEmail: "",
			address: "",
			arrivalTime: "",
			agree: false,
			specialRequests: "",
			children: 0,
			adults: 1,
			infants: 0,
			guestPhone: "",
			idType: "",
			paymentMethod: "",
			emergencyContact: "",
			guestName:"",
		},
		mode: "onChange",
	});

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
				guestName:  formData.guestName,
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
				setSummaryData(res.data)
				dispatch(resetBooking())
			} else {
				const message = res?.message as string;
				toast.success(message, {
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
				console.error("Non-Axios Error:", error);
			}
		},
	});

	const onSubmit: SubmitHandler<z.infer<typeof createBookingSchema>> = (values) => {
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

	// const handleAdultIncrement = () => {
	// 	const newAdultCount = adultCount + 1;
	// 	setAdultCount(newAdultCount);
	// 	toast(`Updated Adult: ${newAdultCount}`, {
	// 		position: "top-right",
	// 		autoClose: 3000,
	// 		hideProgressBar: false,
	// 		closeOnClick: false,
	// 		pauseOnHover: true,
	// 		draggable: true,
	// 		progress: undefined,
	// 		theme: "colored",
	// 		style: {
	// 			background: "#12B76A",
	// 			color: "#ffffff",
	// 			fontFamily: "Sora, sans-serif",
	// 			fontSize: "16px",
	// 			fontWeight: "600",
	// 			borderRadius: "8px",
	// 			textTransform: "capitalize",
	// 			boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
	// 			padding: "16px",
	// 		},
	// 	});
	// };

	// const handleAdultDecrement = () => {
	// 	const newAdultDecrement = Math.max(0, adultCount - 1);
	// 	setAdultCount(newAdultDecrement);
	// 	toast(`Updated Adult: ${newAdultDecrement}`, {
	// 		position: "top-right",
	// 		autoClose: 3000,
	// 		hideProgressBar: false,
	// 		closeOnClick: false,
	// 		pauseOnHover: true,
	// 		draggable: true,
	// 		progress: undefined,
	// 		theme: "colored",
	// 		style: {
	// 			background: "#12B76A",
	// 			color: "#ffffff",
	// 			fontFamily: "Sora, sans-serif",
	// 			fontSize: "16px",
	// 			fontWeight: "600",
	// 			borderRadius: "8px",
	// 			textTransform: "capitalize",
	// 			boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
	// 			padding: "16px",
	// 		},
	// 	});
	// };

	// const handleChildIncrement = () => {
	// 	const newChildCount = childCount + 1;
	// 	setChildCount(newChildCount);
	// 	toast(`Updated children: ${newChildCount}`, {
	// 		position: "top-right",
	// 		autoClose: 3000,
	// 		hideProgressBar: false,
	// 		closeOnClick: false,
	// 		pauseOnHover: true,
	// 		draggable: true,
	// 		progress: undefined,
	// 		theme: "colored",
	// 		style: {
	// 			background: "#12B76A",
	// 			color: "#ffffff",
	// 			fontFamily: "Sora, sans-serif",
	// 			fontSize: "16px",
	// 			fontWeight: "600",
	// 			borderRadius: "8px",
	// 			textTransform: "capitalize",
	// 			boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
	// 			padding: "16px",
	// 		},
	// 	});
	// };

	// const handleChildDecrement = () => {
	// 	const newChildDecrement = Math.max(0, childCount - 1);
	// 	setChildCount(newChildDecrement);
	// 	toast(`Updated children: ${newChildDecrement}`, {
	// 		position: "top-right",
	// 		autoClose: 3000,
	// 		hideProgressBar: false,
	// 		closeOnClick: false,
	// 		pauseOnHover: true,
	// 		draggable: true,
	// 		progress: undefined,
	// 		theme: "colored",
	// 		style: {
	// 			background: "#12B76A",
	// 			color: "#ffffff",
	// 			fontFamily: "Sora, sans-serif",
	// 			fontSize: "16px",
	// 			fontWeight: "600",
	// 			borderRadius: "8px",
	// 			textTransform: "capitalize",
	// 			boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
	// 			padding: "16px",
	// 		},
	// 	});
	// };

	return (
		<>
			{/* <ToastContainer /> */}
			<Navbar />
			<FormProvider {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="grid md:grid-cols-[60%_35%] justify-between gap-[20px] lg:gap-[40px] px-[20px] lg:px-12 pt-[100px] py-[30px] bg-[#F1F1F1]"
				>
					<BookingForm isSubmitting={mutation.isPending} />
					<BookingSummary  propertyId={propertyId}  summaryData={summaryData} />
				</form>
			</FormProvider>
		</>
	);
};

export default Booking;
