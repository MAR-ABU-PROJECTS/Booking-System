"use client";
import { useEffect, useState } from "react";
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
import { setSession } from "@lib/action";
import OtpStep from "./OtpStep";
import EmailStep from "./EmailStep";

const LogIn = () => {
	const [step, setStep] = useState<"email" | "otp">("email");
	const [email, setEmail] = useState("");

	const handleNext = () => {
		setStep("otp");
	};

	const router = useRouter();

	const dispatch = useDispatch();

	const verifyEmailMutation = useMutation({
		mutationFn: async (email: string) => {
			const response = await apiService.post("/auth/request-otp", {
				email: email,
				purpose: "login",
			});
			return response;
		},
		onSuccess: async (res, variable) => {
			if (res?.success) {
				const message = res?.message as string;
				toast.success(message, {
					closeOnClick: false,
					progress: undefined,
				});
				setEmail(variable)
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
				const message = error.response?.data?.message as string;
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

	const OtpMutation = useMutation({
		mutationFn: async (otp: string) => {
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
				await setSession({
					email: res.data.user.email,
					id: res.data.user.id,
					name: "",
					rememberMe: true,
					token: res.data.accessToken,
					refreshToken: res.data.refreshToken,
					role: res.data.user.role,
				});
				dispatch(
					setUser({
						email: res.data.user.email,
						id: res.data.user.id,
						isLoggedIn: true,
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
				const message = error.response?.data?.message as string;
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

	const mutateEmail = async (email: string) => {
		verifyEmailMutation.mutate(email);
	};

	const mutateOtp = (otp: string) => {
		OtpMutation.mutate(otp);
	};

	return (
		<div className="w-full max-w-2xl mx-auto pt-8">
			<div className="mt-10 sm:mt-20 mb-10">
				<h1 className="mb-1.5 font-semibold text-3xl md:text-4xl ">
					{step === "email"
						? "	Welcome to MAR ABU Homes."
						: "Verify your email address to continue."}
				</h1>
				<p className=" text-gray-500">
					{step === "email"
						? "Enter your email to sign in."
						: `We sent a verification code to ${email}. Enter this code to continue.`}
				</p>
			</div>
			<div>
				<AnimatePresence mode="wait">
					{step === "email" ? (
						<EmailStep
							isLoading={verifyEmailMutation.isPending}
							onSubmit={mutateEmail}
						/>
					) : (
						<OtpStep
							onSubmit={mutateOtp}
							isLoading={OtpMutation.isPending}
						/>
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
