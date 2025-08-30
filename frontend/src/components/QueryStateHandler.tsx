import { Loader2 } from "lucide-react";
import { Button } from "@components/ui/button";
import { UseQueryResult } from "@tanstack/react-query";


type QueryStateHandlerProps<T> = {
	query: UseQueryResult<T, Error>;
  render: (data: T) => React.ReactNode;
	emptyMessage?: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getItems?: (data: T) => any[];
};

export function QueryStateHandler<T>({
	query,
	render,
	emptyMessage = "No data found",
	getItems,
}: QueryStateHandlerProps<T>) {
	if (query.isPending) {
		return (
			<div className="my-6 flex justify-center">
				<Loader2 className="animate-spin text-amber-500" />
			</div>
		);
	}

	if (query.isError) {
		return (
			<div className="my-6 flex flex-col items-center justify-center">
				<h3 className="mb-1 text-red-500">
					{query.error?.message || "Something went wrong"}
				</h3>
				<Button
					className="!cursor-pointer hover:bg-[#F4A857] py-[10px] text-[16px] transition-transform duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
					type="button"
					onClick={() => query.refetch()}
				>
					Retry
				</Button>
			</div>
		);
	}

	if (query.isSuccess && query.data) {
		const items = getItems ? getItems(query.data) : query.data;
		if (Array.isArray(items) && items.length === 0) {
			return (
				<div className="my-6 flex flex-col items-center justify-center text-gray-500">
					<h3 className="mb-1">{emptyMessage}</h3>
				</div>
			);
		}
	}

	return <>{query.data && render(query.data)}</>;
}
