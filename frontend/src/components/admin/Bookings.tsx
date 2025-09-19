"use client";

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { apiService } from "@lib/apiService";
import { Booking, BookingStatus, PaymentStatus } from "@lib/type";
import { paymentStatusColors } from "@components/PaymentStatus";
import { statusColors } from "@components/BookingStatus";
import { QueryStateHandler } from "@components/QueryStateHandler";
import { DataTable } from "./DataTable";
import useDebounce from "@hooks/use-debounce";

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
import { Input } from "@components/ui/input";

dayjs.extend(advancedFormat);

const Bookings = () => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [filter, setFilter] = useState<{
		paymentStatus?: PaymentStatus;
		bookingStatus?: BookingStatus;
	}>({
		paymentStatus: undefined,
		bookingStatus: undefined,
	});

	const [propertyID, setPropertyId] = useState("");
	const debounceValue = useDebounce(propertyID);

	const getBookings = useQuery({
		queryKey: ["admin-bookings", filter, pagination, debounceValue],
		queryFn: async () => {
			const { paymentStatus, bookingStatus } = filter;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const params: Record<string, any> = {
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
				propertyId: debounceValue,
			};

			if (paymentStatus) params.paymentStatus = paymentStatus;
			if (bookingStatus) params.status = bookingStatus;

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
				toast.error(err.response?.data?.message || "An error occurred",);
			} else {
				toast.error("Unexpected error");
			}
		}
	}, [getBookings.error]);

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
			accessorKey: "checkInDate",
			header: "CheckIn Date",
			cell: ({ row }) => {
				const date = row.original.checkInDate;
				return <div>{dayjs(date).format("Do MMM YYYY")}</div>;
			},
		},
		{
			accessorKey: "checkOutDate",
			header: "CheckOut Date",
			cell: ({ row }) => {
				const date = row.original.checkOutDate;
				return <div>{dayjs(date).format("Do MMM YYYY")}</div>;
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
	];

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

	return (
		<div>
			<div className="flex gap-5 mb-6 flex-wrap">
				<div className="flex flex-col gap-1">
					<Label>Property ID</Label>
					<Input
						placeholder="Enter Property id"
						className="h-[37px]"
						value={propertyID}
						onChange={(e) => setPropertyId(e.target.value)}
					/>
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
		</div>
	);
};

export default Bookings;
