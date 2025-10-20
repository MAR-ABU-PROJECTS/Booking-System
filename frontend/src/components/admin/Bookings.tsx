"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { apiService } from "@lib/apiService";
import {
	AdminProperty,
	Booking,
	BookingStatus,
	PaymentStatus,
} from "@lib/type";
import { paymentStatusColors } from "@components/PaymentStatus";
import { statusColors } from "@components/BookingStatus";
import { QueryStateHandler } from "@components/QueryStateHandler";
import { DataTable } from "./DataTable";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@components/ui/select";
import { Label } from "@components/ui/label";
import { DataTableSkeleton } from "@components/ui/data-table-skeleton";
import { formatCurrency } from "@lib/utils";
import { Loader2 } from "lucide-react";
import { Button } from "@components/ui/button";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@components/ui/alert-dialog";
dayjs.extend(advancedFormat);

const Bookings = () => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filter, setFilter] = useState<{
		paymentStatus?: PaymentStatus;
		bookingStatus?: BookingStatus;
		propertyID?: string;
	}>({
		paymentStatus: undefined,
		bookingStatus: undefined,
		propertyID: undefined,
	});

	const getBookings = useQuery({
		queryKey: ["admin-bookings", filter, pagination],
		queryFn: async () => {
			const { paymentStatus, bookingStatus, propertyID } = filter;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const params: Record<string, any> = {
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			};

			if (paymentStatus) params.paymentStatus = paymentStatus;
			if (bookingStatus) params.status = bookingStatus;
			if (propertyID) params.propertyId = propertyID;

			const response = await apiService.get(`/admin/bookings`, {
				params,
			});
			return response;
		},
	});

	useEffect(() => {
		if (getBookings.error) {
			const err = getBookings.error;
			if (isAxiosError(err)) {
				toast.error(err.response?.data?.message || "An error occurred");
			} else {
				toast.error("Unexpected error");
			}
		}
	}, [getBookings.error]);

	const [confirm, setConfirm] = useState(false);
	const [selectedId, setSelectedId] = useState("");
	const [reason, setReason] = useState("");

	const columns: ColumnDef<Booking>[] = [
		{
			accessorKey: "property",
			header: "Property",
			cell: ({ row }) => {
				const booking = row.original;
				return (
					<div>
						<p>{booking.property.name}</p>
						<p className="text-gray-500">
							{booking.property.type}, {booking.property.city}
						</p>
					</div>
				);
			},
		},

		{
			accessorKey: "guestName",
			header: "Guest Info",
			cell: ({ row }) => {
				const booking = row.original;
				return (
					<div>
						<p>{booking.guestName}</p>
						<p className="text-gray-500">{booking.guestEmail}</p>
						<p className="text-gray-500">{booking.guestPhone}</p>
					</div>
				);
			},
		},

		{
			id: "guestDets",
			header: "Guests",
			cell: ({ row }) => {
				const booking = row.original;
				return (
					<div>
						<p className="text-gray-500">
							{booking.adults}{" "}
							{booking.adults > 1 ? "Adults" : "Adult"}
						</p>
						{booking.children > 0 && (
							<p className="text-gray-500">
								{booking.children}{" "}
								{booking.children > 1 ? "Children" : "Child"}
							</p>
						)}
						{booking.infants > 0 && (
							<p className="text-gray-500">
								{booking.infants}{" "}
								{booking.infants > 1 ? "Infants" : "Infant"}
							</p>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "bookingCode",
			header: "Booking Code",
		},

		{
			accessorKey: "createdAt",
			header: "Created At",
			cell: ({ row }) => {
				const date = row.original.createdAt;
				const formattedDate = dayjs(date).format("Do MMM YYYY");
				return (
					<span className={`py-1 rounded-full text-sm font-medium`}>
						{formattedDate}
					</span>
				);
			},
		},
		{
			accessorKey: "status",
			header: "Booking Status",
			cell: ({ row }) => {
				const status = row.original.status;
				return (
					<span
						className={`px-3 py-1 rounded-full text-sm font-medium ${
							statusColors[status] ?? "bg-gray-100 text-gray-800"
						}`}
					>
						{status.replace("_", " ")}
					</span>
				);
			},
		},
		{
			id: "checkDate",
			header: "Check In - Out Date",
			cell: ({ row }) => {
				const checkIn = row.original.checkInDate;
				const checkOut = row.original.checkOutDate;
				return (
					<div>
						<div>
							{dayjs(checkIn).format("Do MMM YYYY")} -{" "}
							{dayjs(checkOut).format("Do MMM YYYY")}{" "}
						</div>
						<p className="text-gray-400">
							{row.original.nights}{" "}
							{row.original.nights > 1 ? "nights" : "night"}
						</p>
					</div>
				);
			},
		},

		{
			id: "Total",
			header: "Total Fee",
			cell: ({ row }) => {
				const data = row.original;
				const ratePerNight = data.baseAmount;
				const nights = data.nights;
				const subtotal = ratePerNight * nights;
				const cleaningFee = data.cleaningFee;
				const cautionFee = data.cautionFee;
				const taxes = data.taxes;
				const totalAmount = subtotal + cleaningFee + cautionFee + taxes;
				return <div>{formatCurrency(totalAmount)}</div>;
			},
		},
		{
			accessorKey: "paymentStatus",
			header: "Payment Status",
			cell: ({ row }) => {
				const status = row.original.paymentStatus;
				return (
					<span
						className={`px-3 py-1 rounded-full text-sm font-medium ${
							paymentStatusColors[status] ??
							"bg-gray-100 text-gray-800"
						}`}
					>
						{status.replace("_", " ")}
					</span>
				);
			},
		},
		{
			id: "action",
			cell: ({ row }) => {
				return (
					<Button
						variant="destructive"
						onClick={() => {
							setConfirm(true);
							setSelectedId(row.original.id);
						}}
					>
						Cancel
					</Button>
				);
			},
		},
	];

	useEffect(() => {
		if (!confirm) {
			setSelectedId("");
			setReason("");
		}

		return () => {
			setConfirm(false);
			setSelectedId("");
			setReason("");
		};
	}, [confirm, selectedId]);
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async () => {
			return await apiService.post(`/bookings/${selectedId}/cancel`, {
				reason,
			});
		},
		onSuccess: (data) => {
			if (data.success) {
				setConfirm(false);
				setReason("");
				toast.success(data.message as string, {
					closeOnClick: true,
				});
				queryClient.invalidateQueries({
					queryKey: ["admin-bookings"],
					exact: false,
				});
			} else {
				toast.error(data.message as string, {
					closeOnClick: true,
				});
			}
		},
		onError(error) {
			if (isAxiosError(error)) {
				const message = error.response?.data?.message;
				toast.error(message as string, {
					closeOnClick: true,
				});
			} else
				toast.error(error.message as string, {
					closeOnClick: true,
				});
		},
	});

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

	const getProperties = useQuery({
		queryKey: ["admin-properties"],
		queryFn: async () => {
			const response = await apiService.get(`/admin/properties`);
			return response;
		},
	});

	return (
		<div>
			<div className="flex gap-5 mb-6 flex-wrap items-center">
				<h1>Filter:</h1>
				<div className="flex flex-col gap-1">
					<Label>Property</Label>
					<Select
						onValueChange={(value) =>
							setFilter((prev) => ({
								...prev,
								propertyID: value,
							}))
						}
						disabled={
							getProperties.isPending || !getProperties.data
						}
					>
						<SelectTrigger className="w-[200px] border-2 border-[#f7d5b0]">
							<SelectValue placeholder="Filter Property" />
						</SelectTrigger>

						<SelectContent>
							<SelectGroup>
								<SelectLabel>Property</SelectLabel>

								{getProperties.isPending ? (
									<SelectItem disabled value="loading">
										<span className="text-gray-500">
											Loading...
										</span>
									</SelectItem>
								) : (
									(
										getProperties.data?.data
											?.properties as AdminProperty[]
									)?.map((p) => (
										<SelectItem key={p.id} value={p.id}>
											{p.name}
										</SelectItem>
									))
								)}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-1">
					<Label>Booking Status</Label>
					<Select
						value={filter.bookingStatus ?? ""}
						onValueChange={(value) =>
							setFilter((prev) => ({
								...prev,
								bookingStatus: value as BookingStatus,
							}))
						}
						disabled={getBookings.isPending}
					>
						<SelectTrigger className="w-[200px] border-2 border-[#f7d5b0]">
							<SelectValue placeholder="Filter Booking Status" />
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
							setFilter((prev) => ({
								...prev,
								paymentStatus: value as PaymentStatus,
							}))
						}
						disabled={getBookings.isPending}
					>
						<SelectTrigger className="w-[200px] border-2 border-[#f7d5b0]">
							<SelectValue placeholder="Filter Payment Status" />
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
			</div>

			<QueryStateHandler
				query={getBookings}
				emptyMessage="No bookings found"
				getItems={(res) => res.data?.bookings}
				loadingComponent={
					<DataTableSkeleton
						columnCount={8}
						cellWidths={[
							"20rem",
							"10rem",
							"4rem",
							"10rem",
							"10rem",
							"10rem",
							"10rem",
							"10rem",
						]}
					/>
				}
				render={(res) => {
					const data = res.data?.bookings ?? [];
					const pages = res.data?.pagination?.pages ?? 0;

					return (
						<DataTable
							columns={columns}
							data={data}
							pagination={pagination}
							setPagination={setPagination}
							pageCount={pages}
						/>
					);
				}}
			/>

			<AlertDialog open={confirm} onOpenChange={setConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel Booking</AlertDialogTitle>
						<AlertDialogDescription className="text-[15px]">
							Are you sure you want to cancel this booking?
						</AlertDialogDescription>

						<div className="mt-3">
							<textarea
								className="w-full border-[1px] h-[100px] p-1.5"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="If yes please enter your reason for cancelling"
							/>
						</div>

						<div className="flex gap-4 mt-2">
							<Button
								onClick={() => {
									mutation.mutate();
								}}
								className="flex-1 h-[45px] text-[15px]"
								type="button"
								disabled={mutation.isPending}
								variant="default"
							>
								{mutation.isPending && (
									<Loader2 className="animate-spin text-white mr-1.5" />
								)}
								Continue
							</Button>
							<Button
								type="button"
								className="flex-1 h-[45px] text-[15px]"
								onClick={() => {
									setConfirm(false);
								}}
								variant="destructive"
								disabled={mutation.isPending}
							>
								Cancel
							</Button>
						</div>
					</AlertDialogHeader>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default Bookings;
