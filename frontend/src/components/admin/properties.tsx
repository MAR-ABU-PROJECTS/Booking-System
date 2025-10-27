"use client";
import { QueryStateHandler } from "@components/QueryStateHandler";
import { DataTableSkeleton } from "@components/ui/data-table-skeleton";
import { apiService } from "@lib/apiService";
import { AdminProperty, } from "@lib/type";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { useState } from "react";
import { DataTable } from "./DataTable";
import { Button } from "@components/ui/button";
import Link from "next/link";
import { Edit, Eye, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@components/ui/alert-dialog";
import { Badge } from "@components/ui/badge";
import dayjs from "dayjs";

const Properties = () => {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const getProperties = useQuery({
		queryKey: ["admin-properties"],
		queryFn: async () => {
			const response = await apiService.get(`/admin/properties`);
			return response;
		},
	});

	

	const [selectedProperty, setSelectedProperty] = useState({
		id: "",
		name: "",
	});
	const [open, setOpen] = useState(false);
	const handldeTrashMenuClick = (id: string, name: string) => {
		setSelectedProperty({
			id,
			name,
		});
		setOpen(true);
	};
	const columns: ColumnDef<AdminProperty>[] = [
		{
			id: "Property_Name",
			header: "Name",
			cell: ({ row }) => {
				const property = row.original;
				return (
					<div>
						<p className="text-base">{property.name}</p>
					</div>
				);
			},
		},

		{
			accessorKey: "address",
			header: "Address",
			cell: ({ row }) => {
				const property = row.original;
				return (
					<div className="text-base">
						<p>{property.address}</p>
					</div>
				);
			},
		},
		{
			accessorKey: "state",
			header: "State",
			cell: ({ row }) => {
				const property = row.original;
				return (
					<div className="text-base">
						<p>{property.state} State</p>
						<p>{property.city} City</p>
					</div>
				);
			},
		},

		{
			accessorKey: "baseRate",
			header: "Rate",
			cell: ({ row }) => {
				const property = row.original;
				return (
					<div>
						<p className="text-base">
							{formatCurrency(property.baseRate)}
						</p>
						<p className="text-gray-400 text-sm">per night</p>
					</div>
				);
			},
		},
		{
			id: "details",
			header: "Details",
			cell: ({ row }) => {
				const property = row.original;
				return (
					<div>
						<p className="text-base text-gray-500">
							{property.bedrooms} Bed
						</p>
						<p className="text-base text-gray-500">
							{property.bathrooms} Bath
						</p>
					</div>
				);
			},
		},
		{
			accessorKey: "type",
			header: "Property Type",
			cell: ({ row }) => {
				const property = row.original;
				return (
					<div>
						<p className="text-base">{property.type}</p>
					</div>
				);
			},
		},
		{
			id: "type",
			header: "Status",
			cell: ({ row }) => {
				const property = row.original;
				return (
					<div>
						<Badge
							variant={
								property.isActive ? "default" : "secondary"
							}
						>
							{property.isActive ? "Active" : "Inactive"}
						</Badge>
					</div>
				);
			},
		},
		{
			accessorKey: "createdAt",
			header: "Date Created",
			cell: ({ row }) => {
				const property = row.original;
				return (
					<div>{dayjs(property.createdAt).format("D/MM/YYYY")}</div>
				);
			},
		},

		{
			id: "actions",

			cell: ({ row }) => {
				const property = row.original;

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
										href={`/admin-properties/${property.id}`}
										className="flex items-center"
									>
										<Eye className="size-5 text-gray-500 mr-2" />{" "}
										View Details
									</Link>
								</DropdownMenuItem>

								<DropdownMenuSeparator />
								<DropdownMenuItem className="hover:outline-0 hover:bg-zinc-100 p-1">
									<Link
										href={`/admin-properties/${property.id}/edit`}
										className="flex items-center"
									>
										<Edit className="size-5 text-gray-500 mr-2" />{" "}
										Edit
									</Link>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="hover:outline-0 hover:bg-zinc-100 p-1 !cursor-pointer"
									onClick={() =>
										handldeTrashMenuClick(
											property.id,
											property.name
										)
									}
								>
									<Trash2 className="text-red-500 size-5" />{" "}
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				);
			},
		},
	];
	return (
		<div>
			<div className="flex items-center justify-end mb-6">
				<Button asChild>
					<Link
						href={"/admin-properties/add-property"}
						className="text-base font-semibold"
					>
						<Plus /> Add Property
					</Link>
				</Button>
			</div>

			<QueryStateHandler
				query={getProperties}
				emptyMessage="No Properties found"
				getItems={(res) => res.data?.properties}
				loadingComponent={
					<DataTableSkeleton
						columnCount={9}
						cellWidths={[
							"33rem",
							"33rem",
							"10rem",
							"10rem",
							"10rem",
							"10rem",
							"10rem",
							"10rem",
							"4rem",
						]}
					/>
				}
				render={(res) => {
					const data = (res.data?.properties ??
						[]) as AdminProperty[];
					const pages = res.data?.pagination?.pages ?? 0;

					return (
						<div>
							<DataTable
								columns={columns}
								data={data}
								pagination={pagination}
								setPagination={setPagination}
								pageCount={pages}
							/>
						</div>
					);
				}}
			/>

			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Property</AlertDialogTitle>
						<AlertDialogDescription className="text-[15px]">
							Are you sure you want to delete{" "}
							{selectedProperty.name} ?
						</AlertDialogDescription>

						<div className="flex gap-4 mt-6">
							<Button
								onClick={() => {
									// mutation.mutate();
								}}
								className="flex-1 h-[45px] text-[15px]"
								type="button"
								// disabled={mutation.isPending}
								variant="default"
							>
								{/* {mutation.isPending && (
									<Loader2 className="animate-spin text-white mr-1.5" />
								)} */}
								Continue
							</Button>
							<Button
								type="button"
								className="flex-1 h-[45px] text-[15px]"
								// disabled={mutation.isPending}
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

export default Properties;
