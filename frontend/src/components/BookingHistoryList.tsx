"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { CalendarMinus2 } from "lucide-react";
import { Label } from "@components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@components/ui/select";
import { BookingCardType, BookingStatus, PaymentStatus } from "@lib/type";
import BookingCard from "@components/BookingCard";
import { DateRange } from "react-day-picker";
import dayjs from "dayjs";
import { QueryStateHandler } from "./QueryStateHandler";
import { BookingCardSkeleton } from "./BookingCardSkeleton";

const BookingHistoryList = () => {
	const [uiDateRange, setUiDateRange] = useState<DateRange | undefined>(
		undefined
	);

	type BookingHistoryFilter = {
		dateFrom?: string;
		dateTo?: string;
		paymentStatus?: PaymentStatus;
		bookingStatus?: BookingStatus;
		page?: number;
	};
	const [filter, setFilter] = useState<BookingHistoryFilter>({});

	const getHistory = useQuery({
		queryKey: ["booking-history", filter],
		queryFn: async () => {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const params: Record<string, any> = {
					page: filter.page ?? 1,
					limit: 12,
				};

				if (filter.bookingStatus) params.status = filter.bookingStatus;
				if (filter.paymentStatus)
					params.paymentStatus = filter.paymentStatus;
				if (filter.dateFrom) params.checkInFrom = filter.dateFrom;
				if (filter.dateTo) params.checkInTo = filter.dateTo;

				const response = await apiService.get(`/bookings`, { params });
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

	const handleDateChange = (range: DateRange | undefined) => {
		setUiDateRange(range);

		if (range?.from && range?.to) {
			setFilter((prev) => ({
				...prev,
				dateFrom: dayjs(range.from).format("YYYY-MM-DD"),
				dateTo: dayjs(range.to).format("YYYY-MM-DD"),
			}));
		} else {
			setFilter((prev) => ({
				...prev,
				dateFrom: undefined,
				dateTo: undefined,
			}));
		}
	};

	const handlePaymentStatusChange = (status: PaymentStatus) => {
		setFilter((prev) => ({ ...prev, paymentStatus: status }));
	};

	const handleBookingStatusChange = (status: BookingStatus) => {
		setFilter((prev) => ({ ...prev, bookingStatus: status }));
	};

	const bookingStatusOptions = Object.values(BookingStatus).map((status) => ({
		label: status
			.replace(/_/g, " ")
			.toLowerCase()
			.replace(/\b\w/g, (c) => c.toUpperCase()),
		value: status,
	}));

	const paymentStatusOptions = Object.values(PaymentStatus).map((status) => ({
		label: status
			.replace(/_/g, " ")
			.toLowerCase()
			.replace(/\b\w/g, (c) => c.toUpperCase()),
		value: status,
	}));

	const [open, setOpen] = useState(false);

	const resetFilters = () => {
		setUiDateRange(undefined);
		setFilter({});
	};

	const Loader = () => {
		return (
			<div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3  gap-6">
				{Array.from({ length: 6 }).map((_, i) => (
					<BookingCardSkeleton key={i} />
				))}
			</div>
		);
	};

	return (
		<div className="mt-[150px] lg:mt-[130px] px-4 mx-auto max-w-7xl mb-10">
			<h2 className="text-2xl font-bold text-gray-900 mb-5">
				Booking History
			</h2>
			<div className="flex justify-between flex-wrap gap-4 mb-5 items-center">
				<h3 className="text-xl font-semibold">Filter:</h3>
				<div className="flex items-center flex-wrap gap-4">
					<div className="flex flex-col gap-1">
						<Label>Date</Label>
						<Popover open={open} onOpenChange={setOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									id="date"
									className="w-full justify-between font-normal border-[#f7d5b0] border-2 text-muted-foreground px-2 py-1.5"
									// disabled={getHistory.isPending}
								>
									{uiDateRange?.from && uiDateRange?.to ? (
										<p>
											<span className="text-black">
												{dayjs(uiDateRange.from).format(
													"MMM D, YYYY"
												)}{" "}
												-{" "}
												{dayjs(uiDateRange.to).format(
													"MMM D, YYYY"
												)}
											</span>
										</p>
									) : (
										<p>Select Date</p>
									)}
									<CalendarMinus2 />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								className="w-auto overflow-hidden p-0"
								align="start"
							>
								<Calendar
									mode="range"
									numberOfMonths={2}
									captionLayout="dropdown"
									selected={uiDateRange}
									onSelect={handleDateChange}
								/>
							</PopoverContent>
						</Popover>
					</div>

					<div className="flex flex-col gap-1">
						<Label>Booking Status</Label>
						<Select
							value={filter.bookingStatus ?? ""}
							onValueChange={(value) =>
								handleBookingStatusChange(
									value as BookingStatus
								)
							}
							// disabled={getHistory.isPending}
						>
							<SelectTrigger className="w-full border-2 border-[#f7d5b0]">
								<SelectValue placeholder="Select Booking Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Booking Status</SelectLabel>
									{bookingStatusOptions.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-1">
						<Label>Payment Status</Label>
						<Select
							value={filter.paymentStatus ?? ""}
							onValueChange={(value) =>
								handlePaymentStatusChange(
									value as PaymentStatus
								)
							}
							// disabled={getHistory.isPending}
						>
							<SelectTrigger className="w-full border-2 border-[#f7d5b0]">
								<SelectValue placeholder="Select Payment Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Payment Status</SelectLabel>
									{paymentStatusOptions.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>

					<div className="ml-auto">
						<div className="h-4" />
						<Button onClick={resetFilters}>Reset Filter</Button>
					</div>
				</div>
			</div>

			<QueryStateHandler
				query={getHistory}
				emptyMessage="No Booking Found"
				getItems={(res) => res.data}
				loadingComponent={<Loader />}
				render={(res) => {
					const data = res.data as BookingCardType[];
					
					return (
						<div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{data.map((booking, i: number) => (
								<BookingCard key={i} {...booking} />
							))}
						</div>
					);
				}}
			/>
		</div>
	);
};

export default BookingHistoryList;
