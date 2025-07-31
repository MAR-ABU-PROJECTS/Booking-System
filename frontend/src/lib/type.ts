export type Property = {
	id: number;
	status?: string;
	desc: string;
	name: string;
	location: string;
	amenities: string[];
	bed: number;
	baths: number;
	roomStatus: "AVAILABLE" | "LIMITED" | "UNAVAILABLE";
	statusColor: string;
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
