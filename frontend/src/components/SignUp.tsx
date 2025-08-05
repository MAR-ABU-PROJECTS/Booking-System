"use client";
import { useForm, Controller } from "react-hook-form";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SignUpSchema } from "../lib/schemas";
import { Button } from "../components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { apiService } from "../lib/apiService";
import { isAxiosError } from "axios";
import { Loader2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";

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

	const mutation = useMutation({
		mutationFn: async (formData: z.infer<typeof SignUpSchema>) => {
			try {
				const response = await apiService.post("/auth/register", {
					...formData,
				});
				console.log(response);
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

		onSuccess: (res) => {
			if (res?.success) {
			}
			console.log("Registration successful:", res);
			console.log({ res });
		},

		onError: (error) => {
			if (isAxiosError(error)) {
				const message =
					(error.response?.data?.message as string) ||
					"Something went wrong";
				console.error("Handled in onError:", message);
				toast.error(`${message}`, {
					closeOnClick: false,

					progress: undefined,
				});
			} else {
				console.error("Non-Axios Error:", error);
			}
		},
	});

	const onSubmit = (values: z.infer<typeof SignUpSchema>) => {
		mutation.mutate(values);
	};
	return (
		<div className="w-full max-w-xl mx-auto">
			<div className="mb-6">
				<Image
					src="/logo/black-logo.png"
					alt="MAR ABU HOMES"
					className="h-8 md:h-10 mx-auto mb-5"
					height={32}
					width={130}
				/>
				<h1 className="mb-1 font-semibold text-3xl md:text-4xl text-center">
					Welcome to MAR ABU!
				</h1>
				<p className="text-center text-gray-500">
					Sign Up to get started
				</p>
			</div>
			<div>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<Controller
						control={form.control}
						name="firstName"
						render={({ field, fieldState }) => (
							<div className="grid w-full items-center gap-1.5 mb-5">
								<Label>
									First Name
									<span className="text-red-600">*</span>
								</Label>
								<Input
									type="text"
									placeholder="Enter first name"
									className="border-2 border-[#f7d5b0] h-[50px]"
									{...field}
								/>

								{fieldState.error && (
									<p className="text-sm text-red-600">
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
							<div className="grid w-full items-center gap-1.5 mb-5">
								<Label>
									Last Name
									<span className="text-red-600">*</span>
								</Label>
								<Input
									type="text"
									placeholder="Enter last name"
									className="border-2 border-[#f7d5b0] h-[50px]"
									{...field}
								/>

								{fieldState.error && (
									<p className="text-sm text-red-600">
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
							<div className="grid w-full items-center gap-1.5 mb-5">
								<Label>
									Email
									<span className="text-red-600">*</span>
								</Label>
								<Input
									type="email"
									placeholder="Enter email"
									className="border-2 border-[#f7d5b0] h-[50px]"
									{...field}
								/>

								{fieldState.error && (
									<p className="text-sm text-red-600">
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
							<div className="grid w-full items-center gap-1.5 mb-5">
								<Label>
									Phone
									<span className="text-red-600">*</span>
								</Label>
								<Input
									type="tel"
									placeholder="Enter phone number"
									className="border-2 border-[#f7d5b0] h-[50px]"
									{...field}
								/>

								{fieldState.error && (
									<p className="text-sm text-red-600">
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
							<div className="grid w-full items-center gap-1.5">
								<Label>
									Password
									<span className="text-red-600">*</span>
								</Label>
								<Input
									type="password"
									id="password"
									placeholder="Enter password"
									className="border-2 border-[#f7d5b0] h-[50px]"
									{...field}
								/>

								{fieldState.error && (
									<p className="text-sm text-red-600">
										{fieldState.error.message}
									</p>
								)}
							</div>
						)}
					/>

					<Button
						className="!cursor-pointer w-full mt-8 hover:bg-[#F4A857] h-[50px] text-[16px] items-center transition-transform duration-300 transform hover:-translate-y-0.5"
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

				<p className="text-center text-sm mt-5 font-medium">
					Already have an account?{" "}
					<span className="text-amber-500 text:bg-[#F4A857]">
						<Link href="/log-in">Log In</Link>
					</span>
				</p>
			</div>
		</div>
	);
};

export default SignUp;
