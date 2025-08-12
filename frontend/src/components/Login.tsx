"use client";
import { useForm, Controller } from "react-hook-form";
import { Label } from "@components/ui/label";
import { Input } from "@components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogInSchema } from "@lib/schemas";
import { Button } from "@components/ui/button";
import { Checkbox } from "@components/ui/checkbox";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useMutation } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { setSession } from "@lib/action";
import { useRouter } from "next/navigation";

const LogIn = () => {
	const form = useForm<z.infer<typeof LogInSchema>>({
		resolver: zodResolver(LogInSchema),
		defaultValues: {
			email: "",
			password: "",
			rememberMe: false,
		},
		mode: "onChange",
	});
	const router = useRouter();
	const mutation = useMutation({
		mutationFn: async (formData: z.infer<typeof LogInSchema>) => {
			const response = await apiService.post("/auth/login", {
				...formData,
			});
			return response;
		},
		onSuccess: async (res, variables) => {
			if (res?.success) {
				const message = res?.message as string;
				toast.success(message, {
					closeOnClick: false,
					progress: undefined,
				});

				await setSession({
					email: res.data.user.email,
					id: res.data.user.id,
					name: `${res.data.user.firstName} ${res.data.user.lastName}`,
					rememberMe: variables.rememberMe,
					token: res.data.accessToken,
					refreshToken: res.data.refreshToken,
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
				console.error("Non-Axios Error:", error);
			}
		},
	});

	const onSubmit = (values: z.infer<typeof LogInSchema>) => {
		mutation.mutate(values);
	};

	return (
		<div className="w-full max-w-xl mx-auto pt-8">
			<div className="h-[60px] relative">
				<img
					src="/logo/black-logo.png"
					alt="MAR ABU HOMES"
					className="object-contain object-left w-[260px] h-[63px]"
				/>
			</div>
			<div className="mt-18 mb-16">
				<h1 className="mb-1.5 font-semibold text-3xl md:text-4xl text-center">
					Welcome Back to MAR ABU Homes!
				</h1>
				<p className="text-center text-gray-500">
					Login to your account
				</p>
			</div>

			<div>
				<form onSubmit={form.handleSubmit(onSubmit)} className="mb-2">
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
						name="password"
						render={({ field, fieldState }) => (
							<div className="grid w-full items-center gap-1.5  mb-3.5">
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

					<Controller
						name="rememberMe"
						control={form.control}
						render={({ field: { value, onChange, ref } }) => (
							<div className="flex justify-between items-center">
								<div className="flex items-start gap-[10px]">
									<Checkbox
										checked={value}
										onCheckedChange={onChange}
										ref={ref}
										className="bg-white border-1 border-black cursor-pointer"
									/>
									<Label
										htmlFor="terms"
										className="text-[15px] md:text-[14px] text-start"
									>
										<p>Remember Me</p>
									</Label>
								</div>

								<span className="text-amber-500 text:bg-[#F4A857]">
									<Link href="/forgot-password">
										Forgot Password
									</Link>
								</span>
							</div>
						)}
					/>

					<Button
						className="!cursor-pointer w-full mt-5 hover:bg-[#F4A857] h-[50px] text-[16px] items-center transition-transform duration-300 transform hover:-translate-y-0.5"
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

				<p className="text-center text-[15px] font-medium mt-3 mb-5 ">
					Don&apos;t have an account yet?{" "}
					<span className="text-amber-500 text:bg-[#F4A857]">
						<Link href="/sign-up">Sign Up</Link>
					</span>
				</p>
			</div>
		</div>
	);
};

export default LogIn;
