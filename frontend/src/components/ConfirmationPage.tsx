"use client";
import { toast } from "react-toastify";
import ConFirmationNavbar from "@components/ConFirmationNavbar";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { QueryStateHandler } from "./QueryStateHandler";
import { BookingCardType } from "@lib/type";
import ConfirmationMeta from "./ConfirmationMeta";
import { useReactToPrint } from "react-to-print";

const ConfirmationPage = ({ bookingId }: { bookingId: string }) => {
	
	const getBooking = useQuery({
		queryKey: ["booking-details", bookingId],
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
		retry: true,
	});

	useEffect(() => {
		toast("🎉 Welcome to your MAR ABU confirmation!", {
			position: "top-right",
			autoClose: 5000,
			hideProgressBar: false,
			closeOnClick: false,
			pauseOnHover: true,
			draggable: true,
			progress: undefined,
			theme: "colored",
			style: {
				background: "#1ab96f",
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


	const contentRef = useRef<HTMLDivElement | null>(null)

	const print = useReactToPrint({ contentRef });
	return (
		<>
			<div className="flex flex-col bg-[#F1F1F1] gap-[20px] min-h-svh">
				<ConFirmationNavbar
					propertyId={getBooking.data?.data?.propertyId as string}
					printFn={print}
					queryResolved={getBooking.isSuccess}
				/>
				<QueryStateHandler
					query={getBooking}
					emptyMessage="Booking not Found"
					getItems={(res) => res.data}
					loadingComponent={<p>loading</p>}
					render={(res) => {
						const data = res.data as BookingCardType;
						return (
							<div>
								<ConfirmationMeta data={data} ref={contentRef} />
							</div>
						);
					}}
				/>
			</div>
		</>
	);
};

export default ConfirmationPage;
