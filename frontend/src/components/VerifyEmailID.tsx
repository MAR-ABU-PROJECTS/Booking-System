"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@components/ui/button";
import { toast } from "react-toastify";
import { apiService } from "@lib/apiService";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { Check, Loader2, XIcon } from "lucide-react";
import { useEffect } from "react";
import LottiePlayer from "./LottiePlayer";
import Checks from "@public/animations/check.json";

type Props = {
	id: string;
};
const VerifyEmailId = ({ id }: Props) => {
	const router = useRouter();

	const mutation = useMutation({
		mutationFn: async () => {
			const response = await apiService.post("/auth/verify-email", {});
			return response;
		},
		onSuccess: async (res) => {
			if (res?.success) {
				const message = res?.message as string;
				toast.success(message, {
					closeOnClick: false,
					progress: undefined,
				});

				router.push("/");
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

	useEffect(() => {
		mutation.mutate();
	}, []);

	// const getProfile = useQuery({
	// 	queryKey: ["profile"],
	// 	queryFn: async () => {
	// 		try {
	// 			const response = await apiService.get(`/users/profile`);
	// 			return response;
	// 		} catch (error) {
	// 			let errorMessage = "An unexpected error occurred";
	// 			if (isAxiosError(error)) {
	// 				errorMessage = error.response
	// 					? error.response.data.message
	// 					: error.message;
	// 			} else if (error instanceof Error) {
	// 				errorMessage = error.message;
	// 			}
	// 			toast.error(errorMessage, {
	// 				closeOnClick: true,
	// 				progress: undefined,
	// 			});

	// 			throw new Error(errorMessage);
	// 		}
	// 	},

	// });

	return (
		<div className="h-full flex items-center ">
			<div className="mx-auto max-w-xl">
				{mutation.isPending && (
					<div className="text-center">
						<Loader2 className="mx-auto animate-spin text-[#F4A857] size-10 mb-1.5" />
						<h1 className="text-[21px] sm:text-2xl lg:text-3xl font-medium mb-2">
							Verifying your email...
						</h1>
						<p className="text-gray-400">
							please wait while we verify your email address.
						</p>
					</div>
				)}

				<div className="text-center">
					<div className="w-[60px] h-[60px] mb-2 mx-auto">
						<LottiePlayer animationData={Checks} loop={true} />
					</div>
					<h1 className="text-[21px] sm:text-2xl lg:text-3xl font-medium mb-2">
						Email Verified Successfully.
					</h1>
					<p className="text-gray-400">
						Your email has been verified. you will be redirected to
						the home page shortly.
					</p>
				</div>

				<div className="text-center">
					<div className="w-[45px] h-[45px] mb-2 mx-auto bg-red-300 flex justify-center items-center rounded-full">
						<XIcon className="text-red-500" />
					</div>
					<h1 className="text-[21px] sm:text-2xl lg:text-3xl font-medium mb-2">
						Verification Failed.
					</h1>
					<p className="text-gray-400">
						invalid or expired verification token.
					</p>
				</div>
			</div>

			{/* <div className="text-center">
				<div className="mb-3">
					<img
						src={"/mail.png"}
						alt="mail"
						className="w-auto h-[200px] mx-auto"
					/>
				</div>
				<h1 className="text-[21px] sm:text-2xl lg:text-3xl font-medium mb-3">
					Verify your email address
				</h1>
				<h2 className="text-[18px] mb-3">
					You&apos;ve entered{" "}
					<span className="font-semibold">{email} </span>as the email
					address for your account.
				</h2>
				<h3 className="text-[18px]">
					Please verify this email address by clicking the button
					below.
				</h3>

				<Button
					className="!cursor-pointer w-full mt-5 hover:bg-[#F4A857] h-[50px] text-[17px] items-center transition-transform duration-300 transform hover:-translate-y-0.5"
					disabled={mutation.isPending}
					onClick={() => mutation.mutate()}
				>
					{mutation.isPending ? (
						<Loader2
							className="animate-spin size-5"
							strokeWidth={3}
						/>
					) : null}
					Verify your email
				</Button>
			</div> */}
		</div>
	);
};

export default VerifyEmailId;
