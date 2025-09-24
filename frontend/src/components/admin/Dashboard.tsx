"use client";
import { statusColors } from "@components/BookingStatus";
import { paymentStatusColors } from "@components/PaymentStatus";
import { QueryStateHandler } from "@components/QueryStateHandler";
import { DataTableSkeleton } from "@components/ui/data-table-skeleton";
import { apiService } from "@lib/apiService";
import { Booking } from "@lib/type";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { DataTable } from "./DataTable";
import advancedFormat from "dayjs/plugin/advancedFormat";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@components/ui/card";
import { formatCurrency } from "@lib/utils";
import Link from "next/link";
dayjs.extend(advancedFormat);

const Dashboard = () => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const getDashboard = useQuery({
		queryKey: ["dashboard"],
		queryFn: async () => {
			const response = await apiService.get(`/admin/dashboard`);
			return response;
		},
	});

	useEffect(() => {
		if (getDashboard.error) {
			const err = getDashboard.error;
			if (isAxiosError(err)) {
				toast.error(
					err.response?.data?.message || "An error occurred",
					{ progress: undefined }
				);
			} else {
				toast.error("Unexpected error", { progress: undefined });
			}
		}
	}, [getDashboard.error]);

	console.log(getDashboard.data);

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
							{booking.property.type} {booking.property.city}
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
				const serviceFee = data.serviceFee;
				const taxes = data.taxes;
				const totalAmount = subtotal + cleaningFee + serviceFee + taxes;
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
	];

	return (
		<div>
			<QueryStateHandler
				query={getDashboard}
				emptyMessage="No Dasboard Data"
				getItems={(res) => res.data}
				loadingComponent={
					<DataTableSkeleton
						columnCount={4}
						cellWidths={["15rem", "30rem", "20em", "10rem"]}
					/>
				}
				render={(res) => {
					const data = res.data ?? [];

					return (
						<div>
							<div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-6">
								<Card>
									<CardHeader>
										<CardTitle>Approved Bookings</CardTitle>
									</CardHeader>

									<CardFooter>
										<p className="font-medium">
											{data?.bookings?.approved}
										</p>
									</CardFooter>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Pending Bookings</CardTitle>
									</CardHeader>

									<CardFooter>
										<p className="font-medium">
											{data?.bookings?.pending}
										</p>
									</CardFooter>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>
											Completed Bookings
										</CardTitle>
									</CardHeader>

									<CardFooter>
										<p className="font-medium">
											{data?.bookings?.completed}
										</p>
									</CardFooter>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>
											Cancelled Bookings
										</CardTitle>
									</CardHeader>

									<CardFooter>
										<p className="font-medium">
											{data?.bookings?.cancelled}
										</p>
									</CardFooter>
								</Card>

								<Card>
									<CardHeader>
										<CardTitle>Total Bookings</CardTitle>
									</CardHeader>

									<CardFooter>
										<p className="font-medium">
											{data?.bookings?.total}
										</p>
									</CardFooter>
								</Card>
								<Card>
									<CardHeader>
										<CardTitle>Revenue</CardTitle>
									</CardHeader>

									<CardFooter>
										<p className="font-medium">
											{formatCurrency(
												data?.booking?.revenue || 0
											)}
										</p>
									</CardFooter>
								</Card>
							</div>

							<div>
								<div className="flex justify-between items-center">
									<h2 className="font-medium text-[18px] mb-2">
										Recent Bookings
									</h2>
									<Link
										href={"/bookings"}
										className="text-underline text-amber-500"
									>
										View all
									</Link>
								</div>
								<div className="mt-1.5">
									<DataTable
										columns={columns}
										data={data.recentBookings as Booking[]}
										pagination={pagination}
										setPagination={setPagination}
										showPagination={false}
									/>
								</div>
							</div>
						</div>
					);
				}}
			/>
		</div>
	);
};

export default Dashboard;
