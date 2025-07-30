export type Property = {
  id: number;
  status: string;
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
};



