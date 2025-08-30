import { Calendar } from "@components/ui/calendar";
import { Label } from "@components/ui/label";
import {
	CalendarMinus2,
	CalendarRange,
	CreditCard,
	MessageSquareMore,
	UserRound,
	Loader2
} from "lucide-react";
import { Button } from "@components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@components/ui/popover";
import { Input } from "@components/ui/input";
import { Textarea } from "@components/ui/textarea";
// import {
// 	Select,
// 	SelectContent,
// 	SelectGroup,
// 	SelectItem,
// 	SelectLabel,
// 	SelectTrigger,
// 	SelectValue,
// } from "@components/ui/select";
import { Checkbox } from "@components/ui/checkbox";
import { Controller, useFormContext } from "react-hook-form";
import { createBookingSchema } from "@lib/schemas";
import { z } from "zod";
import GuestCounterTwo from "@components/GuestCounterTwo";
import { useState } from "react";
import dayjs from "dayjs";

type Props = {
	isSubmitting: boolean;
};
const BookingForm = ({ isSubmitting }: Props) => {
	const { control } = useFormContext<z.infer<typeof createBookingSchema>>();
	const [open, setOpen] = useState(false);
	const [openSec, setOpenSec] = useState(false);

	return (
		<div className="flex flex-col w-full py-[40px] px-[20px] bg-white rounded-xl border-2 border-[#f7d5b0] self-start">
			<div className="flex flex-col justify-center items-center">
				<h1 className="text-[20px] font-bold">
					Complete Your MAR Booking
				</h1>
				<p className="text-[16px] text-[#667085] text-center">
					Secure your premium accommodation experience
				</p>
			</div>
			<hr className="h-px my-[20px] bg-[#f7d5b0] border-0" />
			<div className="flex flex-col gap-[20px]">
				<div className="flex flex-col gap-[5px]">
					<div className="flex gap-[5px] items-center">
						<div className="p-[3px] bg-[#FEF9F3] rounded-md">
							<CalendarRange size={"18px"} />
						</div>
						<p className="text-[18px] font-semibold">
							Booking Details
						</p>
					</div>
					<div className="flex flex-col gap-[30px]">
						<div className="flex w-full items-center gap-[10px]">
							<Controller
								control={control}
								name="checkIn"
								render={({ field, fieldState }) => (
									<div className="flex flex-col w-full gap-1">
										<Label
											htmlFor="date"
											className="px-1 text-[16px] text-black"
										>
											Check-In
										</Label>
										<Popover
											open={open}
											onOpenChange={setOpen}
										>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													id="date"
													className="w-full justify-between font-normal border-[#f7d5b0]"
												>
													{field.value
														? field.value.toLocaleDateString()
														: "Select date"}
													<CalendarMinus2 />
												</Button>
											</PopoverTrigger>
											<PopoverContent
												className="w-auto overflow-hidden p-0"
												align="start"
											>
												<Calendar
													mode="single"
													selected={field.value}
													captionLayout="dropdown"
													disabled={(date) => {
														const today =
															dayjs().startOf(
																"day"
															);
														const selectedDate =
															dayjs(date).startOf(
																"day"
															);
														return selectedDate.isBefore(
															today
														);
													}}
													onSelect={(date) => {
														field.onChange(date);
														setOpen(false);
													}}
												/>
											</PopoverContent>
										</Popover>
										{fieldState.error && (
											<p className="text-sm text-red-600">
												{fieldState.error.message}
											</p>
										)}
									</div>
								)}
							/>

							<Controller
								control={control}
								name="checkOut"
								render={({ field, fieldState }) => (
									<div className="flex flex-col w-full gap-1">
										<Label
											htmlFor="date"
											className="px-1 text-[16px] text-black"
										>
											Check-Out
										</Label>
										<Popover
											open={openSec}
											onOpenChange={setOpenSec}
										>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													id="date"
													className="w-full justify-between font-normal border-[#f7d5b0]"
												>
													{field.value
														? field.value.toLocaleDateString()
														: "Select date"}
													<CalendarMinus2 />
												</Button>
											</PopoverTrigger>
											<PopoverContent
												className="w-auto overflow-hidden p-0"
												align="start"
											>
												<Calendar
													mode="single"
													selected={field.value}
													captionLayout="dropdown"
													disabled={(date) => {
														const today =
															dayjs().startOf(
																"day"
															);
														const selectedDate =
															dayjs(date).startOf(
																"day"
															);
														return selectedDate.isBefore(
															today
														);
													}}
													onSelect={(date) => {
														field.onChange(date);
														setOpenSec(false);
													}}
												/>
											</PopoverContent>
										</Popover>
										{fieldState.error && (
											<p className="text-sm text-red-600">
												{fieldState.error.message}
											</p>
										)}
									</div>
								)}
							/>
						</div>
						<div className="flex flex-col gap-[10px] bg-[#FEF9F3] w-full h-full p-[10px] rounded-xl border-2 border-[#f7d5b0]">
							<p className="text-[16px] font-bold capitalize">
								Number of guests
							</p>
							<div className="flex flex-col lg:grid lg:grid-cols-2 justify-between items-center gap-[20px]">
								<Controller
									control={control}
									name="adults"
									render={({ field, fieldState }) => (
										<div className="flex flex-col gap-1 w-full">
											<GuestCounterTwo
												title="Adults"
												subtitle="Age 18+"
												value={field.value}
												onChange={field.onChange}
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
									control={control}
									name="children"
									render={({ field, fieldState }) => (
										<div className="flex flex-col w-full gap-1">
											<GuestCounterTwo
												title="			Children"
												subtitle="	Age 0 - 17"
												value={field.value}
												onChange={field.onChange}
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
									control={control}
									name="infants"
									render={({ field, fieldState }) => (
										<div className="flex flex-col w-full gap-1">
											<GuestCounterTwo
												title="			Infants"
												subtitle="Under 2"
												value={field.value}
												onChange={field.onChange}
											/>
											{fieldState.error && (
												<p className="text-sm text-red-600">
													{fieldState.error.message}
												</p>
											)}
										</div>
									)}
								/>
							</div>
						</div>
					</div>
				</div>
				<div className="flex flex-col gap-[20px]">
					<div className="flex gap-[5px] items-center">
						<div className="p-[3px] bg-[#FEF9F3] rounded-md">
							<UserRound size={"18px"} />
						</div>
						<p className="text-[18px] font-semibold">
							Guest Information
						</p>
					</div>
					<div className="flex flex-col gap-[20px]">
						<div className="flex items-center gap-[20px] flex-1">
							<Controller
								control={control}
								name="guestName"
								render={({ field, fieldState }) => (
									<div className="grid w-full items-center gap-1">
										<Label>
											Full Name
											<span className="text-red-600">
												*
											</span>
										</Label>
										<Input
											type="text"
											placeholder="Enter Full Name"
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

							{/* <Controller
								control={control}
								name="lastName"
								render={({ field, fieldState }) => (
									<div className="grid w-full max-w-sm items-center gap-1">
										<Label>
											Last Name
											<span className="text-red-600">
												*
											</span>
										</Label>
										<Input
											type="text"
											placeholder="Enter Last Name"
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
						</div>
						<div className="flex justify-between items-center gap-[20px]">
							<Controller
								control={control}
								name="guestEmail"
								render={({ field, fieldState }) => (
									<div className="grid w-full max-w-sm items-center gap-1">
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
								control={control}
								name="guestPhone"
								render={({ field, fieldState }) => (
									<div className="grid w-full max-w-sm items-center gap-1">
										<Label>
											Number
											<span className="text-red-600">
												*
											</span>
										</Label>
										<Input
											type="number"
											placeholder="+234 XXX XXXX XXX"
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
						</div>

						{/* <Controller
							control={control}
							name="address"
							render={({ field, fieldState }) => (
								<div className="flex flex-col w-full gap-1">
									<Label>Address</Label>
									<Input
										type="text"
										placeholder="Complete Address for billing purpose"
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

						{/* <div className="hidden">
							<Controller
								control={control}
								name="idType"
								render={({ field, fieldState }) => (
									<div className="grid w-full items-center gap-1">
										<Label>
											ID Type
											<span className="text-red-600">
												*
											</span>
										</Label>
										<Select
											value={field.value}
											onValueChange={field.onChange}
										>
											<SelectTrigger className="w-[full] border-2 border-[#f7d5b0]">
												<SelectValue placeholder="Select ID Type" />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectItem value="nin">
														National ID
													</SelectItem>
													<SelectItem value="passport">
														International Passport
													</SelectItem>
													<SelectItem value="drivers-license">
														Driver‘s License
													</SelectItem>
													<SelectItem value="voters-card">
														Voter‘s Card
													</SelectItem>
												</SelectGroup>
											</SelectContent>
										</Select>
										{fieldState.error && (
											<p className="text-sm text-red-600">
												{fieldState.error.message}
											</p>
										)}
									</div>
								)}
							/>
						</div> */}

						{/* <Controller
							control={control}
							name="emergencyContact"
							render={({ field, fieldState }) => (
								<div className="flex flex-col w-full gap-1">
									<Label>Emergency Contact</Label>
									<Input
										type="text"
										placeholder="Emergency contact and phone number"
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
					</div>
				</div>
				<div className="flex-col w-full gap-[20px] hidden">
					<div className="flex gap-[5px] items-center">
						<div className="p-[3px] bg-[#FEF9F3] rounded-md">
							<CreditCard size={"18px"} />
						</div>
						<p className="text-[18px] font-semibold">
							Payment Information
						</p>
					</div>
					<div className=" flex-col w-full gap-[20px] hidden">
						{/* <Controller
							control={control}
							name="paymentMethod"
							render={({ field, fieldState }) => (
								<div className="w-full grid items-center gap-1">
									<Label>
										Preferred Payment Method
										<span className="text-red-600">*</span>
									</Label>
									<Select
										value={field.value}
										onValueChange={field.onChange}
									>
										<SelectTrigger className="w-full border-2 border-[#f7d5b0]">
											<SelectValue placeholder="Select Payment Method" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectLabel>
													Select Payment Method
												</SelectLabel>
												<SelectItem value="bank-transfer">
													Bank Transfer
												</SelectItem>
												<SelectItem value="credit-card">
													Credit Card
												</SelectItem>
												<SelectItem value="mobile-money">
													Mobile Money
												</SelectItem>
												<SelectItem value="cash-on-arrival">
													Cash On Arrival
												</SelectItem>
												<SelectItem value="corporate-account">
													Corporate Account
												</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
									{fieldState.error && (
										<p className="text-sm text-red-600">
											{fieldState.error.message}
										</p>
									)}
								</div>
							)}
						/> */}

						{/* <div className="w-full grid items-center gap-1">
							<Label htmlFor="file-upload">
								Upload Payment Receipt
							</Label>
							<label
								htmlFor="file-upload"
								className={`h-[150px] w-full flex flex-col justify-center items-center mx-auto border-2 border-dashed cursor-pointer rounded-xl
                  ${
						fileName !== "No file chosen"
							? "bg-green-100 border-green-500 text-green-700"
							: "bg-[#fef9f3] border-[#f7d5b0] text-[#667085] hover:border-[#F4A857]"
					}`}
							>
								<div>
									{fileName !== "No file chosen" ? (
										<CircleCheckBig className="text-green-600" />
									) : (
										<FileText className="text-[#F4A857]" />
									)}
								</div>
								<p
									className={`font-medium text-center ${fileName !== "No file chosen" ? "text-green-700" : ""}`}
								>
									{fileName !== "No file chosen"
										? "File uploaded successfully!"
										: "Click or drag file to upload"}
								</p>
								<p className="text-[12px] text-[#667085]">
									{fileName === "No file chosen"
										? "Supported formats: JPG, PNG, PDF (Max 5MB)"
										: "Click to change file"}
								</p>
								<input
									id="file-upload"
									type="file"
									className="hidden"
									onChange={handleFileChange}
								/>
								<p
									className={`text-[12px] mt-1 ${fileName !== "No file chosen" ? "text-green-700 font-semibold" : "text-[#667085]"}`}
								>
									{fileName}
								</p>
							</label>
						</div> */}
					</div>
				</div>
				<div className="flex flex-col w-full gap-[20px]">
					<div className="flex gap-[5px] items-center">
						<div className="p-[3px] bg-[#FEF9F3] rounded-md">
							<MessageSquareMore size={"18px"} />
						</div>
						<p className="text-[18px] font-semibold">
							Additional Information
						</p>
					</div>
					<div className="flex flex-col gap-[20px]">
						<Controller
							control={control}
							name="specialRequests"
							render={({ field, fieldState }) => (
								<div className="flex flex-col w-full gap-1">
									<Label>Special Requests or Comments</Label>
									<Textarea
										placeholder="Any special requests, dietary requirement, accessibility needs or comments..."
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

						{/* <div className="flex justify-between items-center gap-[20px]">
							<Controller
								control={control}
								name="arrivalTime"
								render={({ field, fieldState }) => (
									<div className="grid w-full items-center gap-1">
										<Label htmlFor="time-picker">
											Estimated Arrival Time
										</Label>
										<Input
											type="time"
											className="bg-background border-2 border-[#f7d5b0] appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
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
						</div> */}

						<div className="w-full h-full p-[10px] bg-[#fef9f3] border-2 border-[#f7d5b0] rounded-xl">
							<Controller
								name="agree"
								control={control}
								rules={{
									required:
										"You must accept the terms and conditions.",
								}}
								render={({
									field: { value, onChange, ref },
									fieldState,
								}) => (
									<div className="flex items-start md:items-center gap-[10px] flex-wrap">
										<Checkbox
											id="terms"
											checked={value}
											onCheckedChange={onChange}
											ref={ref}
											className="bg-white border-1 border-black"
										/>
										<Label
											htmlFor="terms"
											className="text-[12px] md:text-[14px] text-start"
										>
											<div>
												I agree to the{" "}
												<span className="text-[#F4A857] cursor-pointer hover:underline">
													Terms and Conditions
												</span>{" "}
												and{" "}
												<span className="text-[#F4A857] cursor-pointer hover:underline">
													Privacy Policy
												</span>{" "}
												of MAR ABU PROJECTS SERVICES LLC{" "}
												<span className="text-red-600">
													*
												</span>
											</div>
										</Label>
										{fieldState.error && (
											<p className="text-sm text-red-600 mt-1 block w-full">
												{fieldState.error.message}
											</p>
										)}
									</div>
								)}
							/>
						</div>
					</div>
				</div>
				<hr className="h-px my-[10px] bg-[#f7d5b0] border-0" />
				<Button
					className="!cursor-pointer hover:bg-[#F4A857] py-[22px] text-[16px] items-center transition-transform duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
					disabled={isSubmitting}
					type="submit"
				>
					{isSubmitting ? (
						<Loader2
							className="animate-spin size-5"
							strokeWidth={3}
						/>
					) : null}
					🔒 Complete Secure Booking
				</Button>
			</div>
		</div>
	);
};

export default BookingForm;
