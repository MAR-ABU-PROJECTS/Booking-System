import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@components/ui/alert-dialog";
import { Button } from "@components/ui/button";
import { Card } from "@components/ui/card";
import { apiService } from "@lib/apiService";
import { User } from "@lib/type";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheck, BookOpen, House, Loader2, XIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-toastify";

type Props = {
	data: User;
};
const UserDetails = ({ data }: Props) => {
	const [open, setOpen] = useState(false);
	const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

	const mutation = useMutation({
		mutationFn: async () => {
			return await apiService.delete(`/admin/users/${data.id}`);
		},
		onSuccess: (data) => {
			setOpen(false);
			toast.success(`${data.message}`, { progress: undefined });
		},
	});

	const statusColors: Record<string, string> = {
		PENDING_VERIFICATION: "bg-yellow-100 text-yellow-800",
		ACTIVE: "bg-green-200 text-green-900",
	};

	return (
		<div>
			<div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-10">
				<Card className="p-5 border-2 border-[#f7d5b0] self-start">
					<div className="mt-4 mx-auto relative w-[170px] h-[170px] mb-2">
						<div className="relative w-full h-full rounded-full overflow-hidden border">
							<Image
								src={
									data?.avatar
										? `${BASE_URL}${data.avatar}`
										: "/images/blank-image.jpeg"
								}
								fill
								alt="avatar"
								className="object-cover object-center"
							/>
						</div>
					</div>

					<div className="space-y-1.5 text-center">
						<h2 className="text-xl font-semibold text-gray-900">
							{/* {data?.lastName} {data?.firstName} */}
						</h2>
						<p className="text-gray-500 text-sm">
							Role: {data?.role}
						</p>
					</div>
					<div className="flex gap-3 items-center justify-between">
						<span>Email Verification </span>{" "}
						{data?.emailVerified ? (
							<div className="flex items-center gap-1">
								Verified{" "}
								<BadgeCheck className="text-green-500 size-4 shrink-0" />{" "}
							</div>
						) : (
							<div className="flex items-center gap-1">
								<XIcon className="text-red-500 size-4 shrink-0" />{" "}
								Not Verified
							</div>
						)}
					</div>

					<hr />

					<div>
						<h3 className="text-[16px] font-medium text-gray-900 text-center mb-4">
							Activity Stats
						</h3>
						<div className="grid grid-cols-2 gap-2 text-center mb-2">
							<div className="p-2 bg-gray-50 rounded-lg">
								<BookOpen className="text-gray-500 size-4 mx-auto" />

								<h4 className="text-lg font-semibold text-gray-900">
									{data.bookings.length}
								</h4>
								<p className="text-xs text-gray-500">
									Bookings
								</p>
							</div>
							<div className="p-2 bg-gray-50 rounded-lg">
								<House className="text-gray-500 size-4 mx-auto" />

								<h4 className="text-lg font-semibold text-gray-900">
									{data?.hostedProperties ?? 0}
								</h4>
								<p className="text-xs text-gray-500">
									Properties
								</p>
							</div>
						</div>
						<hr />
						<Button
							type="button"
							className="flex-1 h-[45px] text-[15px] w-full mt-2.5"
							disabled={mutation.isPending}
							onClick={() => {
								setOpen(true);
							}}
							variant="destructive"
						>
							Delete User
						</Button>
					</div>
				</Card>
				<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 self-start">
					<div className="rounded-sm border-2 border-[#f7d5b0] self-start p-3 flex flex-col gap-5">
						<h4 className="font-medium">User Id</h4>
						<p className="font-medium">{data.id}</p>
					</div>
					<div className="rounded-sm border-2 border-[#f7d5b0] self-start p-3 flex flex-col gap-5">
						<h4 className="font-medium">First Name</h4>
						<p className="font-medium">{data.firstName}</p>
					</div>
					<div className="rounded-sm border-2 border-[#f7d5b0] self-start p-3 flex flex-col gap-5">
						<h4 className="font-medium">Last Name</h4>
						<p className="font-medium">{data.lastName}</p>
					</div>
					<div className="rounded-sm border-2 border-[#f7d5b0] self-start p-3 flex flex-col gap-5">
						<h4 className="font-medium">Email</h4>
						<p className="font-medium">{data.email}</p>
					</div>
					<div className="rounded-sm border-2 border-[#f7d5b0] self-start p-3 flex flex-col gap-5">
						<h4 className="font-medium">Phone</h4>
						<p className="font-medium">{data.phone}</p>
					</div>

					<div className="rounded-sm border-2 border-[#f7d5b0] self-start p-3 flex flex-col gap-5">
						<h4 className="font-medium">Status</h4>
						<p className="font-medium">
							<span
								className={`px-3 py-1 rounded-full text-sm font-medium ${
									statusColors[data.status] ??
									"bg-gray-100 text-gray-800"
								}`}
							>
								{data.status.replace("_", " ")}
							</span>
						</p>
					</div>
					<div className="rounded-sm border-2 border-[#f7d5b0] self-start p-3 flex flex-col gap-5">
						<h4 className="font-medium">Country</h4>
						<p className="font-medium">{data.country}</p>
					</div>
				</div>
			</div>

			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete User</AlertDialogTitle>
						<AlertDialogDescription className="text-[15px]">
							Are you sure you want to delete {data.firstName}{" "}
							{data.lastName}?
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

export default UserDetails;
