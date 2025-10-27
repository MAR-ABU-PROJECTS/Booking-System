"use client";
import { toast } from "react-toastify";
import { useMutation } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { setSession } from "@lib/action";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setUser } from "@lib/features/authSlice";
import { AnimatePresence } from "framer-motion";
import EmailStep from "@components/EmailStep";
import OtpStep from "@components/OtpStep";
import { useState } from "react";

const AdminLogIn = () => {
	const [step, setStep] = useState<"email" | "otp">("email");
	const [email, setEmail] = useState("");
	const handleNext = () => {
		setStep("otp");
	};
	const router = useRouter();
	const dispatch = useDispatch();

	const verifyEmailMutation = useMutation({
		mutationFn: async (email: string) => {
			const response = await apiService.post("/auth/request-otp?interface=admin", {
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
				setEmail(variable);
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
			const response = await apiService.post(
				"/auth/verify-otp?interface=admin",
				{
					email: email,
					otpCode: otp,
					purpose: "login",
				}
			);
			return response;
		},
		onSuccess: async (res) => {
			if (res?.success) {
				if (
					(res?.data?.user?.role as string).toLowerCase() !== "admin"
				) {
					toast.error("You don't have access to this resource", {
						closeOnClick: false,
						progress: undefined,
					});
					return;
				}

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
				router.push("/dashboard");
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
		<div className="flex justify-center items-start h-svh bg-[#FDF7F1]">
			<div className="w-full max-w-xl mx-auto px-4 pt-14">
				<div className="h-[60px] relative">
					<img
						src="/logo/black-logo.png"
						alt="MAR ABU HOMES"
						className="object-contain object-left w-[260px] h-[63px] mx-auto"
					/>
				</div>
				<div className="mt-10 sm:mt-20 mb-10">
					<h1 className="mb-1.5 font-semibold text-3xl md:text-4xl ">
						{step === "email"
							? "	Welcome to MAR ABU Admin."
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
				</div>
			</div>
		</div>
	);
};

export default AdminLogIn;
