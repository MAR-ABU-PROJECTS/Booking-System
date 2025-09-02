import { Loader2 } from "lucide-react";
import { Button } from "@components/ui/button";
import { UseQueryResult } from "@tanstack/react-query";
import React from "react";

type QueryStateHandlerProps<T> = {
  query: UseQueryResult<T, Error>;
  render: (data: T) => React.ReactNode;
  emptyMessage?: string;
  getItems?: (data: T) => unknown[];
  loadingComponent?: React.ReactNode;
  errorComponent?: (error: Error, retry: () => void, isFetching: boolean) => React.ReactNode;
};

export function QueryStateHandler<T>({
  query,
  render,
  emptyMessage = "No data found",
  getItems,
  loadingComponent,
  errorComponent,
}: QueryStateHandlerProps<T>) {
  // ⏳ Loading state
  if (query.isPending) {
    return (
      loadingComponent ?? (
        <div className="my-6 flex justify-center">
          <Loader2 className="animate-spin text-amber-500" />
        </div>
      )
    );
  }

  // ❌ Error state
  if (query.isError) {
    if (errorComponent) {
      return errorComponent(query.error, query.refetch, query.isFetching);
    }

    return (
      <div className="my-6 flex flex-col items-center justify-center">
        <h3 className="mb-1 text-red-500">
          {query.error?.message || "Something went wrong"}
        </h3>
        <Button
          className="!cursor-pointer hover:bg-[#F4A857] py-[10px] text-[16px] transition-transform duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? (
            <Loader2 className="animate-spin" />
          ) : (
            "Retry"
          )}
        </Button>
      </div>
    );
  }

  // ✅ Success state
  if (query.isSuccess && query.data) {
    const items = getItems ? getItems(query.data) : query.data;

    if (Array.isArray(items) && items.length === 0) {
      return (
        <div className="my-6 flex flex-col items-center justify-center text-gray-500">
          <h3 className="mb-1">{emptyMessage}</h3>
        </div>
      );
    }

    return <>{render(query.data)}</>;
  }

  // 🔒 Fallback (shouldn't usually happen)
  return null;
}
