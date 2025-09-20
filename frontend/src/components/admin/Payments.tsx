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
import { DataTableSkeleton } from "@components/ui/data-table-skeleton";
import { QueryStateHandler } from "@components/QueryStateHandler";
import { paymentStatusColors } from "@components/PaymentStatus";
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

	const [open, setOpen] = useState(false);

	const [selectedReceipt, setSelectedReceipt] = useState({
		receiptUrl: "",
		paymentId: "",
	});
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
			cell: ({ row }) => {
				const status = row.original.status;
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
						<Button
							onClick={() => {
								setSelectedReceipt({
									receiptUrl: payment.receiptUrl as string,
									paymentId: payment.id,
								});
								setOpen(true);
							}}
						>
							View Receipt
						</Button>
					
					</div>
				);
			},
		},
	];

	return (
		<div>
			<QueryStateHandler
				query={getPayments}
				emptyMessage="No payment found"
				getItems={(res) => res.data}
				loadingComponent={
					<DataTableSkeleton
						columnCount={6}
						cellWidths={[
							"20rem",
							"10rem",
							"10rem",
							"10rem",
							"10rem",
							"10rem",
						]}
					/>
				}
				render={(res) => {
					const data = res.data ?? [];

					return (
						<DataTable
							columns={columns}
							data={data}
							pagination={pagination}
							setPagination={setPagination}
						/>
					);
				}}
			/>

			<ReceiptModal
				open={open}
				onClose={() => setOpen(false)}
				receiptUrl={selectedReceipt.receiptUrl}
				paymentId={selectedReceipt.paymentId}
			/>
		</div>
	);
};

export default Payments;
