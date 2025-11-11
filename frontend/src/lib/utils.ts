import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) =>
	`₦${new Intl.NumberFormat("en-NG").format(amount)}`;

export const checkPasswordStrength = (password: string) => {
	let strength = 0;

	if (password.length >= 8) strength++;
	if (/[A-Z]/.test(password)) strength++;
	if (/[a-z]/.test(password)) strength++;
	if (/[0-9]/.test(password)) strength++;
	if (/[^A-Za-z0-9]/.test(password)) strength++;

	return strength;
};

// const calculatePasswordStrength = (password: string) => {
// 	let strength = 0
// 	if (password.length >= 8) strength++
// 	if (/[A-Z]/.test(password)) strength++
// 	if (/[a-z]/.test(password)) strength++
// 	if (/[0-9]/.test(password)) strength++
// 	if (/[^A-Za-z0-9]/.test(password)) strength++

// }

export function toTitleCase(str: string): string {
	return str
		.toLowerCase()
		.split(" ")
		.filter(Boolean) // remove extra spaces
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

export function flattenErrors(errorObj: unknown): string[] {
	if (!errorObj) return [];

	return Object.values(errorObj).flatMap((error) => {
		if (!error) return [];
		if (typeof error === "object" && "message" in error) {
			return [error.message as string];
		}
		if (typeof error === "object") {
			return flattenErrors(error);
		}
		return [];
	});
}

export const getBase64ImageFromUrl = async (url: string): Promise<string> => {
	const res = await fetch(url);
	const blob = await res.blob();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = reject;
		reader.onload = () => resolve(reader.result as string);
		reader.readAsDataURL(blob);
	});
};

export const AUTH_OTP_TIME = 240;




export	const idTypes = [
	{ label: "International passport", value: 'passport' },
	{ label: "Voter's Card", value: "voters_card" },
	{ label: "National Id", value: "national_id"},
	{ label: "Driver's License", value: "drivers_license"},

];