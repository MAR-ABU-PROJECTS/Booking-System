"use client";
import { apiService } from "@lib/apiService";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { DataTable } from "./DataTable";
import { statusColors } from "@components/BookingStatus";
import { Booking, User } from "@lib/type";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { paymentStatusColors } from "@components/PaymentStatus";
import { QueryStateHandler } from "@components/QueryStateHandler";
import UserDetails from "./UserDetails";
import { formatCurrency } from "@lib/utils";
import { DataTableSkeleton } from "@components/ui/data-table-skeleton";
import ProfileSkeleton from "@components/ProfileSkeleton";
dayjs.extend(advancedFormat);

type Props = {
	id: string;
};
const SingleUser = ({ id }: Props) => {
	const router = useRouter();
	const getUser = useQuery({
		queryKey: ["user", id],
		queryFn: async () => {
			const response = await apiService.get(`/admin/users/${id}`);
			return response;
		},
	});

	useEffect(() => {
		if (getUser.error) {
			const err = getUser.error;
			if (isAxiosError(err)) {
				toast.error(
					err.response?.data?.message || "An error occurred",
					{ progress: undefined }
				);
			} else {
				toast.error("Unexpected error", { progress: undefined });
			}
		}
	}, [getUser.error]);

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
			accessorKey: "bookingCode",
			header: "Booking Code",
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

	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	return (
		<div>
			<button
				onClick={() => router.back()}
				className="outline-none mb-2.5 underline flex items-center !cursor-pointer"
			>
				<ChevronLeft />
				Back
			</button>

			<QueryStateHandler
				query={getUser}
				emptyMessage="No User found"
				getItems={(res) => res.data}
				loadingComponent={
					<div>
						<ProfileSkeleton />
						<div className="my-5"/>
						<DataTableSkeleton
							columnCount={7}
							cellWidths={[
								"20rem",
								"10rem",
								"4rem",
								"10rem",
								"10rem",
								"10rem",
								"10rem",
							]}
						/>
					</div>
				}
				render={(res) => {
					const data = res.data as User;

					return (
						<div className="flex flex-col gap-6">
							<UserDetails data={data} />
							<DataTable
								columns={columns}
								data={data.bookings}
								pagination={pagination}
								setPagination={setPagination}
							/>
						</div>
					);
				}}
			/>
		</div>
	);
};

export default SingleUser;
