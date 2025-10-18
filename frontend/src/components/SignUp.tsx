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
		setPasswordStrength((strength / 5) * 100);
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
				toast.error("Unexpected error, please try again", {
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
				<p className="text-center text-gray-500">
					Sign Up to get started
				</p>
			</div>
			<div>
				<form onSubmit={form.handleSubmit(onSubmit)} className="mb-2">
					<Controller
						control={form.control}
						name="firstName"
						render={({ field, fieldState }) => (
							<div className="grid w-full items-center gap-1.5 mb-3.5">
								<Label className="text-base">
									First Name
									<span className="text-red-600">*</span>
								</Label>
								<Input
									type="text"
									placeholder="Enter first name"
									className="border-2 border-[#f7d5b0] h-[55px] !text-base"
									{...field}
								/>

								{fieldState.error && (
									<p className="text-[15px]  text-red-600 text-right">
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
								<Label className="text-base">
									Last Name
									<span className="text-red-600">*</span>
								</Label>
								<Input
									type="text"
									placeholder="Enter last name"
									className="border-2 border-[#f7d5b0] h-[55px] !text-base"
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

					<Controller
						control={form.control}
						name="email"
						render={({ field, fieldState }) => (
							<div className="grid w-full items-center gap-1.5 mb-3.5">
								<Label className="text-base">
									Email
									<span className="text-red-600">*</span>
								</Label>
								<Input
									type="email"
									placeholder="Enter email"
									className="border-2 border-[#f7d5b0] h-[55px] !text-base"
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

					<Controller
						control={form.control}
						name="phone"
						render={({ field, fieldState }) => (
							<div className="grid w-full items-center gap-1.5 mb-3.5">
								<Label className="text-base">
									Phone
									<span className="text-red-600">*</span>
								</Label>
								<Input
									{...field}
									type="tel"
									placeholder="Enter phone number"
									maxLength={11}
									className="border-2 border-[#f7d5b0] h-[55px] !text-base"
									onChange={(e) => {
										const cleaned = e.target.value.replace(
											/\D/g,
											""
										);
										field.onChange(cleaned);
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
					<Button
						className="!cursor-pointer w-full mt-5 hover:bg-[#F4A857] h-[50px] text-[16px] items-center transition-transform duration-300 transform"
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
					Already have an account?{" "}
					<span className="text-amber-500">
						<Link href="/log-in">Log In</Link>
					</span>
				</p>
			</div>
		</div>
	);
};

export default SignUp;
