import GuestCounter from "../components/GuestCounter";
import { z } from "zod";
import { useFormContext, Controller } from "react-hook-form";
import { BookSchema } from "../lib/schemas";
import dayjs from "dayjs";
import { formatCurrency } from "../lib/utils";

type Props = {
	price: number;
};
const AvailabilityCalendar = ({ price }: Props) => {
	const { watch, control } = useFormContext<z.infer<typeof BookSchema>>();

	const bookingDate = watch("bookingDate");

	const formattedCheckIn = bookingDate?.from
		? dayjs(bookingDate.from).format("M/D/YYYY")
		: "";
	const formattedCheckOut = bookingDate?.to
		? dayjs(bookingDate.to).format("M/D/YYYY")
		: "";

	const nights =
		bookingDate?.from && bookingDate?.to
			? dayjs(bookingDate.to).diff(dayjs(bookingDate.from), "day")
			: 0;

	const nightsLabel = nights === 1 ? "1 Night" : `${nights} Nights`;

	const ratePerNight = price;

	const totalCost = nights * ratePerNight;
	return (
		<div className="p-5 py-8 md:p-6">
			{totalCost > 0 ? (
				<h3 className="text-[18px]">
					{formatCurrency(totalCost)} for {nightsLabel}
				</h3>
			) : (
				<h3 className="text-[18px]">Add dates to see price</h3>
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
									onChange={field.onChange}
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
									onChange={field.onChange}
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
									onChange={field.onChange}
								/>
							</div>
						)}
					/>
				</div>

				<button
					type="button"
					className="cursor-pointer mt-2 w-full py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-[17px] font-medium"
				>
					Book Now
				</button>
			</div>
		</div>
	);
};

export default AvailabilityCalendar;
