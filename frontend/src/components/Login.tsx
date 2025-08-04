"use client";
import { useForm, Controller } from "react-hook-form";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogInSchema } from "../lib/schemas";
import { Button } from "../components/ui/button";
import Link from "next/link";
import Image from "next/image"
// import apiService from "../lib/apiService";

const LogIn = () => {
	const form = useForm<z.infer<typeof LogInSchema>>({
		resolver: zodResolver(LogInSchema),
		defaultValues: {
			email: "",
			password: "",
		},
		mode: "onChange",
	});

	const onSubmit = (data: z.infer<typeof LogInSchema>) => {
		console.log({ data });
		window.location.href = "/";
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
					Welcome Back to MAR ABU!
				</h1>
				<p className="text-center text-gray-500">
					Login to your account
				</p>
			</div>
			<div>
				<form onSubmit={form.handleSubmit(onSubmit)}>
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
						type="submit"
					>
						Submit
					</Button>
				</form>

				<p className="text-center text-sm mt-5 font-medium">
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
