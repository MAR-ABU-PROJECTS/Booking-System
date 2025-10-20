"use client";
import { useState, ChangeEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { Label } from "@components/ui/label";
import { Input } from "@components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SignUpSchema } from "@lib/schemas";
import { Button } from "@components/ui/button";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { checkPasswordStrength } from "@lib/utils";
import PasswordStrengthChecker from "@components/PasswordStrengthChecker";

const SignUp = () => {
	const form = useForm<z.infer<typeof SignUpSchema>>({
		resolver: zodResolver(SignUpSchema),
		defaultValues: {
			email: "",
			password: "",
			firstName: "",
			lastName: "",
			phone: "",
			role: "CUSTOMER",
		},
		mode: "onChange",
	});
	const [passwordStrength, setPasswordStrength] = useState(0);
	const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
		const strength = checkPasswordStrength(e.target.value);
		setPasswordStrength(Math.min(strength, 4));
	};

	const mutation = useMutation({
		mutationFn: async (formData: z.infer<typeof SignUpSchema>) => {
			const response = await apiService.post("/auth/register", {
				...formData,
			});
			return response;
		},
		onSuccess: async (res) => {
			if (res?.success) {
				const message = res?.message as string;
				toast.success(message, {
					closeOnClick: false,
					progress: undefined,
				});
				form.reset();
				setPasswordStrength(0);
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
				const errorList = error.response?.data?.errors;
				if (Array.isArray(errorList)) {
					errorList.forEach((err) => {
						if (err.path && err.msg) {
							form.setError(err.path, {
								type: "server",
								message: err.msg,
							});
						}
					});
				} else {
					const message =
						(error.response?.data?.message as string) ||
						"Something went wrong";

					toast.error(`${message}`, {
						closeOnClick: false,
						progress: undefined,
					});
				}
			} else {
				toast.error(error.message, {
					closeOnClick: false,
					progress: undefined,
				});
			}
		},
	});

	const onSubmit = (values: z.infer<typeof SignUpSchema>) => {
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
		<div className="w-full max-w-2xl mx-auto pt-8 pb-6">
			{/* <div className="h-[60px] relative flex justisy-start">
				<img
					src="/logo/black-logo.png"
					alt="MAR ABU HOMES"
					className="object-contain object-left w-[260px] h-[63px]"
				/>
			</div> */}
			<div className="mt-18 mb-16">
				<h1 className="mb-1.5 font-semibold text-3xl md:text-4xl ">
					Welcome to MAR ABU Homes!
				</h1>
				<p className=" text-gray-500">
					Create your account to get started
				</p>
			</div>
			<div>
				<form onSubmit={form.handleSubmit(onSubmit)} className="mb-2">
					<div className="grid grid-cols-2 gap-4">
						<Controller
							control={form.control}
							name="firstName"
							render={({ field, fieldState }) => (
								<div className="grid w-full items-center gap-1.5 mb-3.5">
									<Label className="text-base !text-foreground !font-medium">
										First Name
										<span className="text-red-600">*</span>
									</Label>
									<Input
										type="text"
										placeholder="John"
										className="border-2 border-[#f7d5b0] h-[47px] !text-base bg-white"
										{...field}
									/>

									{fieldState.error && (
										<p className="text-[14px]  text-red-600 text-right">
											{fieldState.error.message}
										</p>
									)}
								</div>
							)}
						/>

						<Controller
							control={form.control}
							name="lastName"
							render={({ field, fieldState }) => (
								<div className="grid w-full items-center gap-1.5 mb-3.5">
									<Label className="text-base !text-foreground !font-medium">
										Last Name
										<span className="text-red-600">*</span>
									</Label>
									<Input
										type="text"
										placeholder="Doe"
										className="border-2 border-[#f7d5b0] h-[47px] !text-base bg-white"
										{...field}
									/>

									{fieldState.error && (
										<p className="text-[14px] text-red-600 text-right">
											{fieldState.error.message}
										</p>
									)}
								</div>
							)}
						/>
					</div>

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
									className="border-2 border-[#f7d5b0] h-[47px] !text-base bg-white"
									{...field}
								/>

								{fieldState.error && (
									<p className="text-[14px] text-red-600 text-right">
										{fieldState.error.message}
									</p>
								)}
							</div>
						)}
					/>

					<Controller
						control={form.control}
						name="phone"
						render={({ field, fieldState }) => (
							<div className="grid w-full items-center gap-1.5 mb-3.5">
								<Label className="text-base !text-foreground !font-medium">
									Phone
									<span className="text-red-600">*</span>
								</Label>
								<Input
									{...field}
									type="tel"
									placeholder="080 xxx xxxx"
									maxLength={11}
									className="border-2 border-[#f7d5b0] h-[47px] !text-base bg-white"
									onChange={(e) => {
										const cleaned = e.target.value.replace(
											/\D/g,
											""
										);
										field.onChange(cleaned);
									}}
								/>

								{fieldState.error && (
									<p className="text-[14px] text-red-600 text-right">
										{fieldState.error.message}
									</p>
								)}
							</div>
						)}
					/>

					<Controller
						control={form.control}
						name="password"
						render={({ field, fieldState }) => (
							<div className="grid w-full items-center gap-1.5 ">
								<Label className="text-base !text-foreground !font-medium">
									Password
									<span className="text-red-600">*</span>
								</Label>
								<Input
									{...field}
									type="password"
									id="password"
									placeholder="Enter a strong password"
									className="border-2 border-[#f7d5b0] h-[47px] !text-base bg-white"
									onChange={(e) => {
										handlePasswordChange(e);
										field.onChange(e);
									}}
								/>

								{fieldState.error && (
									<p className="text-[14px] text-red-600 text-right">
										{fieldState.error.message}
									</p>
								)}
							</div>
						)}
					/>
					{form.getValues("password") && (
						<div className=" mt-3 w-full">
							<PasswordStrengthChecker
								strength={passwordStrength}
								password={form.watch("password")}
							/>
						</div>
					)}

					<Button
						className="!cursor-pointer w-full mt-8 hover:bg-[#F4A857] h-[47px] text-[16px] items-center transition-transform duration-300 transform"
						disabled={mutation.isPending}
						type="submit"
					>
						{mutation.isPending ? (
							<Loader2
								className="animate-spin size-5"
								strokeWidth={3}
							/>
						) : null}
						Create Account
					</Button>
				</form>

				<p className="text-center text-[16px] font-normal mt-4 !mb-5 text-muted-foreground">
					Already have an account?{" "}
					<span className="text-amber-500 font-medium">
						<Link href="/log-in">Log In</Link>
					</span>
				</p>
			</div>
		</div>
	);
};

export default SignUp;
