"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Label } from "@components/ui/label";
import { Input } from "@components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogInSchema } from "@lib/schemas";
import { Button } from "@components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useMutation } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setUser } from "@lib/features/authSlice";
import { motion, AnimatePresence } from "framer-motion";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

const LogIn = () => {
	const [step, setStep] = useState(1);

	const handleNext = () => {
		setStep((prev) => prev + 1);
	};

	const form = useForm<z.infer<typeof LogInSchema>>({
		resolver: zodResolver(LogInSchema),
		defaultValues: {
			email: "",
			otp: "",
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

				// await setSession({
				// 	email: res.data.user.email,
				// 	id: res.data.user.id,
				// 	name: `${res.data.user.firstName} ${res.data.user.lastName}`,
				// 	rememberMe: variables.rememberMe,
				// 	token: res.data.accessToken,
				// 	refreshToken: res.data.refreshToken,
				// 	role: res.data.user.role,
				// });
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

	const email = form.watch("email");
	const otp = form.watch("otp");

	const dispatch = useDispatch();

	const verifyEmailMutation = useMutation({
		mutationFn: async (email: string) => {
			const isEmailValid = await form.trigger("email");
			if (!isEmailValid) return;
			const response = await apiService.post("/auth/request-otp", {
				email: email,
				purpose: "login",
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

				handleNext();
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
					const message = error.response?.data?.message as string;
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
	const OtpMutation = useMutation({
		mutationFn: async (otp: string) => {
			const isOtpValid = await form.trigger("otp");
			if (!isOtpValid) return;
			const response = await apiService.post("/auth/verify-otp", {
				email: email,
				otpCode: otp,
				purpose: "login",
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
					const message = error.response?.data?.message as string;
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

	const mutateEmail = () => {
		verifyEmailMutation.mutate(email);
	};
	const mutateOtp = () => {
		OtpMutation.mutate(otp);
	};

	return (
		<div className="w-full max-w-2xl mx-auto pt-8">
			<div className="mt-10 sm:mt-20 mb-10">
				<h1 className="mb-1.5 font-semibold text-3xl md:text-4xl ">
					{step === 1
						? "	Welcome to MAR ABU Homes!."
						: "Verify your email address to continue."}
				</h1>
				<p className=" text-gray-500">
					{step === 1
						? "Enter your email to sign in."
						: `We sent a verification code to ${email}. Enter this code to continue.`}
				</p>
			</div>
			<div>
				<AnimatePresence key={step}>
					{step === 1 && (
						<motion.div
							// initial={{ opacity: 0, x: -40 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -40 }}
							transition={{ duration: 0.4, ease: "easeInOut" }}
						>
							<Controller
								control={form.control}
								name="email"
								render={({ field, fieldState }) => (
									<div className="grid w-full items-center gap-1.5 mb-0.5">
										<Label className="text-base !text-foreground !font-medium">
											Email
											<span className="text-red-600">
												*
											</span>
										</Label>
										<Input
											type="email"
											placeholder="you@example.com"
											className="border-2 border-[#f7d5b0] h-[47px] !text-base bg-white"
											{...field}
										/>

										<p className="text-[14px] text-right min-h-[18px] text-red-600">
											{
												fieldState.error?.message ||
													"\u00A0" /* non-breaking space */
											}
										</p>
									</div>
								)}
							/>

							<Button
								className="!cursor-pointer w-full hover:bg-[#F4A857] h-[47px] text-[16px] items-center transition-transform duration-300 transform"
								disabled={verifyEmailMutation.isPending}
								type="button"
								onClick={() => mutateEmail()}
							>
								{verifyEmailMutation.isPending ? (
									<Loader2
										className="animate-spin size-5"
										strokeWidth={3}
									/>
								) : null}
								Verify Email
							</Button>
						</motion.div>
					)}
					{step === 2 && (
						<motion.div
							initial={{ opacity: 0, x: 40 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -40 }}
							transition={{ duration: 0.4, ease: "easeInOut" }}
							className="mb-2"
						>
							<Controller
								control={form.control}
								name="otp"
								render={({ field, fieldState }) => (
									<div className="grid w-full items-center gap-1.5 ">
										<InputOTP
											maxLength={6}
											pattern={REGEXP_ONLY_DIGITS}
											{...field}
										>
											<InputOTPGroup className="space-x-2">
												<InputOTPSlot index={0} />
												<InputOTPSlot index={1} />
												<InputOTPSlot index={2} />
												<InputOTPSlot index={3} />
												<InputOTPSlot index={4} />
												<InputOTPSlot index={5} />
											</InputOTPGroup>
										</InputOTP>

										<p className="text-[14px] text-right min-h-[18px] text-red-600">
											{
												fieldState.error?.message ||
													"\u00A0" /* non-breaking space */
											}
										</p>
									</div>
								)}
							/>

							<Button
								className="!cursor-pointer w-full hover:bg-[#F4A857] h-[47px] text-[16px] items-center transition-transform duration-300 transform"
								disabled={OtpMutation.isPending}
								type="button"
								onClick={() => mutateOtp()}
							>
								{OtpMutation.isPending ? (
									<Loader2
										className="animate-spin size-5"
										strokeWidth={3}
									/>
								) : null}
								Continue
							</Button>
						</motion.div>
					)}
				</AnimatePresence>

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
