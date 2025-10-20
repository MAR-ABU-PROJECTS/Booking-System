"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarMinus2, Filter, X } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@components/ui/select";
import { BookingCardType, BookingStatus, PaymentStatus } from "@lib/type";
import BookingCard from "@components/BookingCard";
import { DateRange } from "react-day-picker";
import dayjs from "dayjs";
import { QueryStateHandler } from "./QueryStateHandler";
import { BookingCardSkeleton } from "./BookingCardSkeleton";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

const BookingHistoryList = () => {
	const [uiDateRange, setUiDateRange] = useState<DateRange | undefined>(
		undefined
	);

	type BookingHistoryFilter = {
		dateFrom?: string;
		dateTo?: string;
		paymentStatus?: PaymentStatus;
		bookingStatus?: BookingStatus;
	};
	const [page, setPage] = useState(1);
	const [filter, setFilter] = useState<BookingHistoryFilter>({});

	const getHistory = useQuery({
		queryKey: ["booking-history", { ...filter, page }],
		queryFn: async () => {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const params: Record<string, any> = {
					page,
					limit: 10,
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
			<div className="mt-7 grid grid-cols-1 gap-6">
				{Array.from({ length: 6 }).map((_, i) => (
					<BookingCardSkeleton key={i} />
				))}
			</div>
		);
	};

	return (
		<div className="mt-[150px] lg:mt-[130px] px-4 mx-auto max-w-7xl mb-12">
			<div className="mb-8">
				<h1 className="text-2xl sm:text-3xl font-bold text-foreground">
					Booking History
				</h1>
				<p className="mt-2 text-muted-foreground">
					View and manage all your bookings
				</p>
			</div>

			<Card className="border-0 bg-muted/30">
				<CardContent className="pt-6 pb-3">
					<div className="mb-4 flex items-center gap-2">
						<Filter className="h-4 w-4 text-muted-foreground" />
						<h3 className="font-semibold">Filters</h3>
					</div>

					<div className="flex flex-wrap gap-4 justify-between items-center">
						{/* Date Filter */}
						<div className="space-y-2">
							<label className="text-[14px] font-medium text-muted-foreground">
								Date
							</label>
							<Popover open={open} onOpenChange={setOpen}>
								<PopoverTrigger asChild>
									<button
										className="bg-background rounded-md w-full min-w-[150px] justify-between text-[14px] font-normal border-1 flex text-muted-foreground px-2 py-1.5 outline-none"
										disabled={getHistory.isPending}
									>
										{uiDateRange?.from &&
										uiDateRange?.to ? (
											<p>
												<span className="text-black">
													{dayjs(
														uiDateRange.from
													).format(
														"MMM D, YYYY"
													)}{" "}
													-{" "}
													{dayjs(
														uiDateRange.to
													).format("MMM D, YYYY")}
												</span>
											</p>
										) : (
											<p>Select Date</p>
										)}
										<CalendarMinus2 className="size-5" />
									</button>
								</PopoverTrigger>
								<PopoverContent
									className="w-auto overflow-hidden p-0"
									align="start"
								>
									<Calendar
										mode="range"
										numberOfMonths={1}
										captionLayout="dropdown"
										selected={uiDateRange}
										onSelect={handleDateChange}
									/>
								</PopoverContent>
							</Popover>
						</div>

						{/* Booking Status Filter */}
						<div className="space-y-2">
							<label className="text-[14px] font-medium text-muted-foreground">
								Booking Status
							</label>
							<Select
								value={filter.bookingStatus ?? ""}
								onValueChange={(value) =>
									handleBookingStatusChange(
										value as BookingStatus
									)
								}
								disabled={getHistory.isPending}
							>
								<SelectTrigger className="bg-background">
									<SelectValue placeholder="Select Booking Status" />
								</SelectTrigger>
								<SelectContent>
									{bookingStatusOptions.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Payment Status Filter */}
						<div className="space-y-2">
							<label className="text-[14px] font-medium text-muted-foreground">
								Payment Status
							</label>

							<Select
								value={filter.paymentStatus ?? ""}
								onValueChange={(value) =>
									handlePaymentStatusChange(
										value as PaymentStatus
									)
								}
								disabled={getHistory.isPending}
							>
								<SelectTrigger className="bg-background">
									<SelectValue placeholder="Payment Status" />
								</SelectTrigger>

								<SelectContent>
									{paymentStatusOptions.map((option) => (
										<SelectItem
											key={option.value}
											value={option.value}
										>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="justify-end flex">
							<Button
								variant="destructive"
								size="sm"
								onClick={resetFilters}
								className="px-3"
							>
								<X className="mr-2 h-4 w-4" />
								Reset Filters
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<QueryStateHandler
				query={getHistory}
				emptyMessage="No Booking Found"
				getItems={(res) => res.data}
				loadingComponent={<Loader />}
				render={(res) => {
					const data = res.data as BookingCardType[];
					const meta = res.meta as {
						total: number;
						page: number;
						limit: number;
						totalPages: number;
					};

					return (
						<div>
							<div className="mt-8 grid grid-cols-1 gap-8">
								{data.map((booking, i: number) => (
									<BookingCard key={i} {...booking} />
								))}
							</div>

							{meta && meta.totalPages > 1 && (
								<div className="flex justify-center mt-5 gap-4 items-center">
									<Button
										variant="default"
										size="lg"
										disabled={meta.page === 1}
										onClick={() =>
											setPage((prev) =>
												Math.max(prev - 1, 1)
											)
										}
									>
										Previous
									</Button>

									<span className="text-sm font-medium text-muted-foreground">
										Page {meta.page} of {meta.totalPages}
									</span>

									<Button
										variant="default"
										size="lg"
										disabled={meta.page === meta.totalPages}
										onClick={() =>
											setPage((prev) => prev + 1)
										}
									>
										Next
									</Button>
								</div>
							)}
						</div>
					);
				}}
			/>

			{getHistory.data?.meta && getHistory.data?.meta?.totalPages > 1 && (
				<div className="flex justify-center mt-5 gap-4 items-center">
					<Button
						variant="default"
						size="lg"
						disabled={getHistory.data?.meta?.page === 1}
						onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
					>
						Previous
					</Button>

					<span className="text-sm font-medium text-muted-foreground">
						Page {getHistory.data?.meta?.page} of{" "}
						{getHistory.data?.meta?.totalPages}
					</span>

					<Button
						variant="default"
						size="lg"
						disabled={
							getHistory.data?.meta?.page ===
							getHistory.data?.meta?.totalPages
						}
						onClick={() => setPage((prev) => prev + 1)}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	);
};

export default BookingHistoryList;
