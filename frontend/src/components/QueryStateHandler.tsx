import { Loader2 } from "lucide-react";
import { Button } from "@components/ui/button";

type QueryStateHandlerProps<T> = {
	query: {
		isPending: boolean;
		isError: boolean;
		error: any;
		isSuccess: boolean;
		refetch: () => void;
		data?: T;
	};
	render: (data: T) => React.ReactNode;
	emptyMessage?: string;
};

export function QueryStateHandler<T>({
	query,
	render,
	emptyMessage = "No data found",
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
			<div className="my-6 flex justify-center flex-col items-center">
				<h3 className="mb-1 text-red-500">
					{query.error?.message || "Something went wrong"}
				</h3>
				<Button
					className="!cursor-pointer hover:bg-[#F4A857] py-[10px] text-[16px] items-center transition-transform duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
					type="button"
					onClick={() => query.refetch()}
				>
					Retry
				</Button>
			</div>
		);
	}

	if (query.isSuccess && (!query.data || (Array.isArray(query.data) && query.data.length === 0))) {
		return (
			<div className="my-6 flex justify-center flex-col items-center text-gray-500">
				<h3 className="mb-1">{emptyMessage}</h3>
			</div>
		);
	}

	return <>{query.data && render(query.data)}</>;
}
