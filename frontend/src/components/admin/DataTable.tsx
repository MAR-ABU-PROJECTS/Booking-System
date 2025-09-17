"use client";

import {
	ColumnDef,
	PaginationState,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@components/ui/table";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { Button } from "@components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@components/ui/select";
import { Dispatch, SetStateAction } from "react";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	withButton?: boolean;
	isLoading?: boolean;
	pagination?: PaginationState;
	setPagination?: Dispatch<SetStateAction<PaginationState>>;
	loading?: boolean;
	pageCount?: number;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	pagination,
	setPagination,
	pageCount,
}: DataTableProps<TData, TValue>) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),

		state: {
			pagination,
		},
		onPaginationChange: setPagination,
		manualPagination: true,
		pageCount: pageCount,
	});

	return (
		<div className="overflow-hidden rounded-md border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								return (
									<TableHead key={header.id} className="h-[55px]">
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef
														.header,
													header.getContext()
												)}
									</TableHead>
								);
							})}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() && "selected"}
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell
										key={cell.id}
										className="h-[55px]"
									>
										{flexRender(
											cell.column.columnDef.cell,
											cell.getContext()
										)}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="h-24 text-center"
							>
								No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
			<div className="flex items-center justify-end gap-3 mt-4 p-4">
				<div className="flex items-center space-x-2">
					<p className="whitespace-nowrap text-sm font-medium">
						Rows per page
					</p>

					<Select
						value={`${table.getState().pagination.pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value));
						}}
					>
						<SelectTrigger className="h-8 w-[4.5rem]">
							<SelectValue
								placeholder={
									table.getState().pagination.pageSize
								}
							/>
						</SelectTrigger>

						<SelectContent side="top">
							{[10, 20, 30, 40, 50].map((pageSize) => (
								<SelectItem
									key={pageSize}
									value={`${pageSize}`}
								>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center justify-center text-sm font-medium">
					Page {table.getState().pagination.pageIndex + 1} of{" "}
					{table.getPageCount()}
				</div>
				<div className="flex items-center justify-center gap-3">
					<Button
						variant={"outline"}
						size={"icon"}
						className="size-8"
						onClick={() => table.firstPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<ChevronsLeft className="size-4" />
					</Button>
					<Button
						variant={"outline"}
						size={"icon"}
						className="size-8"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<ChevronLeft className="size-4" />
					</Button>
					<Button
						className="size-8"
						variant={"outline"}
						size={"icon"}
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<ChevronRight className="size-4" />
					</Button>
					<Button
						className="size-8"
						variant={"outline"}
						size={"icon"}
						onClick={() => table.lastPage()}
						disabled={!table.getCanNextPage()}
					>
						<ChevronsRight className="size-4" />
					</Button>

					<span className="flex items-center gap-1 text-sm font-medium">
						Go to page:
						<input
							type="number"
							min="1"
							max={table.getPageCount()}
							defaultValue={
								table.getState().pagination.pageIndex + 1
							}
							onChange={(e) => {
								const page = e.target.value
									? Number(e.target.value) - 1
									: 0;
								table.setPageIndex(page);
							}}
							className="border p-1 rounded w-16"
						/>
					</span>

					{/* {dataQuery.isFetching ? 'Loading...' : null} */}
				</div>
			</div>
		</div>
	);
}
