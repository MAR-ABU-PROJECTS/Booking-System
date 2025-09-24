export type Property = {
	id: string;
	status?: string;
	desc: string;
	name: string;
	location: string;
	amenities: string[];
	bed: number;
	baths: number;
	roomStatus: "AVAILABLE" | "LIMITED" | "UNAVAILABLE";
	statusColor?: string;
	price: number;
	images: string[];
	latitude?: string;
	longitude?: string;
	isSuperhost?: boolean;
	rating?: number;
	reviews?: number;
	guests: number;
	isNew?: boolean;
	type?: string;
	specials?: string[];
};

// {
//   id: 1,
//   title: "MAR Luxury Penthouse",
//   location: "Victoria Island, Lagos",
//   price: "₦85,000",
//   rating: 4.9,
//   reviews: 127,
//   images: [],
//   bedrooms: 3,
//   bathrooms: 2,
//   guests: 6,
//   isSuperhost: true,
// },

export enum BookingStatus {
	PENDING = "PENDING",
	APPROVED = "APPROVED",
	CONFIRMED = "CONFIRMED",
	CANCELLED = "CANCELLED",
	COMPLETED = "COMPLETED",
	EXPIRED = "EXPIRED",
	REJECTED = "REJECTED",
	CHECKED_IN = "CHECKED_IN",
	CHECKED_OUT = "CHECKED_OUT",
	REFUNDED = "REFUNDED",
}

export enum PaymentStatus {
	PENDING = "PENDING",
	PROCESSING = "PROCESSING",
	PAID = "PAID",
	FAILED = "FAILED",
	REFUNDED = "REFUNDED",
	PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
	PARTIALLY_PAID = "PARTIALLY_PAID",
	EXPIRED = "EXPIRED",
}

export enum PaymentMethod {
	// CARD = "CARD",
	BANK_TRANSFER = "BANK_TRANSFER",
	// CASH = "CASH",
	// STRIPE = "STRIPE",
	PAYSTACK = "PAYSTACK",
	FLUTTERWAVE = "FLUTTERWAVE",
}

export interface Booking {
	id: string;
	bookingCode: string;
	checkInDate: string;
	checkOutDate: string;
	nights: number;
	adults: number;
	children: number;
	infants: number;
	status: BookingStatus;
	paymentStatus: PaymentStatus;
	baseAmount: number;
	cleaningFee: number;
	serviceFee: number;
	taxes: number;
	discount: number;
	total: number;
	paidAmount: number;
	currency: string;
	guestName: string;
	guestEmail: string;
	guestPhone: string;
	guestAddress?: string;

	specialRequests?: string;
	arrivalTime?: string;
	source?: string;

	cancellationReason?: string;
	cancelledAt?: string;
	cancelledBy?: string;
	refundAmount?: number;

	adminNotes?: string;
	approvedBy?: string;
	approvedAt?: string;
	completedAt?: string;
	paidAt?: string;

	createdAt: string;
	updatedAt: string;

	// Relations
	customerId: string;
	propertyId: string;
	// customer?: User
	// property?: Property
	property: {
		name: string;
		type: string;
		city: string;
	};
}

export type SummaryData = {
	id: string;
	bookingCode: string;
	checkInDate: string;
	checkOutDate: string;
	nights: number;
	adults: number;
	children: number;
	infants: number;
	status: BookingStatus | undefined;
	paymentStatus: PaymentStatus | undefined;
	baseAmount: number;
	cleaningFee: number;
	serviceFee: number;
	taxes: number;
	discount: number;
	total: number;
	paidAmount: number;
	currency: string;
	guestName: string;
	guestEmail: string;
	guestPhone: string;
	guestAddress: string | null;
	specialRequests: string | null;
	arrivalTime: string | null;
	source: string | null;
	cancellationReason: string | null;
	cancelledAt: string | null;
	cancelledBy: string | null;
	refundAmount: number | null;
	adminNotes: string | null;
	approvedBy: string | null;
	approvedAt: string | null;
	completedAt: string | null;
	paidAt: string | null;
	createdAt: string;
	updatedAt: string;
	customerId: string;
	propertyId: string;
	property: {
		name: string;
		host: {
			firstName: string;
			lastName: string;
			email: string;
		};
	};
	customer: {
		firstName: string;
		lastName: string;
		email: string;
	};
};

export type BookingCardType = {
	id: string;
	bookingCode: string;
	status: BookingStatus;
	paymentStatus: PaymentStatus;

	// Dates
	checkInDate: string; // ISO date string
	checkOutDate: string; // ISO date string
	createdAt: string;
	updatedAt: string;
	approvedAt: string | null;
	cancelledAt: string | null;
	completedAt: string | null;
	paidAt: string | null;

	// Relations
	customerId: string;
	customer: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		phone: string;
	};
	propertyId: string;
	property: {
		id: string;
		name: string;
		city: string;
		state: string;
		type: string;
	};

	// Guest info
	guestName: string;
	guestEmail: string;
	guestPhone: string;
	guestAddress: string | null;

	// Numbers
	adults: number;
	children: number;
	infants: number;
	nights: number;
	baseAmount: number;
	cleaningFee: number;
	serviceFee: number;
	taxes: number;
	discount: number;
	total: number;
	paidAmount: number;
	refundAmount: number | null;

	// Misc
	currency: string;
	specialRequests: string;
	cancellationReason: string | null;
	source: string | null;
	adminNotes: string | null;
	approvedBy: string | null;
	cancelledBy: string | null;
	arrivalTime: string | null;
};

export type Propert = {
	id: string;
	name: string;
	description: string;
	type: string;
	status: string;
	address: string;
	city: string;
	state: string;
	country: string;
	zipCode: string | null;
	latitude: number | null;
	longitude: number | null;
	bedrooms: number;
	bathrooms: number;
	size: number;
	floor: number | null;
	maxGuests: number;
	minStay: number;
	maxStay: number;
	baseRate: number;
	cleaningFee: number;
	securityDeposit: number;
	serviceFee: number;
	weekendPremium: number;
	monthlyDiscount: number;
	averageRating: number;
	reviewCount: number;
	bookingCount: number;
	buildingName: string | null;
	featuredImage: string | null;
	images: string[];
	amenities: string[];
	features: string[];
	rules: string[];
	houseRules: string | null;
	cancellationPolicy: string | null;
	adminNotes: string | null;
	checkInTime: string;
	checkOutTime: string;
	currency: string;
	isActive: boolean;
	hostId: string;
	host: {
		id: string;
		firstName: string;
		lastName: string;
		avatar: string | null;
	};
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	_count: {
		reviews: number;
		bookings: number;
	};
};

export type UserProfile = {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	emailVerified: string | null;
	phone: string;
	avatar: string | null;
	address: string;
	role: string;
	status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
	notificationPreferences: {
		email: boolean;
		sms: boolean;
	};
	createdAt: string;
	updatedAt: string;
	_count: {
		bookings: number;
		hostedProperties: number;
		reviews: number;
	};
};

export type ErrorComponentType = (
	error: unknown,
	refetch: () => void,
	isFetching: boolean
) => React.ReactNode;

export type PaymentType = {
	id: string;
	userId: string;
	bookingId: string;
	amount: number;
	currency: string;
	method: PaymentMethod;
	status: PaymentStatus;
	reference: string;
	transactionId: string;
	receiptUploaded: boolean;
	receiptUrl: string | null;
	receiptVerified: boolean;
	refundAmount: number | null;
	refundStatus: "NONE" | "REQUESTED" | "COMPLETED" | "FAILED";
	refundRequestedAt: string | null;
	refundCompletedAt: string | null;
	refundFailedReason: string | null;
	paidAt: string | null;
	failedAt: string | null;
	verifiedAt: string | null;
	verifiedBy: string | null;
	createdAt: string;
	updatedAt: string;
	adminNotes: string | null;
	gatewayResponse: {
		bank_details: {
			bank_name: string;
			account_name: string;
			account_number: string;
		};
		instructions: string[];
		payment_url: string | null;
	};
};

export type Users = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: string;
	status: 'ACTIVE' | 'PENDING_VERIFICATION';
};


export type User = {
  address: string;
  avatar: string;
  bio: string | null;
  bookings: Booking[];
  city: string | null;
  country: string;
  createdAt: string;
  dateOfBirth: string | null;
  deletedAt: string | null;
  email: string;
  emailVerified: string;
  firstName: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
  hostedProperties: any[];
  id: string;
  idNumber: string | null;
  idType: string | null;
  identityVerified: boolean | null;
  lastLoginAt: string;
  lastName: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
  notificationPreferences: any | null;
  password: string;
  phone: string;
  phoneVerified: boolean | null;
  resetToken: string | null;
  resetTokenExpiry: string | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
  reviews: any[];
  role: string;
  state: string | null;
  status: string;
  updatedAt: string;
  verificationToken: string | null;
  verificationTokenExpiry: string | null;
};


export type DashboardData = {
  bookings: {
    approved: number
    cancelled: number
    completed: number
    pending: number
    revenue: number
    total: number
  }
  pendingReviews: number
  properties: {
    byStatus: {
      active: number
    }
    total: number
  }
  recentBookings: Booking[]
  revenue: {
    count: number
    serviceFees: number
    total: number
  }
  users: {
    byRole: {
      admin: number
      customer: number
    }
    total: number
  }
}