"use client";
import React from "react";
import { cn } from "@lib/utils";

const CompleteBookingStep = ({ activeStep }: { activeStep: number }) => {
	const HeaderItem = ({
		isActive,
		isCompleted,
		number,
		title,
	}: {
		isActive: boolean;
		isCompleted: boolean;
		number: string;
		title: string;
	}) => (
		<button className="flex flex-row  items-center gap-2 flex-shrink-0 z-[4] bg-white !cursor-pointer">
			<div className="bg-white w-11 relative z-[3] flex justify-center">
				<div
					className={cn(
						"flex-shrink-0 font-[500] rounded-full text-[15px] w-7 h-7 flex justify-center items-center border-[1px] transition-all",
						isActive
							? "border-[#f7d5b0] text-black "
							: isCompleted
								? "border-green-200 bg-green-200  text-white"
								: "text-[#838383] border-[#838383] bg-white"
					)}
				>
					{isCompleted ? (
						<svg
							className="h-3.5 w-3.5 text-green-500 dark:text-green-400"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 16 12"
							aria-hidden="true"
						>
							<path
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M1 5.917 5.724 10.5 15 1.5"
							/>
						</svg>
					) : (
						number
					)}
				</div>
			</div>

			<h3
				className={cn(
					"font-medium leading-tight pr-1.5 transition-colors",
					isActive
						? "text-black"
						: isCompleted
							? "text-black"
							: "text-[#838383]"
				)}
			>
				{title}
			</h3>
		</button>
	);

	return (
		<div className="">
			<div className="px-3 border-2 border-[#f7d5b0] max-w-5xl rounded-xl bg-white mx-auto flex  justify-between flex-wrap items-center w-full relative overflow-hidden h-[90px] md:h-[80px]">
				<div className="hidden md:block top-1/2 -translate-y-1/2 w-full h-full md:h-auto z-[1] absolute left-[21px]">
					<div className="h-[2px] bg-[#D9D9D9] w-[75%] mx-auto" />
				</div>

				<HeaderItem
					number={"1"}
					title="Booking Summary"
					isActive={activeStep === 1}
					isCompleted={activeStep > 1}
				/>
				<HeaderItem
					number={"2"}
					title="Payment"
					isActive={activeStep === 2}
					isCompleted={activeStep > 3}
				/>
			</div>

			
		</div>
	);
};

export default CompleteBookingStep;
