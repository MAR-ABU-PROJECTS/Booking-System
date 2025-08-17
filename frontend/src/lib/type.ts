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
  isNew?:boolean;
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
	property:{
		name:string
	}
};