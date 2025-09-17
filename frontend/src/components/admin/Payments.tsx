"use client";
import { apiService } from "@lib/apiService";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import { DataTable } from "./DataTable";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { PaymentType } from "@lib/type";
import { Button } from "@components/ui/button";
import { useState } from "react";
import { ReceiptModal } from "./ReceiptModal";
import { formatCurrency } from "@lib/utils";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
dayjs.extend(advancedFormat);

const Payments = () => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const getPayments = useQuery({
		queryKey: ["pending-verifications"],
		queryFn: async () => {
			try {
				const response = await apiService.get(
					"/payment/pending-verification"
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
		retry: true,
	});

	console.log(getPayments.data);

	const [open, setOpen] = useState(false);

	const columns: ColumnDef<PaymentType>[] = [
		{
			accessorKey: "bookingId",
			header: "Booking Id",
		},
		{
			accessorKey: "amount",
			header: "Amount",
			cell: ({ row }) => {
				const payment = row.original;
				const amount = payment.amount;
				return <div>{formatCurrency(amount)}</div>;
			},
		},
		{
			accessorKey: "method",
			header: "Payment Method",
			cell: ({ row }) => {
				const payment = row.original;
				const method = payment.method;
				return <div>{method.replace("_", " ")}</div>;
			},
		},
		{
			accessorKey: "status",
			header: "Status",
		},
		{
			accessorKey: "paidAt",
			header: "Paid At",
			cell: ({ row }) => {
				const payment = row.original;
				const date = payment.paidAt;
				const formattedDate = dayjs(date).format("Do MMM YYYY");

				return <div>{formattedDate}</div>;
			},
		},
		{
			id: "actions",
			header: "View Reciept",
			cell: ({ row }) => {
				const payment = row.original;

				if (!payment.receiptUrl) return <span>No Receipt</span>;

				return (
					<div>
						<Button onClick={() => setOpen(true)}>
							View Receipt
						</Button>
						<ReceiptModal
							open={open}
							onClose={() => setOpen(false)}
							receiptUrl={payment.receiptUrl}
							paymentId={payment.id}
						/>
					</div>
				);
			},
		},
	];

	return (
		<div>
			<div>
				<DataTable
					columns={columns}
					data={getPayments.data?.data ?? []}
					pagination={pagination}
					setPagination={setPagination}
				/>
			</div>
		</div>
	);
};

export default Payments;
