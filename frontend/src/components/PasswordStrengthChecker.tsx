import { Check} from "lucide-react";
import React from "react";

type Props = {
	strength: number;
	password: string;
};

const PasswordStrengthChecker = (props: Props) => {
	const requirements = [
		{ label: "At least 8 characters", met: props.password.length >= 8 },
		{
			label: "At least 1 uppercase letter",
			met: /[A-Z]/.test(props.password),
		},
		{
			label: "At least 1 lowercase letter",
			met: /[a-z]/.test(props.password),
		},
		{ label: "At least 1 number", met: /[0-9]/.test(props.password) },
		{
			label: "At least 1 special character",
			met: /[^A-Za-z0-9]/.test(props.password),
		},
	];

	const getStrengthColor = () => {
		const colors = [
			"",
			"bg-red-500",
			"bg-orange-500",
			"bg-yellow-500",
			"bg-green-500",
		];
		return colors[props.strength];
	};

	const getStrengthLabel = () => {
		const labels = ["", "Weak", "Fair", "Good", "Strong"];
		return labels[props.strength];
	};
	return (
		<div>
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-muted-foreground">
						Password strength
					</span>
					<span className="text-sm font-medium text-foreground">
						{getStrengthLabel()}
					</span>
				</div>
				<div className="flex gap-1">
					{[...Array(4)].map((_, i) => (
						<div
							key={i}
							className={`h-1 flex-1 rounded-full transition-colors ${
								i < props.strength
									? getStrengthColor()
									: "bg-border"
							}`}
						/>
					))}
				</div>
				<ul className="space-y-2">
					{requirements.map((req, idx) => (
						<li
							key={idx}
							className="flex items-center gap-2 text-sm text-muted-foreground"
						>
							<div
								className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
									req.met ? "bg-green-500/20" : "bg-border"
								}`}
							>
								{req.met && (
									<Check
										size={12}
										className="text-green-600"
									/>
								)}
							</div>
							{req.label}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
};

export default PasswordStrengthChecker;
