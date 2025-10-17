"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiService } from "@lib/apiService";
import { ResetPasswordSchema } from "@lib/schemas";
import { checkPasswordStrength } from "@lib/utils";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ChangeEvent, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import PasswordStrengthChecker from "./PasswordStrengthChecker";
import Link from "next/link";
import { Loader2 } from "lucide-react";

const ResetPassword = ({ token }: { token?: string }) => {
	const form = useForm<z.infer<typeof ResetPasswordSchema>>({
		resolver: zodResolver(ResetPasswordSchema),
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
		mode: "onChange",
	});
	const [passwordStrength, setPasswordStrength] = useState(0);

	const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
		const strength = checkPasswordStrength(e.target.value);
		setPasswordStrength((strength / 5) * 100);
	};

	const mutation = useMutation({
		mutationFn: async (formData: z.infer<typeof ResetPasswordSchema>) => {
			if (!token) {
				throw new Error("Reset token is missing");
			}
			const response = await apiService.post("/auth/reset-password", {
				token: token,
				password: formData.password,
			});
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
					progress: undefined,
				});
			} else {
				toast.error(error.message, {
					closeOnClick: false,
					progress: undefined,
				});
			}
		},
	});

	const onSubmit = (values: z.infer<typeof ResetPasswordSchema>) => {
		if (passwordStrength < 90) {
			form.setError("password", {
				type: "manual",
				message: "password is not strong enough",
			});
			return;
		}
		mutation.mutate(values);
	};


	return (
		<div className="w-full max-w-xl mx-auto pt-8 pb-6">
			<div className="h-[60px] relative">
				<img
					src="/logo/black-logo.png"
					alt="MAR ABU HOMES"
					className="object-contain object-left w-[260px] h-[63px]"
				/>
			</div>
			<div className="mt-18 mb-16">
				<h1 className="mb-1.5 font-semibold text-3xl md:text-4xl text-center">
					Welcome to MAR ABU Homes!
				</h1>
				<p className="text-center text-gray-500">Reset Password</p>
			</div>
			<div>
				<form onSubmit={form.handleSubmit(onSubmit)} className="mb-2">
					<Controller
						control={form.control}
						name="password"
						render={({ field, fieldState }) => (
							<div className="grid w-full items-center gap-1.5 ">
								<Label className="text-base">
									Password
									<span className="text-red-600">*</span>
								</Label>
								<Input
									type="password"
									id="password"
									placeholder="Enter password"
									className="border-2 border-[#f7d5b0] h-[55px] !text-base"
									onChange={(e) => {
										handlePasswordChange(e);
										field.onChange(e);
									}}
								/>

								{fieldState.error && (
									<p className="text-[15px] text-red-600 text-right">
										{fieldState.error.message}
									</p>
								)}
							</div>
						)}
					/>

					<div className=" mt-3 w-full max-w-[300px]">
						<PasswordStrengthChecker
							strength={passwordStrength}
							password={form.getValues("password")}
						/>
					</div>

					<Controller
						control={form.control}
						name="confirmPassword"
						render={({ field, fieldState }) => (
							<div className="grid w-full items-center gap-1.5 mt-4">
								<Label className="text-base">
									Confirm Password
									<span className="text-red-600">*</span>
								</Label>
								<Input
									type="password"
									placeholder="Confirm password"
									className="border-2 border-[#f7d5b0] h-[55px] !text-base"
									onChange={(e) => {
										field.onChange(e);
									}}
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
						className="!cursor-pointer w-full mt-7 hover:bg-[#F4A857] h-[50px] text-[16px] items-center transition-transform duration-300 transform"
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

				<p className="text-center text-[16px] font-medium mt-3 !mb-5">
					Already reset password?{" "}
					<span className="text-amber-500">
						<Link href="/log-in">Log In</Link>
					</span>
				</p>
			</div>
		</div>
	);
};

export default ResetPassword;
