import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const formatCurrency = (amount: number) =>
`₦${new Intl.NumberFormat("en-NG").format(amount)}`;

export const checkPasswordStrength = (pwd: string) => {
  let strength = 0;

  if (pwd.length >= 8) strength++;
  if (/[A-Z]/.test(pwd)) strength++;
  if (/[a-z]/.test(pwd)) strength++;
  if (/\d/.test(pwd)) strength++;
  if (/[\W_]/.test(pwd)) strength++; // Special characters

  return strength;
};


export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean) // remove extra spaces
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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