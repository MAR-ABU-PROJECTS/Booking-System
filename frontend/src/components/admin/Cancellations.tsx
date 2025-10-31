"use client";
import { apiService } from "@lib/apiService";
import { CancellationType } from "@lib/type";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { useState } from "react";
import { DataTable } from "./DataTable";
import { DataTableSkeleton } from "@components/ui/data-table-skeleton";
import { QueryStateHandler } from "@components/QueryStateHandler";
import { Button } from "@components/ui/button";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { isAxiosError } from "axios";
dayjs.extend(advancedFormat);

const Cancellations = () => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const getCancellation = useQuery({
		queryKey: ["admin-cancellations", { pagination }],
		queryFn: async () => {
			const params: Record<string, any> = {
				page: pagination.pageIndex + 1,
				limit: pagination.pageSize,
			};
			const response = await apiService.get(
				`/admin/scheduler/upcoming-cancellations`,
				{ params }
			);
			return response;
		},
	});

	const columns: ColumnDef<CancellationType>[] = [
		{
			accessorKey: "propertyName",
			header: "Property",
		},
		{
			id: "booking",
			header: "Booking Code",
			cell: ({ row }) => {
				const data = row.original;
				return <div>{data.bookingCode}</div>;
			},
		},

		{
			accessorKey: "customerName",
			header: "Customer Name",
		},

		{
			accessorKey: "approvedAt",
			header: "Approved At",
			cell: ({ row }) => {
				const data = row.original.approvedAt;
				const formattedDate = dayjs(data).format("Do MMM YYYY");
				return <div>{formattedDate}</div>;
			},
		},
	];

	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: async () => {
			const response = await apiService.post(
				`/admin/scheduler/trigger-cancellation`,
				{}
			);
			return response;
		},
		onSuccess(data) {
			queryClient.invalidateQueries({
				queryKey: ["admin-cancellations"],
				exact:false
			});
			setOpen(false);
			toast.success(data.message as string, {
				closeOnClick: true,
				progress: undefined,
			});
		},
		onError(error) {
			let message = "";
			if (isAxiosError(error)) {
				message = error.response?.data.message;
			} else {
				message = error.message;
			}
			toast.error(message as string, {
				closeOnClick: true,
				progress: undefined,
			});
		},
	});

	return (
		<div>
			<div className="flex items-center justify-end mb-6">
				<Button variant={"destructive"} onClick={()=>setOpen(true)}>Trigger Cancellations</Button>
			</div>
			<QueryStateHandler
				query={getCancellation}
				emptyMessage="No data found"
				getItems={(res) => res.data}
				loadingComponent={
					<DataTableSkeleton
						columnCount={6}
						cellWidths={["25rem", "25rem", "25rem", "25rem"]}
					/>
				}
				render={(res) => {
					const data = res.data.bookings ?? [];

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

			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Cancell All Bookings
						</AlertDialogTitle>
						<AlertDialogDescription className="text-[15px]">
							Are you sure you want to cancel all bookings?
						</AlertDialogDescription>

						<div className="flex gap-4 mt-6">
							<Button
								onClick={() => {
									mutation.mutate();
								}}
								className="flex-1 h-[45px] text-[15px]"
								type="button"
								disabled={mutation.isPending}
								variant="default"
							>
								{mutation.isPending && (
									<Loader2 className="animate-spin text-white mr-1.5" />
								)}
								Continue
							</Button>
							<Button
								type="button"
								className="flex-1 h-[45px] text-[15px]"
								onClick={() => {
									setOpen(false);
								}}
								variant="destructive"
								disabled={mutation.isPending}
							>
								No
							</Button>
						</div>
					</AlertDialogHeader>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default Cancellations;
