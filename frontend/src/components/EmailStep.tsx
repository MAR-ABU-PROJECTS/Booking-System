import { motion } from "framer-motion";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Input } from "./ui/input";
import { z } from "zod";
import { AuthEmailSchema } from "@lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";

type props = {
	onSubmit: (email: string) => Promise<void>;
	isLoading: boolean;
};
const EmailStep = ({ onSubmit, isLoading }: props) => {
	const form = useForm<z.infer<typeof AuthEmailSchema>>({
		resolver: zodResolver(AuthEmailSchema),
		defaultValues: {
			email: "",
		},
		mode: "onChange",
	});

	const onSubmitForm = async (data: { email: string }) => {
		await onSubmit(data.email);
	};
	return (
		<motion.div
			
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -40 }}
			transition={{ duration: 0.4, ease: "easeInOut" }}
		>
			<form onSubmit={form.handleSubmit(onSubmitForm)}>
				<Controller
					control={form.control}
					name="email"
					render={({ field, fieldState }) => (
						<div className="grid w-full items-center gap-1.5 mb-0.5">
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
					disabled={isLoading}
					type="submit"
				>
					{isLoading ? (
						<Loader2
							className="animate-spin size-5"
							strokeWidth={3}
						/>
					) : null}
					Create Account
				</Button>
			</form>
		</motion.div>
	);
};

export default EmailStep;
