"use client";
import { apiService } from "@lib/apiService";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import { DataTable } from "./DataTable";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { ManualPaymentSummary } from "@lib/type";
import { Button } from "@components/ui/button";
import { useState } from "react";
import { ReceiptModal } from "./ReceiptModal";
import { formatCurrency } from "@lib/utils";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { DataTableSkeleton } from "@components/ui/data-table-skeleton";
import { QueryStateHandler } from "@components/QueryStateHandler";
import { paymentStatusColors } from "@components/PaymentStatus";
import { Input } from "@components/ui/input";
import useDebounce from "@hooks/use-debounce";
import { DateRange } from "react-day-picker";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@components/ui/popover";
import { CalendarMinus2 } from "lucide-react";
import { Calendar } from "@components/ui/calendar";
dayjs.extend(advancedFormat);

const Payments = () => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [code, setCode] = useState("");
	const debouncedValue = useDebounce(code, 2000);

	const [filter, setFilter] = useState<{
		dateFrom?: string;
		dateTo?: string;
		outFrom?: string;
		outTo?: string;
	}>({
		dateFrom: undefined,
		dateTo: undefined,
		outFrom: undefined,
		outTo: undefined,
	});

	const getPayments = useQuery({
		queryKey: ["pending-verifications", { pagination, debouncedValue, ...filter }],
		queryFn: async () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const params: Record<string, any> = {
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			};
			if (debouncedValue) {
				params.bookingCode = debouncedValue;
			}
			if (filter.dateFrom) params.checkInFrom = filter.dateFrom;
			if (filter.dateTo) params.checkInTo = filter.dateTo;
			if (filter.outFrom) params.checkOutFrom = filter.outFrom;
			if (filter.outTo) params.checkOutTo = filter.outTo;
			try {
				const response = await apiService.get(
					"/payment/pending-verification",
					{ params }
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

	const [openModal, setOpenModal] = useState(false);

	const [selectedReceipt, setSelectedReceipt] = useState({
		receiptUrl: "",
		paymentId: "",
	});
	const columns: ColumnDef<ManualPaymentSummary>[] = [
		{
			id: "booking",
			header: "Booking Code",
			cell: ({ row }) => {
				const data = row.original;
				return <div>{data.booking.bookingCode}</div>;
			},
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
								setOpenModal(true);
							}}
						>
							View Receipt
						</Button>
					</div>
				);
			},
		},
	];

	const [uiDateRange, setUiDateRange] = useState<DateRange | undefined>(
		undefined
	);
	const [uiDateRangeTo, setUiDateRangeTo] = useState<DateRange | undefined>(
		undefined
	);
	const [open, setOpen] = useState(false);
	const [openTo, setOpenTo] = useState(false);

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

	const handleDateChangeTo = (range: DateRange | undefined) => {
		setUiDateRangeTo(range);

		if (range?.from && range?.to) {
			setFilter((prev) => ({
				...prev,
				outFrom: dayjs(range.from).format("YYYY-MM-DD"),
				outTo: dayjs(range.to).format("YYYY-MM-DD"),
			}));
		} else {
			setFilter((prev) => ({
				...prev,
				outFrom: undefined,
				outTo: undefined,
			}));
		}
	};

	return (
		<div>
			<div className="flex gap-5 mb-6 flex-wrap items-center">
				<div className=" w-full max-w-[300px]">
					<label className="text-[15px] font-medium text-muted-foreground">
						Search
					</label>
					<Input
						className="bg-background rounded-md w-full min-w-[150px] justify-between text-[15px] font-normal border-2 border-[#f7d5b0]  flex text-muted-foreground px-2 py-1.5 outline-none"
						disabled={getPayments.isPending}
						placeholder="Enter / paste booking code"
						value={code}
						onChange={(e) => setCode(e.target.value)}
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-[15px] font-medium text-muted-foreground">
						Check In
					</label>
					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger asChild>
							<button
								className="border-[#f7d5b0] bg-background rounded-md w-full min-w-[150px] justify-between text-[14px] font-normal border-2 flex text-muted-foreground px-2 py-1.5 outline-none"
								disabled={getPayments.isPending}
							>
								{uiDateRange?.from && uiDateRange?.to ? (
									<p>
										<span className="text-black">
											{dayjs(uiDateRange.from).format(
												"MMM D, YYYY"
											)}{" "}
											-{" "}
											{dayjs(uiDateRange.to).format(
												"MMM D, YYYY"
											)}
										</span>
									</p>
								) : (
									<p>Filter Date</p>
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

				<div className="flex flex-col gap-1">
					<label className="text-[15px] font-medium text-muted-foreground">
						Check Out
					</label>
					<Popover open={openTo} onOpenChange={setOpenTo}>
						<PopoverTrigger asChild>
							<button
								className="border-[#f7d5b0] bg-background rounded-md w-full min-w-[150px] justify-between text-[14px] font-normal border-2 flex text-muted-foreground px-2 py-1.5 outline-none"
								disabled={getPayments.isPending}
							>
								{uiDateRangeTo?.from && uiDateRangeTo?.to ? (
									<p>
										<span className="text-black">
											{dayjs(uiDateRangeTo.from).format(
												"MMM D, YYYY"
											)}{" "}
											-{" "}
											{dayjs(uiDateRangeTo.to).format(
												"MMM D, YYYY"
											)}
										</span>
									</p>
								) : (
									<p>Filter Date</p>
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
								selected={uiDateRangeTo}
								onSelect={handleDateChangeTo}
							/>
						</PopoverContent>
					</Popover>
				</div>
			</div>

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
				open={openModal}
				onClose={() => setOpenModal(false)}
				receiptUrl={selectedReceipt.receiptUrl}
				paymentId={selectedReceipt.paymentId}
			/>
		</div>
	);
};

export default Payments;
