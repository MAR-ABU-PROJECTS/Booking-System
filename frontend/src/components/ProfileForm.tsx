"use client";
import { useEffect, useState } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@components/ui/card";
import { Button } from "@components/ui/button";
import { BellRing, User } from "lucide-react";
import { Label } from "@components/ui/label";
import { Input } from "@components/ui/input";
import { z } from "zod";
import { ProfileSchema } from "@lib/schemas";
import { UserProfile } from "@lib/type";

const ProfileForm = ({ data }: { data: UserProfile }) => {
	const [isEditProfile, setIsEditProfile] = useState(false);
	const form = useForm<z.infer<typeof ProfileSchema>>({
		defaultValues: {
			email: "",
			lastName: "",
			firstName: "",
			phone: "",
			notificationPreferences: {
				email: false,
				sms: false,
			},
			avatar: "",
		},
		mode: "onChange",
	});

	useEffect(() => {
		if (data) {
			form.reset({
				email: data?.email,
				firstName: data?.firstName,
				lastName: data?.lastName,
				phone: data?.phone,
			});
		}
	}, [form, data]);

	const onSubmit = () => {};

	return (
		<section>
			<FormProvider {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<Card className="border-2 border-[#f7d5b0] !pt-0 overflow-hidden mb-5">
						<CardHeader className="bg-orange-50/50 py-5">
							<CardTitle className="!text-[16px] flex items-start">
								{" "}
								<User className=" size-5 !text-orange-600 mr-2" />{" "}
								Personal Information
							</CardTitle>
							<CardDescription className="!text-[15px]">
								Update your account details and personal
								information.
							</CardDescription>
						</CardHeader>
						<fieldset disabled={!isEditProfile}>
							<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6">
								<Controller
									control={form.control}
									name="firstName"
									render={({ field, fieldState }) => (
										<div className="w-full grid items-center gap-1 col-span-2 md:col-span-1">
											<Label>
												First Name
												<span className="text-red-600">
													*
												</span>
											</Label>
											<Input
												placeholder="First Name"
												className="border-2 border-[#f7d5b0]"
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
										<div className="w-full grid items-center gap-1 col-span-2 md:col-span-1">
											<Label>
												Last Name
												<span className="text-red-600">
													*
												</span>
											</Label>
											<Input
												placeholder="Last Name"
												className="border-2 border-[#f7d5b0]"
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
										<div className="grid w-full col-span-2 md:col-span-1 items-center gap-1">
											<Label>
												Email Address
												<span className="text-red-600">
													*
												</span>
											</Label>
											<Input
												type="email"
												placeholder="youremail@example.com"
												className="border-2 border-[#f7d5b0]"
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
										<div className="w-full grid items-center gap-1 col-span-2 md:col-span-1">
											<Label>
												Phone Number
												<span className="text-red-600">
													*
												</span>
											</Label>
											<Input
												placeholder="Phone Number"
												className="border-2 border-[#f7d5b0]"
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

								
							</CardContent>
						</fieldset>

						<CardFooter>
							{isEditProfile ? (
								<div className="flex gap-3">
									<Button>Save Changes</Button>
									<Button
										variant={"destructive"}
										onClick={() => setIsEditProfile(false)}
									>
										Cancel
									</Button>
								</div>
							) : (
								<Button onClick={() => setIsEditProfile(true)}>
									Edit Profile
								</Button>
							)}
						</CardFooter>
					</Card>
					<Card className="border-2 border-[#f7d5b0] !pt-0 overflow-hidden">
						<CardHeader className="bg-orange-50/50 py-5">
							<CardTitle className="!text-[16px] flex items-start">
								{" "}
								<BellRing className=" size-5 !text-orange-600 mr-2" />{" "}
								Notification Information
							</CardTitle>
							<CardDescription className="!text-[15px]">
								How you receive updates, alerts, and
								notifications.
							</CardDescription>
						</CardHeader>
						<fieldset disabled={!isEditProfile}>
							<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6">
								{/* <Controller
									control={form.control}
									name="address"
									render={({ field, fieldState }) => (
										<div className="w-full grid items-center gap-1 col-span-2 md:col-span-1">
											<Label>
												Address
												<span className="text-red-600">
													*
												</span>
											</Label>
											<Input
												placeholder="Address"
												className="border-2 border-[#f7d5b0]"
												{...field}
											/>
											{fieldState.error && (
												<p className="text-sm text-red-600">
													{fieldState.error.message}
												</p>
											)}
										</div>
									)}
								/> */}
							</CardContent>
						</fieldset>

						<CardFooter>
							{isEditProfile ? (
								<div className="flex gap-3">
									<Button>Save Changes</Button>
									<Button
										variant={"destructive"}
										onClick={() => setIsEditProfile(false)}
									>
										Cancel
									</Button>
								</div>
							) : (
								<Button onClick={() => setIsEditProfile(true)}>
									Edit Profile
								</Button>
							)}
						</CardFooter>
					</Card>
				</form>
			</FormProvider>
		</section>
	);
};

export default ProfileForm;
