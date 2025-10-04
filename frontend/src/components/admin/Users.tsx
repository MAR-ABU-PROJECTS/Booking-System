"use client";
import { Button } from "@components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuSeparator,
} from "@components/ui/dropdown-menu";
import { apiService } from "@lib/apiService";
import { Users } from "@lib/type";
import {
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { isAxiosError } from "axios";
import { Eye, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { DataTable } from "./DataTable";
import { DataTableSkeleton } from "@components/ui/data-table-skeleton";
import { QueryStateHandler } from "@components/QueryStateHandler";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@components/ui/alert-dialog";
import Link from "next/link";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
dayjs.extend(advancedFormat);

const UsersManagement = () => {
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();
	const getUsers = useQuery({
		queryKey: ["admin-users"],
		queryFn: async () => {
			const response = await apiService.get(`/admin/users`);
			return response;
		},
	});

	useEffect(() => {
		if (getUsers.error) {
			const err = getUsers.error;
			if (isAxiosError(err)) {
				toast.error(
					err.response?.data?.message || "An error occurred",
					{ progress: undefined }
				);
			} else {
				toast.error("Unexpected error", { progress: undefined });
			}
		}
	}, [getUsers.error]);

	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});

	const [selectedUser, setSelectedUser] = useState({
		id: "",
		name: "",
	});

	useEffect(() => {
		if (!open) {
			setSelectedUser({
				id: "",
				name: "",
			});
		}
	}, [open]);

	const handldeTrashMenuClick = (id: string, name: string) => {
		setSelectedUser({
			id,
			name,
		});
		setOpen(true);
	};
	const statusColors: Record<string, string> = {
		PENDING_VERIFICATION: "bg-yellow-100 text-yellow-800",
		ACTIVE: "bg-green-200 text-green-900",
		ADMIN: "bg-blue-100 text-blue-800",
		CUSTOMER: "bg-purple-100 text-purple-800",
	};

	const columns: ColumnDef<Users>[] = [
		{
			id: "firstName",
			header: "Name",
			cell: ({ row }) => {
				const user = row.original;
				return (
					<div className="flex items-center">
						<p>
							{user.firstName} {user.lastName}
						</p>
					</div>
				);
			},
		},

		{
			accessorKey: "email",
			header: "Email",
		},

		{
			accessorKey: "role",
			header: "Role",
			cell: ({ row }) => {
				const status = row.original.role;
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
			accessorKey: "createdAt",
			header: "Date Joined",
			cell: ({ row }) => {
				const date = row.original.createdAt;
				const formattedDate = dayjs(date).format("Do MMM YYYY");
				return (
					<span className={`rounded-full text-sm font-medium`}>
						{formattedDate}
					</span>
				);
			},
		},

		{
			accessorKey: "status",
			header: "Verification Status",
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
			id: "actions",

			cell: ({ row }) => {
				const user = row.original;

				return (
					<div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant={"ghost"}>
									<MoreHorizontal />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="p-0.5">
								<DropdownMenuItem className="hover:outline-0 hover:bg-zinc-100 p-1">
									<Link
										href={`/user-management/${user.id}`}
										className="flex items-center text-sm"
									>
										<Eye className="size-5 text-gray-500 mr-1.5" />{" "}
										View Details
									</Link>
								</DropdownMenuItem>

								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="hover:outline-0 hover:bg-zinc-100 p-1 !cursor-pointer flex mr-1.5 text-sm"
									onClick={() =>
										handldeTrashMenuClick(
											user.id,
											`${user.firstName} ${user.lastName}`
										)
									}
								>
									<Trash2 className="text-red-500 size-5 mr-1.5" />{" "}
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];

	const mutation = useMutation({
		mutationFn: async () => {
			return await apiService.delete(`/admin/users/${selectedUser.id}`);
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ["admin-users"],
			});
			setOpen(false);
			toast.success(`${data.message}`, { progress: undefined });
		},
	});

	return (
		<div>
			<QueryStateHandler
				query={getUsers}
				emptyMessage="No Users found"
				getItems={(res) => res.data?.users}
				loadingComponent={
					<DataTableSkeleton
						columnCount={4}
						cellWidths={["15rem", "30rem", "20em", "10rem"]}
					/>
				}
				render={(res) => {
					const data = res.data?.users ?? [];
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

			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete User</AlertDialogTitle>
						<AlertDialogDescription className="text-[15px]">
							Are you sure you want to delete {selectedUser.name}{" "}
							?
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
								disabled={mutation.isPending}
								onClick={() => {
									setOpen(false);
								}}
								variant="destructive"
							>
								Cancel
							</Button>
						</div>
					</AlertDialogHeader>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default UsersManagement;
