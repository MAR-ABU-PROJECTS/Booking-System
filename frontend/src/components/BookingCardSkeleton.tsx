import { Skeleton } from "@components/ui/skeleton";

export function BookingCardSkeleton() {
	return (
		<div className="group cursor-pointer">
			{/* Image Skeleton */}
			<div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 hidden">
				<Skeleton className="w-full h-full rounded-md" />
			</div>

			{/* Content Skeleton */}
			<div className="space-y-1.5 mt-4 bg-gray-100 p-4 rounded-xl">
				<div className="flex justify-between">
					<Skeleton className="w-24 h-4" />
					<Skeleton className="w-16 h-4" />
				</div>

				<div className="flex justify-between">
					<Skeleton className="w-20 h-4" />
					<Skeleton className="w-16 h-4" />
				</div>

				<div className="flex justify-between">
					<Skeleton className="w-20 h-4" />
					<Skeleton className="w-16 h-4" />
				</div>

				<div className="flex justify-between">
					<Skeleton className="w-16 h-4" />
					<Skeleton className="w-12 h-4" />
				</div>

				<div className="flex justify-between">
					<Skeleton className="w-16 h-4" />
					<Skeleton className="w-20 h-4" />
				</div>

				<div className="flex justify-between">
					<Skeleton className="w-28 h-4" />
					<Skeleton className="w-20 h-4" />
				</div>

				<div className="flex justify-between">
					<Skeleton className="w-28 h-4" />
					<Skeleton className="w-24 h-4" />
				</div>
				<div className="flex justify-between">
					<Skeleton className="w-28 h-4" />
					<Skeleton className="w-24 h-4" />
				</div>
				<div className="flex justify-between">
					<Skeleton className="w-28 h-4" />
					<Skeleton className="w-24 h-4" />
				</div>
				<div className="flex justify-between">
					<Skeleton className="w-28 h-4" />
					<Skeleton className="w-24 h-4" />
				</div>
				<div className="flex justify-between">
					<Skeleton className="w-28 h-4" />
					<Skeleton className="w-24 h-4" />
				</div>
			</div>
		</div>
	);
}
