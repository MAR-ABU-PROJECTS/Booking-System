"use client";
import { Bath, Bed, MapPin } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { motion } from "framer-motion";

const PropertiesCard = () => {
  const cardContent = [
    {
      id: 1,
      status: "Premium",
      desc: "Exquisite penthouse with panoramic Lagos lagoon views and premium finishes",
      name: "MAR Luxury Penthouse - Victoria Island",
      location: "Victoria Island, Lagos",
      amenities: ["Ocean View", "Concierge", "Gym"],
      bed: 4,
      baths: 5,
      roomStatus: "AVAILABLE",
      statusColor: "#12B76A",
      amount: "₦285,000",
    },
    {
      id: 2,
      status: "Executive",
      desc: "Sophisticated executive suites with contemporary design and premium amenities",
      name: "MAR Executive Suites - Ikoyi Heights",
      location: "Ikoyi, Lagos",
      amenities: ["City View", "Rooftop Terrance", "Fitness Center"],
      bed: 3,
      baths: 2,
      roomStatus: "LIMITED",
      statusColor: "#F4A857",
      amount: "₦195,000",
    },
    {
      id: 3,
      status: "Water Front",
      desc: "Modern waterfront residence with direct lagoon access and luxury finishes",
      name: "MAR Waterfront Residences - Lekki Phase 1",
      location: "Lekki, Lagos",
      amenities: ["Water Front", "Private Jetty", "Garden"],
      bed: 3,
      baths: 3,
      roomStatus: "AVAILABLE",
      statusColor: "#12B76A",
      amount: "₦165,000",
    },
    {
      id: 4,
      status: "Presidential",
      desc: "Ultra-luxury presidential villa with private beach access and world-class amenities",
      name: "MAR Presidential Villa - Banana Island",
      location: "Banana Island, Lagos",
      amenities: ["Private Beach", "Infinity Pool", "Home Cinema"],
      bed: 5,
      baths: 4,
      roomStatus: "AVAILABLE",
      statusColor: "#12B76A",
      amount: "₦450,000",
    },
    {
      id: 5,
      status: "Corporate",
      desc: "Premium corporate accommodation in the heart of Nigeria's capital city",
      name: "MAR Corporate Towers - Wuse 2, Abuja",
      location: "Wuse 2, Abuja",
      amenities: ["Business Center", "Meeting Rooms", "High-Speed Wifi"],
      bed: 2,
      baths: 2,
      roomStatus: "AVAILABLE",
      statusColor: "#12B76A",
      amount: "₦125,000",
    },
    {
      id: 6,
      status: "Garden",
      desc: "Serene garden court residence in Abuja's most prestigious diplomatic zone",
      name: "MAR Garden Court - Maitama, Abuja",
      location: "Maitama, Abuja",
      amenities: ["Private Garden", "Diplomatic Security", "Quiet Zone"],
      bed: 3,
      baths: 2,
      roomStatus: "LIMITED",
      statusColor: "#F4A857",
      amount: "₦155,000",
    },
    {
      id: 7,
      status: "Skyline",
      desc: "Modern skyline apartments with panoramic city views in Port Harcourt's premier district",
      name: "MAR Skyline Apartments - GRA, Port Harcourt",
      location: "GRA Phase 2, Port Harcourt",
      amenities: ["City Views", "Business District", "Airport Proximity"],
      bed: 2,
      baths: 2,
      roomStatus: "AVAILABLE",
      statusColor: "#12B76A",
      amount: "₦95,000",
    },
    {
      id: 8,
      status: "Heritage",
      desc: "Magnificent heritage mansion in Abuja's most exclusive residential district",
      name: "MAR Heritage Mansion - Asokoro, Abuja",
      location: "Asokoro District, Abuja",
      amenities: ["Exclusive District", "Private Gardens", "VIP Security"],
      bed: 4,
      baths: 3,
      roomStatus: "UNAVAILABLE",
      statusColor: "#F04438",
      amount: "₦225,000",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-8 py-10">
      {cardContent.map((card) => (
        <motion.div
          key={card.id}
          whileHover={{ y: -10, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="cursor-pointer"
        >
          <Card className="flex w-[300px] md:w-full h-[420px] p-[0px] border-2 border-[#F4A857] shadow transition-shadow hover:shadow-2xl">
            <CardHeader className="bg-center bg-no-repeat bg-[url('/images/background.jpg')] bg-cover bg-gray-100 bg-blend-multiply rounded-t-2xl h-[200px] px-[8px] border-b-1 border-gray-400">
              <div className="flex flex-col py-[10px] gap-[20px] h-full">
                <div className="flex justify-end">
                  <Badge>{card.status}</Badge>
                </div>
                <div className="flex justify-center items-center pt-[30px]">
                  <p className="text-sm text-gray-700 text-center">
                    {card.desc}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="flex flex-col px-[8px] gap-[10px]">
                <div className="flex flex-col gap-[2px]">
                  <p className="text-[16px] font-bold">{card.name}</p>
                  <div className="flex items-center gap-[3px]">
                    <MapPin size={16} className="text-red-500" />
                    <p className="text-[16px] text-[#667085] font-medium capitalize">
                      {card.location}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-[5px]">
                  {card.amenities.map((item, idx) => (
                    <Badge
                      key={idx}
                      className="bg-[#FDF3E8] text-[#F4A857] border-[#FF8888]"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-[10px]">
                    <div className="flex items-center gap-[2px]">
                      <Bed size={18} className="text-blue-500" />
                      <p className="text-[14px] text-[#667085]">
                        {card.bed} Beds
                      </p>
                    </div>
                    <div className="flex items-center gap-[2px]">
                      <Bath size={18} className="text-blue-500" />
                      <p className="text-[14px] text-[#667085]">
                        {card.baths} Baths
                      </p>
                    </div>
                  </div>

                  <Badge
                    className="flex items-center gap-1 px-2"
                    style={{
                      backgroundColor: card.statusColor + "20",
                      color: card.statusColor,
                      borderColor: card.statusColor,
                    }}
                  >
                    <div
                      className="w-[6px] h-[6px] rounded-full"
                      style={{ backgroundColor: card.statusColor }}
                    />
                    {card.roomStatus}
                  </Badge>
                </div>

                <div className="flex justify-between items-center pt-[10px]">
                  <p className="font-semibold text-[18px]">
                    {card.amount}
                    <span className="text-[#667085] font-normal capitalize">
                      /night
                    </span>
                  </p>
                  <Button className="bg-[#FFF] text-[#000] border border-black">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default PropertiesCard;
