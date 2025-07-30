"use client";
import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import Navbar from "@/components/Navigation";
import BookingForm from "@/components/bookingComponents/BookingForm";
import BookingSummary from "@/components/bookingComponents/BookingSummary";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingDetailsSchema } from "../../lib/schemas";
import { z } from "zod";
import { RootState } from "../../lib/features/store";
import { useSelector } from "react-redux";

const Page = () => {
	const booking = useSelector((state: RootState) => state.booking);
	const [adultCount, setAdultCount] = useState(2);
	const [childCount, setChildCount] = useState(0);
	const [fileName, setFileName] = useState("No file chosen");

	const form = useForm<z.infer<typeof bookingDetailsSchema>>({
		resolver: zodResolver(bookingDetailsSchema),
		defaultValues: {
			checkInDate: undefined,
			checkOutDate: undefined,
			email: "",
			firstName: "",
			lastName: "",
			address: "",
			arrivalTime: "",
			agree: false,
			additionalInfo: "",
			children: 0,
			adults: 0,
			purpose: "",
			phone: "",
			idNumber: "",
			idType: "",
			paymentMethod: "",
			emergencyContact: "",
			paymentReceipt: undefined,
		},
		mode: "onChange",
	});


	useEffect(() => {
		if (booking?.checkIn) {
			form.setValue("checkInDate", new Date(booking.checkIn));
		}
		if (booking?.checkOut) {
			form.setValue("checkOutDate", new Date(booking.checkOut));
		}
		if (booking?.adults) {
			form.setValue("adults", booking.adults);
		}
		if (booking?.children) {
			form.setValue("children", booking.children);
		}
	}, [booking, form]);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		setFileName(file ? file.name : "");
	};

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

	const handleAdultIncrement = () => {
		const newAdultCount = adultCount + 1;
		setAdultCount(newAdultCount);
		toast(`Updated Adult: ${newAdultCount}`, {
			position: "top-right",
			autoClose: 3000,
			hideProgressBar: false,
			closeOnClick: false,
			pauseOnHover: true,
			draggable: true,
			progress: undefined,
			theme: "colored",
			style: {
				background: "#12B76A",
				color: "#ffffff",
				fontFamily: "Sora, sans-serif",
				fontSize: "16px",
				fontWeight: "600",
				borderRadius: "8px",
				textTransform: "capitalize",
				boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
				padding: "16px",
			},
		});
	};

	const handleAdultDecrement = () => {
		const newAdultDecrement = Math.max(0, adultCount - 1);
		setAdultCount(newAdultDecrement);
		toast(`Updated Adult: ${newAdultDecrement}`, {
			position: "top-right",
			autoClose: 3000,
			hideProgressBar: false,
			closeOnClick: false,
			pauseOnHover: true,
			draggable: true,
			progress: undefined,
			theme: "colored",
			style: {
				background: "#12B76A",
				color: "#ffffff",
				fontFamily: "Sora, sans-serif",
				fontSize: "16px",
				fontWeight: "600",
				borderRadius: "8px",
				textTransform: "capitalize",
				boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
				padding: "16px",
			},
		});
	};

	const handleChildIncrement = () => {
		const newChildCount = childCount + 1;
		setChildCount(newChildCount);
		toast(`Updated children: ${newChildCount}`, {
			position: "top-right",
			autoClose: 3000,
			hideProgressBar: false,
			closeOnClick: false,
			pauseOnHover: true,
			draggable: true,
			progress: undefined,
			theme: "colored",
			style: {
				background: "#12B76A",
				color: "#ffffff",
				fontFamily: "Sora, sans-serif",
				fontSize: "16px",
				fontWeight: "600",
				borderRadius: "8px",
				textTransform: "capitalize",
				boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
				padding: "16px",
			},
		});
	};

	const handleChildDecrement = () => {
		const newChildDecrement = Math.max(0, childCount - 1);
		setChildCount(newChildDecrement);
		toast(`Updated children: ${newChildDecrement}`, {
			position: "top-right",
			autoClose: 3000,
			hideProgressBar: false,
			closeOnClick: false,
			pauseOnHover: true,
			draggable: true,
			progress: undefined,
			theme: "colored",
			style: {
				background: "#12B76A",
				color: "#ffffff",
				fontFamily: "Sora, sans-serif",
				fontSize: "16px",
				fontWeight: "600",
				borderRadius: "8px",
				textTransform: "capitalize",
				boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
				padding: "16px",
			},
		});
	};

	const onSubmit = (data: z.infer<typeof bookingDetailsSchema>) => {
		console.log({ data });
	};

	return (
		<>
			<ToastContainer />
			<Navbar />
			<FormProvider {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="grid md:grid-cols-[60%_35%] justify-between gap-[20px] lg:gap-[40px] px-[20px] lg:px-12 pt-[100px] py-[30px] bg-[#F1F1F1]"
				>
					<BookingForm
						fileName={fileName}
						handleFileChange={handleFileChange}
					/>
					<BookingSummary />
				</form>
			</FormProvider>
			{/* <div className="grid md:grid-cols-[60%_35%] justify-between gap-[20px] lg:gap-[40px] px-[20px] lg:px-12 pt-[100px] py-[30px] bg-[#F1F1F1]">
				<BookingForm
					date={date}
					setDate={setDate}
					open={open}
					setOpen={setOpen}
					secDate={secDate}
					setSecDate={setSecDate}
					openSec={openSec}
					setOpenSec={setOpenSec}
					adultCount={adultCount}
					childCount={childCount}
					handleAdultIncrement={handleAdultIncrement}
					handleAdultDecrement={handleAdultDecrement}
					handleChildIncrement={handleChildIncrement}
					handleChildDecrement={handleChildDecrement}
					fileName={fileName}
					handleFileChange={handleFileChange}
				/>
				<BookingSummary
					adultCount={adultCount}
					childCount={childCount}
				/>
			</div> */}
		</>
	);
};

export default Page;
