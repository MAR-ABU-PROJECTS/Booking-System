"use client";
import { QueryStateHandler } from "@components/QueryStateHandler";
import { apiService } from "@lib/apiService";
import { Audit } from "@lib/type";
import { useQuery } from "@tanstack/react-query";
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
import { CalendarMinus2, Download, Loader2 } from "lucide-react";
import { Calendar } from "@components/ui/calendar";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import useDebounce from "@hooks/use-debounce";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
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
	const [email, setEmail] = useState("");
	const debouncedValue = useDebounce(email, 2000);
	const getAudits = useQuery({
		queryKey: ["admin-audits", { ...filter, pagination, debouncedValue }],
		queryFn: async () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const params: Record<string, any> = {
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			};
			if (debouncedValue) {
				params.userEmail = debouncedValue;
			}
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
				return <p>{data.metadata.userEmail}</p>;
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
				const date = row.original.metadata.timestamp;
				const formattedDate = dayjs(date).format(
					"Do MMM YYYY, h:mm:ss A"
				);
				return (
					<span className={`rounded-full text-sm font-normal`}>
						{formattedDate}
					</span>
				);
			},
		},

		{
			id: "ip",

			header: "IP Address",
			cell: ({ row }) => {
				const ip = row.original.metadata.ip;

				return (
					<span className={`rounded-full text-sm font-normal`}>
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

	const downloadAudits = useQuery({
		queryKey: [
			"admin-audits-download",
			{ ...filter, pagination, debouncedValue },
		],
		queryFn: async () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const params: Record<string, any> = { limit: 10000 };
			if (debouncedValue) {
				params.userEmail = debouncedValue;
			}
			if (filter.dateFrom) params.startDate = filter.dateFrom;
			if (filter.dateTo) params.endDate = filter.dateTo;
			const response = await apiService.get(`/admin/audit-logs`, {
				params,
			});
			const logs = response.data?.logs || [];
			const csvRows = logs.map((log: Audit) =>
				[
					log.metadata?.userEmail || "",
					log.action || "",
					log.metadata?.timestamp || "",
					log.metadata?.ip || "",
				].join(",")
			);

			const csvContent = [
				"useremail,action,timestamp,ipaddress",
				...csvRows,
			].join("\n");
			const data = new Blob([`\uFEFF${csvContent}`], {
				type: "text/csv;charset=utf-8;",
			});

			return data;
		},
		enabled: false,
	});

	const handleDownloadClick = async () => {
		try {
			const { data } = await downloadAudits.refetch();

			console.log({ data });
			if (!data) return;

			const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
			const url = window.URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", "audit-logs.csv"); // file name
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			window.URL.revokeObjectURL(url);
		} catch (error) {
			toast.error("Download failed");
			console.error("Download failed:", error);
		}
	};

	return (
		<div>
			<div className="flex flex-wrap items-center gap-4 mb-5">
				<div className="flex flex-col w-full max-w-[300px]">
					<label className="text-sm font-medium text-muted-foreground mb-1">
						Date
					</label>
					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger asChild>
							<button
								className="flex items-center justify-between w-full bg-background rounded-md border px-3 py-2 text-sm font-normal text-muted-foreground"
								disabled={getAudits.isPending}
							>
								{uiDateRange?.from && uiDateRange?.to ? (
									<span className="text-black">
										{dayjs(uiDateRange.from).format(
											"MMM D, YYYY"
										)}{" "}
										-{" "}
										{dayjs(uiDateRange.to).format(
											"MMM D, YYYY"
										)}
									</span>
								) : (
									<span>Select Date</span>
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

				<div className="flex flex-col w-full max-w-[300px]">
					<label className="text-sm font-medium text-muted-foreground mb-1">
						Search
					</label>
					<Input
						className="bg-background rounded-md w-full border px-3 py-2 text-sm font-normal text-muted-foreground"
						disabled={getAudits.isPending}
						placeholder="Enter user email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
				</div>

				<div className="ml-auto">
					<Button
						onClick={handleDownloadClick}
						disabled={downloadAudits.isFetching}
						className="flex items-center gap-2"
					>
						Download{" "}
						{downloadAudits.isFetching ? (
							<Loader2 className="animate-spin " />
						) : (
							<Download />
						)}
					</Button>
				</div>
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
