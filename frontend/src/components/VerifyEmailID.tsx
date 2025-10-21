"use client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { apiService } from "@lib/apiService";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Loader2, XIcon } from "lucide-react";
import LottiePlayer from "./LottiePlayer";
import Checks from "@public/animations/check.json";
import { useEffect } from "react";

type Props = {
	id: string;
};
const VerifyEmailId = ({ id }: Props) => {
	const router = useRouter();

	const getStatus = useQuery({
		queryKey: ["verify-email-id"],
		queryFn: async () => {
			const response = await apiService.get(`/auth/verify-email/${id}`);
			return response;
		},
		retry: false,
	});

	useEffect(() => {
		if (getStatus.isError) {
			let errorMessage = "An unexpected error occurred";
			const error = getStatus.error as unknown;

			if (isAxiosError(error)) {
				errorMessage = error.response
					? error.response.data.message
					: error.message;
			} else if (error instanceof Error) {
				errorMessage = error.message;
			}

			toast.error(errorMessage, {
				closeOnClick: true,
				progress: undefined,
			});
		}
	}, [getStatus.isError, getStatus.error]);

	useEffect(() => {
		if (getStatus.data?.success) {
			toast.success(getStatus.data?.message as string, {
				closeOnClick: true,
				progress: undefined,
			});

			const timer = setTimeout(() => {
				router.push("/");
			}, 3000);

			return () => clearTimeout(timer);
		}
	}, [getStatus.data, router]);

	return (
		<div className="h-full flex items-center ">
			<div className="mx-auto max-w-2xl">
				{getStatus.isPending && (
					<div className="text-center">
						<Loader2 className="mx-auto animate-spin text-[#F4A857] size-10 mb-1.5" />
						<h1 className="text-[21px] sm:text-2xl lg:text-3xl font-medium mb-2">
							Verifying your email...
						</h1>
						<p className="text-gray-400">
							Please wait while we verify your email address.
						</p>
					</div>
				)}

				{getStatus.isSuccess && getStatus.data?.success && (
					<div className="text-center">
						<div className="w-[60px] h-[60px] mb-2 mx-auto">
							<LottiePlayer animationData={Checks} loop={false} />
						</div>
						<h1 className="text-[21px] sm:text-2xl lg:text-3xl font-medium mb-2">
							Email Verified Successfully.
						</h1>
						<p className="text-gray-400">
							Your email has been verified. You will be redirected
							to the home page shortly.
						</p>
					</div>
				)}

				{getStatus.isError && (
					<div className="text-center">
						<div className="w-[45px] h-[45px] mb-2 mx-auto bg-red-300 flex justify-center items-center rounded-full">
							<XIcon className="text-red-500" />
						</div>
						<h1 className="text-[21px] sm:text-2xl lg:text-3xl font-medium mb-2">
							Verification Failed.
						</h1>
						<p className="text-gray-400">
							Invalid or expired verification token.
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default VerifyEmailId;
