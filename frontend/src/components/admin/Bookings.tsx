"use client";
import { QueryStateHandler } from "@components/QueryStateHandler";
import { apiService } from "@lib/apiService";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import { keepPreviousData } from "@tanstack/react-query";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { useState } from "react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Booking, BookingStatus, PaymentStatus } from "@lib/type";
import { DataTable } from "./DataTable";
import { paymentStatusColors } from "@components/PaymentStatus";
import { statusColors } from "@components/BookingStatus";
dayjs.extend(advancedFormat);

const Bookings = () => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const getBookings = useQuery({
		queryKey: ["admin-bookings", { pagination }],
		queryFn: async () => {
			try {
				const response = await apiService.get(
					`/admin/bookings?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`
				);
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
		// placeholderData: keepPreviousData,
	});

	const columns: ColumnDef<Booking>[] = [
		{
			accessorKey: "bookingCode",
			header: "Booking Code",
		},
		{
			accessorKey: "guestName",
			header: "Guest Details",
			cell: ({ row }) => {
				const booking = row.original;
				const guestName = booking.guestName;
				const guestEmail = booking.guestEmail;
				const guestPhone = booking.guestPhone;
				return (
					<div>
						<p>{guestName}</p>
						<p className="text-gray-500">{guestEmail}</p>
						<p className="text-gray-500">{guestPhone}</p>
					</div>
				);
			},
		},
		// {
		// 	accessorKey: "amount",
		// 	header: "Amount",
		// 	cell: ({ row }) => {
		// 		const payment = row.original;
		// 		const amount = payment.amount;
		// 		return <div>{formatCurrency(amount)}</div>;
		// 	},
		// },

		{
			accessorKey: "status",
			header: "Booking Status",
			cell: ({ row }) => {
				const payment = row.original;
				const status = payment.status;
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

		// {
		// 	accessorKey: "paidAt",
		// 	header: "Paid At",
		// 	cell: ({ row }) => {
		// 		const payment = row.original;
		// 		const date = payment.paidAt;
		// 		const formattedDate = dayjs(date).format("Do MMM YYYY");

		// 		return <div>{formattedDate}</div>;
		// 	},
		// },
		{
			accessorKey: "checkInDate",
			header: "CheckIn Date",
			cell: ({ row }) => {
				const payment = row.original;
				const date = payment.checkInDate;
				const formattedDate = dayjs(date).format("Do MMM YYYY");

				return <div>{formattedDate}</div>;
			},
		},
		{
			accessorKey: "checkOutDate",
			header: "CheckOut Date",
			cell: ({ row }) => {
				const payment = row.original;
				const date = payment.checkOutDate;
				const formattedDate = dayjs(date).format("Do MMM YYYY");

				return <div>{formattedDate}</div>;
			},
		},
		{
			accessorKey: "paymentStatus",
			header: "Payment Status",
			cell: ({ row }) => {
				const payment = row.original;
				const status = payment.paymentStatus;
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
		// {
		// 	id: "actions",
		// 	header: "View Reciept",
		// 	cell: ({ row }) => {
		// 		const payment = row.original;

		// 		if (!payment.receiptUrl) return <span>No Receipt</span>;

		// 		return (
		// 			<div>
		// 				<Button onClick={() => setOpen(true)}>
		// 					View Receipt
		// 				</Button>
		// 				<ReceiptModal
		// 					open={open}
		// 					onClose={() => setOpen(false)}
		// 					receiptUrl={payment.receiptUrl}
		// 					paymentId={payment.id}
		// 				/>
		// 			</div>
		// 		);
		// 	},
		// },
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
			<QueryStateHandler
				query={getBookings}
				emptyMessage="No profile found"
				getItems={(res) => res.data?.bookings}
				loadingComponent={"Loading..."}
				render={(res) => {
					const data = res.data?.bookings as Booking[];
					const pages = res.data?.pagination?.pages as number;

					return (
						<div>
							<DataTable
								columns={columns}
								data={data ?? []}
								pagination={pagination}
								setPagination={setPagination}
								pageCount={pages}
							/>
						</div>
					);
				}}
			/>
		</div>
	);
};

export default Bookings;
