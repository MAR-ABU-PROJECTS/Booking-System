import { Label } from "@components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@components/ui/select";

type Option = {
	label: string;
	value: string;
};

interface SelectFieldProps {
	
	value: string;
	onChange: (value: string) => void;
	options: Option[];
}

const PaymentMethodSelector = ({

	value,
	onChange,
	options,
}: SelectFieldProps) => {
	return (
		<div className="w-full grid items-center gap-1 mt-3">
			<Label>
				Preferred Payment Method
				<span className="text-red-600">*</span>
			</Label>

			<Select value={value} onValueChange={onChange}>
				<SelectTrigger className="w-full border-2 border-[#f7d5b0]">
					<SelectValue placeholder={'Select Payment Method'} />
				</SelectTrigger>

				<SelectContent>
					<SelectGroup>
						<SelectLabel>Select Payment Method</SelectLabel>
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
};

export default PaymentMethodSelector;
