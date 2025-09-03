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
			ctx.addIssue({
				code: "custom",
				message: "Check-in date must be before check-out date.",
				path: ["stepTwo", "checkin"],
			});
		}
	});

export const createBookingSchema = z
	.object({
		propertyId: z.string(),
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
		adults: z
			.number({
				error: (issue) =>
					issue.input === undefined
						? "Number of adults is required"
						: "Adults must be a number",
			})
			.int("Adults must be a whole number")
			.min(1, "At least 1 adult is required"),
		children: z
			.number({
				error: (issue) =>
					issue.input === undefined
						? "Number of children count is required"
						: "Children must be a number",
			})
			.int("Children must be a whole number")
			.min(0, "number of children cannot be negative"),
		infants: z
			.number({
				error: (issue) =>
					issue.input === undefined
						? "number of Infants is required"
						: "Infants must be a number",
			})
			.int("Infants must be a number")
			.min(0, "number of Infants cannot be negative"),
		guestName: z
			.string({
				error: (issue) =>
					issue.input === undefined
						? "Guest name is required"
						: "Guest name must be a string",
			})
			.min(2, "Guest name is required"),
		guestEmail: z.email({
			error: (issue) =>
				issue.input === undefined
					? "Email address is required"
					: "Invalid email address",
		}),
		guestPhone: z
			.string({
				error: (issue) =>
					issue.input === undefined
						? "Phone number is required"
						: "Phone number must be a string",
			})
			.min(10, "Phone number must be 11 digits"),

		// address: z.string().min(1, "Billing address is required"),
		// idType: z.string().optional(),
		// emergencyContact: z.string().optional(),
		// paymentMethod: z.string().optional(),
		// arrivalTime: z
		//   .string()
		//   .regex(
		//     /^([01]\d|2[0-3]):([0-5]\d)$/,
		//     "Time must be in HH:mm format (24hr)"
		//   )
		//   .optional(),

		agree: z.boolean(),

		specialRequests: z.string().optional(),
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
	id: z.string().min(1, "property id is required"),
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
	adults: z.number().min(1, "At least 1 adult is required"),
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

export const ProfileSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	email: z.email("Invalid email address"),
	phone: z.string().min(10, "Phone number is required"),
	notificationPreferences: z.object({
		email: z.boolean(),
		sms: z.boolean(),
	}),
	avatar: z
		.union([z.string().min(1, "Invalid image URL"), z.instanceof(File), z.null()])
		.optional(),
});
