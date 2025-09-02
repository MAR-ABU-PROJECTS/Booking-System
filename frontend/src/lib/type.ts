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
	// BANK_TRANSFER = "BANK_TRANSFER",
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
	propertyId: string;
	userId?: string;
	checkIn: string;
	checkOut: string;
	guests: number;
	totalAmount: number;
	status: BookingStatus;
	createdAt: string;
	updatedAt: string;
	images: string[];
	paymentStatus: PaymentStatus;
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
  emailVerified: string;
  role: string
  status: string
};
