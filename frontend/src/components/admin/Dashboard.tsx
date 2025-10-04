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
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { formatCurrency } from "@lib/utils";
import Link from "next/link";
import {
	AlertCircle,
	Building2,
	Calendar,
	DollarSign,
	Users,
} from "lucide-react";
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
			accessorKey: "createdAt",
			header: "Created At",
			cell: ({ row }) => {
				const date = row.original.createdAt;
				const formattedDate = dayjs(date).format("Do MMM YYYY");
				return (
					<span
						className={`py-1 rounded-full text-sm font-medium`}
					>
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
							<div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-4 mb-6">
								<Card className="bg-card border-border">
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-base font-medium text-muted-foreground">
											Total Revenue
										</CardTitle>
										<DollarSign className="h-4 w-4 text-primary" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold text-foreground">
											{formatCurrency(
												data?.revenue?.total || 0
											)}
										</div>
										<p className="text-sm text-muted-foreground">
											{/* +12.5% from last month */}
										</p>
									</CardContent>
								</Card>

								<Card className="bg-card border-border">
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-base font-medium text-muted-foreground">
											Total Bookings
										</CardTitle>
										<Calendar className="h-4 w-4 text-chart-2" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold text-foreground">
											{data?.bookings?.total}
										</div>
										<p className="text-sm text-muted-foreground">
											{data?.bookings?.pending} pending
											approval
										</p>
									</CardContent>
								</Card>

								<Card className="bg-card border-border">
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-base font-medium text-muted-foreground">
											Active Properties
										</CardTitle>
										<Building2 className="h-4 w-4 text-chart-3" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold text-foreground">
											{data?.properties?.byStatus?.active}
										</div>
										<p className="text-sm text-muted-foreground">
											of {data?.properties?.total} total
											properties
										</p>
									</CardContent>
								</Card>

								<Card className="bg-card border-border">
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
										<CardTitle className="text-base font-medium text-muted-foreground">
											Total Users
										</CardTitle>
										<Users className="h-4 w-4 text-chart-4" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold text-foreground">
											{data?.users?.total}
										</div>
										<p className="text-sm text-muted-foreground">
											{data?.users?.byRole?.admin} admins,{" "}
											{data?.users?.byRole?.customer}{" "}
											customers
										</p>
									</CardContent>
								</Card>
							</div>

							<div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
								<Card className="bg-card border-border">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-foreground text-base">
											<AlertCircle className="h-5 w-5 text-yellow-400" />
											Pending Actions
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-3">
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">
													Bookings awaiting approval
												</span>
												<Badge variant="secondary">
													{data.bookings.pending}
												</Badge>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">
													Reviews pending response
												</span>
												<Badge variant="secondary">
													{data.pendingReviews}
												</Badge>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">
													Properties needing
													maintenance
												</span>
												<Badge variant="secondary">
													3
												</Badge>
											</div>
										</div>
									</CardContent>
								</Card>

								<Card className="bg-card border-border">
									<CardHeader>
										<CardTitle className="text-foreground text-base">
											Quick Stats
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-3">
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">
													Approved Bookings
												</span>
												<span className="font-medium text-foreground">
													{data?.bookings?.approved}
												</span>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">
													Cancelled Bookings
												</span>
												<span className="font-medium text-foreground">
													{data?.bookings?.cancelled}
												</span>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">
													Completed Bookings
												</span>
												<span className="font-medium text-foreground">
													{data?.bookings?.completed}
												</span>
											</div>
											
										
											<div className="flex items-center justify-between">
												<span className="text-sm text-muted-foreground">
													Service Fee Revenue
												</span>
												<span className="font-medium text-foreground">
													{formatCurrency(
														data.revenue.serviceFees
													)}
												</span>
											</div>
										</div>
									</CardContent>
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
