import GuestCounter from "@components/GuestCounter";
import { z } from "zod";
import { useFormContext, Controller } from "react-hook-form";
import { BookSchema } from "@lib/schemas";
import dayjs from "dayjs";
import { useDispatch } from "react-redux";
import { updateBooking } from "@lib/features/bookingSlice";
import { Button } from "./ui/button";
import { flattenErrors } from "@lib/utils";

const AvailabilityCalendar = () => {
	const { watch, control, formState } =
		useFormContext<z.infer<typeof BookSchema>>();
	const dispatch = useDispatch();
	const bookingDate = watch("bookingDate");

	const formattedCheckIn = bookingDate?.from
		? dayjs(bookingDate.from).format("M/D/YYYY")
		: "";
	const formattedCheckOut = bookingDate?.to
		? dayjs(bookingDate.to).format("M/D/YYYY")
		: "";

	const nights =
		bookingDate?.from && bookingDate?.to
			? dayjs(bookingDate.to).startOf('day').diff(dayjs(bookingDate.from).startOf('day'), "day")
			: 0;
	const nightsLabel = nights === 1 ? "1 Night" : `${nights} Nights`;

	const allErrorMessages = flattenErrors(formState.errors);

	return (
		<div className="p-5 py-8 md:p-6 h-auto">
			{nights > 0 ? (
				<h3 className="text-[18px]">{nightsLabel}</h3>
			) : (
				<h3 className="text-[18px]">Add dates to see duration</h3>
			)}
			<div className="flex flex-col mt-5 gap-3">
				<div className="flex justify-between items-center">
					<h4 className="text-[14px]">CHECK-IN</h4>
					<p className="text-[14px]">{formattedCheckIn}</p>
				</div>
				<div className="flex justify-between items-center">
					<h4 className="text-[14px]">CHECK-OUT</h4>
					<p className="text-[14px]">{formattedCheckOut}</p>
				</div>

				<div className="flex flex-col gap-5 mt-4">
					<Controller
						control={control}
						name="adults"
						render={({ field }) => (
							<div className="w-full">
								<GuestCounter
									title="Adults"
									subtitle="Ages 13 or above"
									value={field.value}
									onChange={(val) => {
										field.onChange(val);
										dispatch(
											updateBooking({
												key: "adults",
												value: val,
											})
										);
									}}
								/>
							</div>
						)}
					/>
					<Controller
						control={control}
						name="children"
						render={({ field }) => (
							<div className="flex flex-col gap-1 w-full">
								<GuestCounter
									title="Children"
									subtitle="Ages 2-12"
									value={field.value}
									onChange={(val) => {
										field.onChange(val);
										dispatch(
											updateBooking({
												key: "children",
												value: val,
											})
										);
									}}
								/>
							</div>
						)}
					/>
					<Controller
						control={control}
						name="infants"
						render={({ field }) => (
							<div className="flex flex-col gap-1 w-full">
								<GuestCounter
									title="Infants"
									subtitle="Under 2"
									value={field.value}
									onChange={(val) => {
										field.onChange(val);
										dispatch(
											updateBooking({
												key: "infants",
												value: val,
											})
										);
									}}
								/>
							</div>
						)}
					/>
				</div>

				<div className="flex">
					{allErrorMessages.length > 0 && (
						<ul className="space-y-1 text-left pb-2">
							{allErrorMessages.map((msg, idx) => (
								<li
									key={idx}
									className="text-[14px] text-red-600"
								>
									{msg}
								</li>
							))}
						</ul>
					)}
				</div>

				<Button type="submit" className="!mt-2 text-[17px] h-[45px]">
					Book Now
				</Button>
			</div>
		</div>
	);
};

export default AvailabilityCalendar;
