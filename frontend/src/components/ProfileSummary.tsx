import { Card } from "./ui/card";
import {
	BadgeCheck,
	BookOpen,
	Calendar,
	House,
	Loader2,
	Mail,
	Phone,
} from "lucide-react";
import { UserProfile } from "@lib/type";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import "dayjs/locale/en"; // ensure English locale is loaded
import { ProfileAvatar } from "./ProfileAvatar";
import { toast } from "react-toastify";
import { useMutation } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { Button } from "./ui/button";

const ProfileSummary = ({ data }: { data?: UserProfile }) => {
	dayjs.extend(advancedFormat);
	dayjs.locale("en");

	const formattedDate = `${dayjs(data?.createdAt).format("MMM, Do YYYY")}`;

	const mutation = useMutation({
		mutationFn: async () => {
			const response = await apiService.post(
				"/auth/verify-email/resend",
				{}
			);
			return response;
		},
		onSuccess: async (res) => {
			if (res?.success) {
				const message = res?.message as string;
				toast.success(message, {
					closeOnClick: false,
					progress: undefined,
				});
			} else {
				const message = res?.message as string;
				toast.success(message, {
					closeOnClick: false,
					progress: undefined,
				});
			}
		},

		onError: (error) => {
			if (isAxiosError(error)) {
				const message =
					(error.response?.data?.message as string) ||
					"Something went wrong";

				toast.error(`${message}`, {
					closeOnClick: false,
					progress: undefined,
				});
			} else {
				console.error("Non-Axios Error:", error);
			}
		},
	});

	return (
		<Card className="p-5 border-2 border-[#f7d5b0] self-start">
			<div>
				<ProfileAvatar initialPhoto={data?.avatar as string} />
			</div>

			<div className="space-y-1.5 text-center">
				<h2 className="text-xl font-semibold text-gray-900">
					{data?.lastName} {data?.firstName}
				</h2>
				<p className="text-gray-500 text-sm">{data?.role}</p>
			</div>

			<hr />
			<div className="flex flex-col gap-2 text-[15px] text-black">
				<div className="flex items-center justify-between gap-1 flex-wrap">
					<div className="flex gap-3 items-center">
						<Mail className="size-4 text-gray-400" />
						<span>{data?.email}</span>{" "}
					</div>
					{data?.emailVerified ? (
						<BadgeCheck className="text-green-500 size-4 shrink-0" />
					) : (
						<Button
							onClick={() => mutation.mutate()}
							disabled={mutation.isPending}
							className="h-[24px]"
						>
							{mutation.isPending && (
								<Loader2 className="animate-spin text-white" />
							)}{" "}
							Verify
						</Button>
					)}
				</div>
				<div className="flex items-center gap-3">
					<Phone className="size-4 text-gray-400" />
					<span>{data?.phone}</span>
				</div>
				<div className="flex items-center gap-3">
					<Calendar className="size-4 text-gray-400" />
					<span>Joined on {formattedDate}</span>
				</div>
			</div>

			<hr />
			<div>
				<h3 className="text-[16px] font-medium text-gray-900 text-center mb-4">
					Activity Stats
				</h3>
				<div className="grid grid-cols-2 gap-2 text-center">
					<div className="p-2 bg-gray-50 rounded-lg">
						<BookOpen className="text-gray-500 size-4 mx-auto" />

						<h4 className="text-lg font-semibold text-gray-900">
							{data?._count.bookings}
						</h4>
						<p className="text-xs text-gray-500">Bookings</p>
					</div>
					<div className="p-2 bg-gray-50 rounded-lg">
						<House className="text-gray-500 size-4 mx-auto" />

						<h4 className="text-lg font-semibold text-gray-900">
							{data?._count.hostedProperties}
						</h4>
						<p className="text-xs text-gray-500">Properties</p>
					</div>
				</div>
			</div>
		</Card>
	);
};

export default ProfileSummary;
