"use client";

import { Skeleton } from "@components/ui/skeleton";

export default function ConfirmationMetaSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-5 lg:px-12">
      {/* Header with Lottie */}
      <div className="flex flex-col justify-center items-center gap-3">
        <Skeleton className="w-[100px] h-[100px] rounded-full" />
        <Skeleton className="h-5 w-48 mt-2" />
        <Skeleton className="h-4 w-64 mt-1" />
        <Skeleton className="h-6 w-60 mt-2 rounded-md" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[60%_35%] justify-between lg:gap-10 py-6 gap-8">
        {/* Left Main Section */}
        <div className="flex flex-col w-full h-full p-5 bg-white rounded-xl border-2 border-[#f7d5b0] gap-8">
          {/* Reservation */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 items-center">
              <Skeleton className="w-6 h-6 rounded-md" />
              <Skeleton className="h-5 w-32" />
            </div>

            <div className="flex flex-col gap-4 p-5 bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0]">
              <Skeleton className="w-full h-[150px] rounded-xl" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 px-3 py-2 bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0]"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>

          {/* Guest Info */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 items-center">
              <Skeleton className="w-6 h-6 rounded-md" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 px-3 py-2 bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0]"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 items-center">
              <Skeleton className="w-6 h-6 rounded-md" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 px-3 py-2 bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0]"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Booking Status */}
        <div className="flex flex-col w-full h-[600px] lg:h-[700px] xl:h-[600px] p-5 bg-white rounded-xl border-2 border-[#f7d5b0] gap-6">
          <div className="flex items-center justify-center">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex flex-col gap-6 px-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="flex flex-col items-center justify-center gap-2 p-5 bg-[#FEF9F3] rounded-md border-2 border-[#f7d5b0]">
        <Skeleton className="w-12 h-12 rounded-full" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}
