import { zodResolver } from "@hookform/resolvers/zod";
import { AuthOtpSchema } from "@lib/schemas";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Loader2 } from "lucide-react";

type props = {
	onSubmit: (otp: string) => void;
	isLoading: boolean;
	timer: number;
	onResend: () => void;
	isRunning: boolean;
};

const OtpStep = ({
	isLoading,
	onSubmit,
	timer,
	onResend,
	isRunning,
}: props) => {
	const form = useForm<z.infer<typeof AuthOtpSchema>>({
		resolver: zodResolver(AuthOtpSchema),
		defaultValues: {
			otp: "",
		},
		mode: "onChange",
	});

	const onSubmitForm = async (data: { otp: string }) => {
		await onSubmit(data.otp);
	};

	const isResendDisabled = isRunning || isLoading;
	return (
		<motion.div
			initial={{ opacity: 0, x: 40 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -40 }}
			transition={{ duration: 0.4, ease: "easeInOut" }}
			className="mb-2"
		>
			<form onSubmit={form.handleSubmit(onSubmitForm)}>
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
					className="!cursor-pointer w-full mt-1.5 hover:bg-[#F4A857] h-[47px] text-[16px] items-center transition-transform duration-300 transform"
					disabled={isLoading}
					type="submit"
				>
					{isLoading ? (
						<Loader2
							className="animate-spin size-5"
							strokeWidth={3}
						/>
					) : null}
					Continue
				</Button>

				<button
					type="button"
					onClick={onResend}
					disabled={isResendDisabled}
					className="w-full bg-transparent outline-none text-amber-500 font-medium mt-5 !cursor-pointer"
				>
					{timer > 0 ? (
						<span>
							Resend OTP in{" "}
							<span className="font-semibold ml-1">{timer}s</span>
						</span>
					) : (
						"Resend OTP"
					)}
				</button>
			</form>
		</motion.div>
	);
};

export default OtpStep;
