'use client';
import {useCallback} from 'react'
import {
	
	Minus,
	Plus,

} from "lucide-react";
interface Props {
	title: string;
	subtitle?: string;
	value: number;
	onChange: (value: number) => void;
} 
const GuestCounterTwo = ({ title, subtitle, value, onChange }: Props) => {

  const reduce = useCallback(() => {
		if (value == 0) {
			return;
		}
		onChange(value - 1);
	}, [value, onChange]);

	const Add = useCallback(() => {
		onChange(value + 1);
	}, [value, onChange]);


	return (
		<div className="flex bg-white w-full h-full p-[10px] rounded-xl border-1 border-[#f7d5b0] justify-between items-center gap-[10px]">
			<div className="flex flex-col">
				<p className="text-[16px] font-bold">{title}</p>
				<p className="text-[14px] text-[#667085]">{subtitle}</p>
			</div>
			<div className="flex justify-center items-center gap-[15px]">
				<div
					className={`p-[3px] rounded-lg ${
						value === 0
							? "bg-gray-300 cursor-not-allowed"
							: "bg-[#F4A857] cursor-pointer"
					}`}
					onClick={reduce}
				>
					<Minus color="#FFF" />
				</div>
				<p className="text-[16px] font-bold">{value}</p>
				<div
					className="p-[3px] rounded-lg bg-[#F4A857] cursor-pointer"
					onClick={Add}
				>
					<Plus color="#FFF" />
				</div>
			</div>
		</div>
	);
};


export default GuestCounterTwo;
