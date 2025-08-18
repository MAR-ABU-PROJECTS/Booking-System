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
	images: string[]; // optional since not all entries include it
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

export type SummaryData = {
	checkInDate: string;
	checkOutDate: string;
	nights: number;
	adults: number;
	children: number;
	infants: number;
	baseAmount: number;
	serviceFee: number;
	total: number;
	property: {
		name: string;
	};
};

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
	CARD = "CARD",
	BANK_TRANSFER = "BANK_TRANSFER",
	CASH = "CASH",
	STRIPE = "STRIPE",
	PAYSTACK = "PAYSTACK",
	FLUTTERWAVE = "FLUTTERWAVE",
}

export interface Booking {
  id: string
  bookingCode: string
  checkInDate: string
  checkOutDate: string
  nights: number
  adults: number
  children: number
  infants: number

  status: BookingStatus
  paymentStatus: PaymentStatus


  baseAmount: number
  cleaningFee: number
  serviceFee: number
  taxes: number
  discount: number
  total: number
  paidAmount: number
  currency: string

  guestName: string
  guestEmail: string
  guestPhone: string
  guestAddress?: string

  specialRequests?: string
  arrivalTime?: string
  source?: string

  cancellationReason?: string
  cancelledAt?: string
  cancelledBy?: string
  refundAmount?: number

  adminNotes?: string
  approvedBy?: string
  approvedAt?: string
  completedAt?: string
  paidAt?: string

  createdAt: string
  updatedAt: string

  // Relations
  customerId: string
  propertyId: string
  // customer?: User
  // property?: Property
}
