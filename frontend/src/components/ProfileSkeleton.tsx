import { Skeleton } from "@components/ui/skeleton";
import { Card } from "@components/ui/card";

const ProfileSkeleton = () => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-[280px_auto] gap-5 md:gap-7 lg:grid-cols-[400px_auto]">
			
			<Card className="p-5 border-2 border-[#f7d5b0] self-start">
			
				<div className="mt-4 mx-auto relative rounded-full flex justify-center items-center overflow-hidden object-center object-cover size-[150px] mb-2">
					<Skeleton className="size-[150px] rounded-full" />
				</div>

				
				<div className="space-y-1.5 text-center mb-4">
					<Skeleton className="h-6 w-40 mx-auto" /> 
					<Skeleton className="h-4 w-24 mx-auto" /> 
				</div>

				<hr />

			
				<div className="flex flex-col gap-2.5 text-[15px] text-black">
					<div className="flex items-center gap-3">
						<Skeleton className="h-5 w-full" />
					</div>
					<div className="flex items-center gap-3">
						<Skeleton className="h-5 w-full" />
					</div>
					<div className="flex items-center gap-3">
						<Skeleton className="h-5 w-full" />
					</div>
				
				</div>
			</Card>

			<Card className=" border-2 border-[#f7d5b0] space-y-4 p-5">
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div>
					<Skeleton className="h-10 w-28" />
				</div>
			</Card>
		</div>
	);
};

export default ProfileSkeleton;
