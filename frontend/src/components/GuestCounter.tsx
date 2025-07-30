import { useCallback } from "react";

interface Props {
	title: string;
	subtitle?: string;
	value: number;
	onChange: (value: number) => void;
}

const GuestCounter = ({ title, subtitle, value, onChange }: Props) => {
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
		<div className="flex items-center justify-between">
			<div>
				<p className="font-medium">{title}</p>
				<p className="text-sm text-gray-500">{subtitle}</p>
			</div>
			<div className="flex items-center gap-3">
				<button
					className="cursor-pointer w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
					type="button"
					onClick={reduce}
				>
					-
				</button>
				<span className="w-6 text-center">{value}</span>
				<button
					type="button"
					className="cursor-pointer w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center"
					onClick={Add}
				>
					+
				</button>
			</div>
		</div>
	);
};

export default GuestCounter;
