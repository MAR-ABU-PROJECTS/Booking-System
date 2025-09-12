"use client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@components/ui/button";
import { toast } from "react-toastify";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import Link from "next/link";

type Props = {
	email: string;
};
const VerifyEmail = ({ email }: Props) => {

	
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

				// router.push("/");
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
		<div className="h-full flex items-center ">
			<div className="text-center mx-auto max-w-xl">
				<div className="mb-3">
					<img
						src={"/mail.png"}
						alt="mail"
						className="w-auto h-[180px] mx-auto"
					/>
				</div>
				<h1 className="text-[21px] sm:text-2xl  font-bold mb-3">
					Verify your email address
				</h1>
				<h2 className="text-[18px] mb-3">
					We&apos;ve sent a verification link to{" "}
					<span className="font-semibold">{email}</span>. <br />
					Please check your email and click the verification link to
					activate your account.
				</h2>

				<div>
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
						Resend Verification Link
					</Button>
					<Button
						className="!cursor-pointer w-full mt-2 hover:bg-[#F4A857] h-[50px] text-[17px] items-center transition-transform duration-300 transform hover:-translate-y-0.5"
						asChild
					>
						<Link href={"/"}>Get Started</Link>
					</Button>
				</div>
			</div>
		</div>
	);
};

export default VerifyEmail;
