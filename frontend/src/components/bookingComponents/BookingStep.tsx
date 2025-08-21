"use client";
import React from "react";
import { cn } from "@lib/utils";

const BookingStep = ({ activeStep, next, prev }: { activeStep: number, next: ()=> void, prev: ()=> void }) => {
	const HeaderItem = ({
		isActive,
		isCompleted,
		number,
		title,
    action,
	}: {
		isActive: boolean;
		isCompleted: boolean;
		number: string;
		title: string;
    action?: ()=> void;
	}) => (
		<button className="flex flex-row  items-center gap-3 flex-shrink-0 z-[4] bg-white !cursor-pointer" onClick={()=> action?.()}>
			<div className="bg-white w-11 relative z-[3] flex justify-center">
				<div
					className={cn(
						"flex-shrink-0 font-[500] rounded-full text-[15px] w-7 h-7 flex justify-center items-center border-[1px] transition-all",
						isActive
							? "border-[#f7d5b0] text-black "
							: isCompleted
								? "border-[#f7d5b0] bg-amber-400  text-white"
								: "text-[#838383] border-[#838383] bg-white"
					)}
				>
					{number}
				</div>
			</div>

			<h3 className="font-medium leading-tight pr-1.5">{title}</h3>
		</button>
	);

	return (
		<div className="">
			<div className="px-3 border-2 border-[#f7d5b0] max-w-5xl rounded-xl bg-white mx-auto flex  justify-between flex-wrap items-center w-full relative overflow-hidden h-[90px] md:h-[80px]">
				<div className="hidden md:block top-1/2 -translate-y-1/2 w-full h-full md:h-auto z-[1] absolute left-[21px]">
					<div className="h-[2px] bg-[#D9D9D9] w-[85%] mx-auto" />
				</div>

				<HeaderItem
					number={"1"}
					title="Booking Details"
					isActive={activeStep === 1}
					isCompleted={activeStep > 1}
          action={prev}
				/>

				<HeaderItem
					number={"2"}
					title="Booking Summary"
					isActive={activeStep === 2}
					isCompleted={activeStep > 2}
				/>
			</div>
		</div>
	);
};

export default BookingStep;
