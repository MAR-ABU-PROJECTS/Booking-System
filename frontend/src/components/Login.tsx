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
import { useDispatch } from "react-redux";
import { setUser } from "@lib/features/authSlice";

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
					role: res.data.user.role,
				});
				dispatch(
					setUser({
						email: res.data.user.email,
						id: res.data.user.id,
						isLoggedIn: true,
						name: `${res.data.user.firstName} ${res.data.user.lastName}`,
					})
				);

				setTimeout(() => router.push("/"), 5000);
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

	const onSubmit = (values: z.infer<typeof LogInSchema>) => {
		mutation.mutate(values);
	};
	const dispatch = useDispatch();
	return (
		<div className="w-full max-w-2xl mx-auto pt-8">
			<div className="mt-18 mb-16">
				<h1 className="mb-1.5 font-semibold text-3xl md:text-4xl ">
					Welcome to MAR ABU Homes!
				</h1>
				<p className=" text-gray-500">
					Log into your account to continue.
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
						name="password"
						render={({ field, fieldState }) => (
							<div className="grid w-full items-center gap-1.5  mb-3.5">
								<Label className="text-base !text-foreground !font-medium">
									Password
									<span className="text-red-600">*</span>
								</Label>
								<Input
									type="password"
									id="password"
									placeholder="password"
									className="border-2 border-[#f7d5b0] h-[47px] !text-base bg-white"
									onChange={(e) => {
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
										className="text-[15px] font-medium text-start text-muted-foreground"
									>
										<p>Remember Me</p>
									</Label>
								</div>

								<span className="text-amber-500 font-medium text-[16px]">
									<Link href="/forgot-password">
										Forgot Password
									</Link>
								</span>
							</div>
						)}
					/>

					<Button
						className="!cursor-pointer w-full mt-5 hover:bg-[#F4A857] h-[47px] text-[16px] items-center transition-transform duration-300 transform"
						disabled={mutation.isPending}
						type="submit"
					>
						{mutation.isPending ? (
							<Loader2
								className="animate-spin size-5"
								strokeWidth={3}
							/>
						) : null}
						Continue
					</Button>
				</form>

				<p className="text-center text-[16px] font-normal mt-4 !mb-5 text-muted-foreground">
					Don&apos;t have an account?{" "}
					<span className="text-amber-500 font-medium">
						<Link href="/sign-up">Sign Up</Link>
					</span>
				</p>
			</div>
		</div>
	);
};

export default LogIn;
