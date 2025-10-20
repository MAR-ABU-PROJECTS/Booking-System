"use client";
import { useForm, Controller } from "react-hook-form";
import { Label } from "@components/ui/label";
import { Input } from "@components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ForgotPasswordSchema } from "../lib/schemas";
import { Button } from "@components/ui/button";
import { Loader2, ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";
import { useMutation } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import Link from "next/link";

const ForgotPassword = () => {
	const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
		resolver: zodResolver(ForgotPasswordSchema),
		defaultValues: {
			email: "",
		},
		mode: "onChange",
	});

	const mutation = useMutation({
		mutationFn: async (formData: z.infer<typeof ForgotPasswordSchema>) => {
			try {
				const response = await apiService.post(
					"/auth/forgot-password",
					{
						...formData,
					}
				);
				return response;
			} catch (error) {
				if (isAxiosError(error)) {
					console.error(
						"Axios Error:",
						error.response?.data?.message || error.message
					);
					throw error;
				} else {
					console.error("Unexpected Error:", error);
					throw error;
				}
			}
		},
		onSuccess: async (res) => {
			if (res?.success) {
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
				console.error(error.message);
			}
		},
	});

	const onSubmit = (values: z.infer<typeof ForgotPasswordSchema>) => {
		mutation.mutate(values);
	};

	return (
		<div className="w-full max-w-2xl mx-auto pt-8">
			<div className="mt-18 mb-16">
				<h1 className="mb-1.5 font-semibold text-3xl md:text-4xl ">
					Forgot Your Password?
				</h1>
				<p className=" text-gray-500">
					Enter your email address and we&apos;ll send you a link to
					reset your password.
				</p>
			</div>

			<div>
				<form onSubmit={form.handleSubmit(onSubmit)} className="mb-2">
					<Controller
						control={form.control}
						name="email"
						render={({ field, fieldState }) => (
							<div className="grid w-full items-center gap-1.5 mb-3.5">
								<Label className="text-base !text-foreground !font-medium">
									Email
									<span className="text-red-600">*</span>
								</Label>
								<Input
									type="email"
									placeholder="you@example.com"
									className="border-2 border-[#f7d5b0] h-[47px] bg-white !text-base"
									{...field}
								/>

								{fieldState.error && (
									<p className="text-[15px] text-red-600 text-right">
										{fieldState.error.message}
									</p>
								)}
							</div>
						)}
					/>

					<Button
						className="!cursor-pointer w-full mt-3 hover:bg-[#F4A857] h-[47px] text-[16px] items-center transition-transform duration-300 transform hover:-translate-y-0.5"
						disabled={mutation.isPending}
						type="submit"
					>
						{mutation.isPending ? (
							<Loader2
								className="animate-spin size-5"
								strokeWidth={3}
							/>
						) : null}
						Submit
					</Button>
				</form>

				<p className="text-center text-[16px] font-normal mt-4 !mb-5 text-muted-foreground">
					Remember password?{" "}
					<span className="text-amber-500 font-medium">
						<Link href="/log-in">Log In</Link>
					</span>
				</p>
			</div>
		</div>
	);
};

export default ForgotPassword;
