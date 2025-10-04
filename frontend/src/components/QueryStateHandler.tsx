import { Loader2 } from "lucide-react";
import { Button } from "@components/ui/button";
import { UseQueryResult } from "@tanstack/react-query";
import React from "react";

type QueryStateHandlerProps<T> = {
  query: UseQueryResult<T, Error>;
  render: (data: T) => React.ReactNode;
  emptyMessage?: string;
  getItems?: (data: T) => unknown;
  loadingComponent?: React.ReactNode;
  errorComponent?: (
    error: Error,
    retry: () => void,
    isFetching: boolean
  ) => React.ReactNode;
};

function isEmptyData(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0;
  if (data && typeof data === "object") return Object.keys(data).length === 0;
  return data == null;
}

function DefaultErrorComponent(
  error: Error,
  retry: () => void,
  isFetching: boolean
) {
  return (
    <div className="my-6 flex flex-col items-center justify-center">
      <h3 className="mb-1 text-red-500">
        {error.message || "Something went wrong"}
      </h3>
      <Button
        className="!cursor-pointer hover:bg-[#F4A857] py-[10px] text-[16px] transition-transform duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
        type="button"
        onClick={retry}
        disabled={isFetching}
      >
        {isFetching ? <Loader2 className="animate-spin" /> : "Retry"}
      </Button>
    </div>
  );
}

export function QueryStateHandler<T>({
  query,
  render,
  emptyMessage = "No data found",
  getItems,
  loadingComponent,
  errorComponent = DefaultErrorComponent, // ✅ fallback
}: QueryStateHandlerProps<T>) {
  if (query.isPending) {
    return (
      loadingComponent ?? (
        <div className="my-6 flex justify-center">
          <Loader2 className="animate-spin text-amber-500" />
        </div>
      )
    );
  }

  if (query.isError) {
    return errorComponent(query.error, query.refetch, query.isFetching);
  }

  if (query.isSuccess && query.data) {
    const items = getItems ? getItems(query.data) : query.data;

    if (isEmptyData(items)) {
      return (
        <div className="my-12 flex flex-col items-center justify-center text-gray-500">
          <h3 className="mb-1">{emptyMessage}</h3>
        </div>
      );
    }

    return <>{render(query.data)}</>;
  }

  return null;
}
