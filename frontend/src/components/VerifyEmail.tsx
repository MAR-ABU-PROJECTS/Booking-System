"use client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@components/ui/button";
import { toast } from "react-toastify";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { ArrowRight, Mail, RotateCcw } from "lucide-react";
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
				});
			} else {
				const message = res?.message as string;
				toast.success(message, {
					closeOnClick: false,
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
				});
			} else {
				toast.error(error.message, {
					closeOnClick: false,
				});
			}
		},
	});

	return (
		<div className="w-full h-full max-w-2xl mx-auto pt-8 pb-6 flex items-center justify-center">
			<div className="w-full">
				<div className="mb-8 flex justify-center">
					<div className="relative">
						<div className="absolute inset-0 bg-accent/10 rounded-full blur-xl animate-pulse"></div>
						<div className="relative w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
							<div className="w-20 h-20 bg-primary/30 rounded-full flex items-center justify-center">
								<Mail
									className="w-10 h-10 text-primary"
									strokeWidth={1.5}
								/>
							</div>
						</div>
					</div>
				</div>

				<h1 className="text-3xl sm:text-4xl font-semibold text-foreground mb-2 text-balance text-center">
					Verify your email address
				</h1>
				<p className="text-base text-muted-foreground mb-2 leading-relaxed text-center">
					We&apos;ve sent a verification link to{" "}
					<span className="font-medium">{email}</span>.
				</p>
				<p className="text-base text-muted-foreground leading-relaxed text-center">
					Please check your inbox and click the link to activate your
					account.
				</p>

				<div className="bg-primary/10 border border-border rounded-xl p-6 mb-8 mt-12">
					<div className="flex gap-3">
						<div className="flex-shrink-0 mt-0.5">
							<div className="flex items-center justify-center h-5 w-5 rounded-full bg-red-400">
								<span className="text-xs font-bold text-black">
									!
								</span>
							</div>
						</div>
						<div className="text-left">
							<p className="text-[16px] font-medium text-muted-foreground mb-1">
								Didn&apos;t receive the email?
							</p>
							<p className="text-[16px] text-muted-foreground font-medium">
								Check your spam folder or request a new
								verification link below.
							</p>
						</div>
					</div>
				</div>

				<div className="space-y-3 mb-8">
					<Button
						disabled={mutation.isPending}
						onClick={() => mutation.mutate()}
						className="w-full h-[47px] text-[16px] text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
					>
						{mutation.isPending ? (
							<>
								<RotateCcw className="w-4 h-4 animate-spin" />
								Sending...
							</>
						) : (
							<>
								<RotateCcw className="w-4 h-4" />
								Resend Verification Link
							</>
						)}
					</Button>

					<Button
						variant="outline"
						className="h-[47px] text-[16px] w-full  hover:bg-primary hover:text-white rounded-lg font-medium flex items-center justify-center gap-2 bg-transparent border-primary"
						asChild
					>
						<Link href={"/"}>
							Get Started
							<ArrowRight className="w-4 h-4" />
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
};

export default VerifyEmail;
