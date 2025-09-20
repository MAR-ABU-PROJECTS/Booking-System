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
					""
					// <DataTableSkeleton
					// 	columnCount={8}
					// 	cellWidths={[
					// 		"20rem",
					// 		"10rem",
					// 		"4rem",
					// 		"10rem",
					// 		"10rem",
					// 		"10rem",
					// 		"10rem",
					// 		"10rem",
					// 	]}
					// />
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
