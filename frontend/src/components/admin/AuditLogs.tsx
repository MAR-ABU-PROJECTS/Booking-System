"use client";
import { QueryStateHandler } from "@components/QueryStateHandler";
import { apiService } from "@lib/apiService";
import { Audit } from "@lib/type";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import dayjs from "dayjs";
import { DataTable } from "./DataTable";
import { useEffect, useState } from "react";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { DataTableSkeleton } from "@components/ui/data-table-skeleton";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@components/ui/popover";
import { DateRange } from "react-day-picker";
import { CalendarMinus2 } from "lucide-react";
import { Calendar } from "@components/ui/calendar";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
dayjs.extend(advancedFormat);

const AuditLogs = () => {
	type LogsFilter = {
		dateFrom?: string;
		dateTo?: string;
	};
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [uiDateRange, setUiDateRange] = useState<DateRange | undefined>(
		undefined
	);
	const [open, setOpen] = useState(false);
	const [filter, setFilter] = useState<LogsFilter>({});
	const getAudits = useQuery({
		queryKey: ["admin-audits", { ...filter, pagination }],
		queryFn: async () => {
			const params: Record<string, any> = {
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			};
			if (filter.dateFrom) params.startDate = filter.dateFrom;
			if (filter.dateTo) params.endDate = filter.dateTo;
			const response = await apiService.get(`/admin/audit-logs`, {
				params,
			});
			return response;
		},
	});

	const columns: ColumnDef<Audit>[] = [
		{
			id: "email",
			header: "Email",
			cell: ({ row }) => {
				const data = row.original;
				return <p>{data.userEmail}</p>;
			},
		},

		{
			id: "action",
			header: "Action",
			cell: ({ row }) => {
				const data = row.original;
				return <p>{data.action.replace(/_/g, " ")}</p>;
			},
		},
		{
			accessorKey: "time stamp",
			header: "Time Stamp",
			cell: ({ row }) => {
				const date = row.original.timestamp;
				const formattedDate = dayjs(date).format(
					"Do MMM YYYY, h:mm:ss A"
				);
				return (
					<span className={`rounded-full text-sm font-medium`}>
						{formattedDate}
					</span>
				);
			},
		},

		// {
		// 	id: "role",
		// 	header: "Role",
		// 	cell: ({ row }) => {
		// 		const role = row.original.details.role;
		// 		return (
		// 			<span
		// 				className={`px-3 py-1 rounded-full text-sm font-medium ${"bg-gray-100 text-gray-800"}`}
		// 			>
		// 				{role?.replace("_", " ")}
		// 			</span>
		// 		);
		// 	},
		// },

		{
			id: "ip",

			header: "IP Address",
			cell: ({ row }) => {
				const ip = row.original.ip;

				return (
					<span
						className={`rounded-full text-sm font-medium text-blue-500`}
					>
						{ip}
					</span>
				);
			},
		},
	];

	useEffect(() => {
		if (getAudits.error) {
			const err = getAudits.error;
			if (isAxiosError(err)) {
				toast.error(
					err.response?.data?.message || "An error occurred",
					{ progress: undefined }
				);
			} else {
				toast.error("Unexpected error", { progress: undefined });
			}
		}
	}, [getAudits.error]);

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

	return (
		<div>
			<div className="space-y-2 mb-4 w-full max-w-[300px]">
				<label className="text-[14px] font-medium text-muted-foreground">
					Date
				</label>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<button
							className="bg-background rounded-md w-full min-w-[150px] justify-between text-[14px] font-normal border-1 flex text-muted-foreground px-2 py-1.5 outline-none"
							disabled={getAudits.isPending}
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
								<p>Select Date</p>
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
			<QueryStateHandler
				query={getAudits}
				emptyMessage="No Audits found"
				getItems={(res) => res.data?.logs}
				loadingComponent={
					<DataTableSkeleton
						columnCount={4}
						cellWidths={["25rem", "25rem", "25rem", "25rem"]}
					/>
				}
				render={(res) => {
					const data = res.data?.logs ?? [];
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

export default AuditLogs;
