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