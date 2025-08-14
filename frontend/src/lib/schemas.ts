import { z } from "zod";

export const homePageBookingSchema = z
	.object({
		stepOne: z.object({
			id: z.string().refine((val) => val.trim().length > 0, {
				message: "",
			}),
			location: z.string().min(1, "please select location"),
			name: z.string().refine((val) => val.trim().length > 0, {
				message: "",
			}),
		}),
		stepTwo: z.object({
			checkin: z
				.date({
					error: (issue) =>
						issue.input === undefined
							? "Please select a check-in date"
							: "Invalid check-in date",
				})
				.default(new Date()),
		}),
		stepThree: z.object({
			checkout: z.date({
				error: (issue) =>
					issue.input === undefined
						? "Please select a check-out date"
						: "Invalid check-out date",
			}),
		}),
		stepFour: z.object({
			Guests: z.object({
				adults: z.number().min(1, "Atleast 1 adult"),
				children: z.number().min(0),
				infants: z.number().min(0),
			}),
		}),
	})
	.superRefine((data, ctx) => {
		if (data.stepThree.checkout <= data.stepTwo.checkin) {
			ctx.addIssue({
				code: "custom",
				message: "Check-out date must be after check-in date.",
				path: ["stepThree", "checkout"],
			});
		}
	});

export const bookingDetailsSchema = z
	.object({
		checkIn: z.date({
			error: (issue) =>
				issue.input === undefined
					? "Please select a check-in date"
					: "Invalid check-in date",
		}),
		checkOut: z.date({
			error: (issue) =>
				issue.input === undefined
					? "Please select a check-out date"
					: "Invalid check-out date",
		}),
		adults: z.number().min(1, "At least 1 adult is required"),
		children: z.number().min(0),
		infants: z.number().min(0),
		firstName: z.string().min(1, "First name is required"),
		lastName: z.string().min(1, "Last name is required"),
		guestEmail: z
			.string()
			.min(1, "email address is required")
			.email("Invalid email address"),
		guestPhone: z.string().min(10, "Phone number is required"),
		address: z.string().min(1, "Billing address is required"),
		idType: z.string().min(1, "Select an ID type"),
		idNumber: z.string().min(1, "Enter your ID number"),
		emergencyContact: z.string().min(1, "Emergency contact is required"),
		paymentMethod: z.string().min(1, "Select a payment method"),
		additionalInfo: z.string().optional(),
		arrivalTime: z
			.string()
			.regex(
				/^([01]\d|2[0-3]):([0-5]\d)$/,
				"Time must be in HH:mm format (24hr)"
			),
		purpose: z.string().min(1, "Please select a purpose"),
		agree: z.boolean(),
	})
	.superRefine((data, ctx) => {
		if (!data.agree) {
			ctx.addIssue({
				code: "custom",
				message: "Please agree to the terms to continue.",
				path: ["agree"],
			});
		}
		if (data.checkOut <= data.checkIn) {
			ctx.addIssue({
				code: "custom",
				message: "Check-out date must be after check-in date.",
				path: ["checkOut"],
			});
		}
	});

export const BookSchema = z.object({
	bookingDate: z
		.object({
			from: z.date({
				error: (issue) =>
					issue.input === undefined
						? "Please select a check-in date"
						: "Invalid check-in date",
			}),
			to: z.date({
				error: (issue) =>
					issue.input === undefined
						? "Please select a check-out date"
						: "Invalid check-out date",
			}),
		})
		.refine((data) => data.to > data.from, {
			message: "check-out must be after check-in date",
			path: ["to"],
		}),
	adults: z.number().min(1, "Atleast 1 adult"),
	children: z.number().min(0),
	infants: z.number().min(0),
});

export const SignUpSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	email: z.email("Invalid email address"),
	phone: z.string().min(10, "Phone number is required"),
	password: z.string().min(1, "Password is required"),
	role: z.string().min(1, "role is required"),
});

export const LogInSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
	rememberMe: z.boolean(),
});

export const ForgotPasswordSchema = z.object({
	email: z.email("Invalid email address"),
});
