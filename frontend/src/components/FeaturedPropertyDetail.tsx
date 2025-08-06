"use client";
import React, { useState } from "react";
import { 
  Star, 
  MapPin, 
  Users, 
  Bed, 
  Bath, 
  Wifi, 
  Tv, 
  Coffee, 
  Utensils, 
  Car,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Share2,
  Heart,
  Waves,
  
} from "lucide-react";

const FeaturedPropertyDetail = () => {
  const [checkInDate, setCheckInDate] = useState<string>("");
  const [checkOutDate, setCheckOutDate] = useState<string>("");
  const [guestCount, setGuestCount] = useState<number>(1);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [isGuestSelectorOpen, setIsGuestSelectorOpen] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  
  // Featured property data
  const property = {
    id: 1,
    name: "MAR Luxury Penthouse",
    location: "Victoria Island, Lagos",
    rating: 4.9,
    reviews: 127,
    price: "₦85,000",
    description: "Experience luxury living at its finest in this stunning penthouse with panoramic views of Victoria Island and the Atlantic Ocean. This premium accommodation features three spacious bedrooms, a fully equipped gourmet kitchen, and an expansive living area perfect for relaxation or entertaining.",
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    size: "250 sq.m",
    amenities: [
      { name: "Wi-Fi", icon: <Wifi className="w-5 h-5" /> },
      { name: "Smart TV", icon: <Tv className="w-5 h-5" /> },
      { name: "Coffee Maker", icon: <Coffee className="w-5 h-5" /> },
      { name: "Full Kitchen", icon: <Utensils className="w-5 h-5" /> },
      { name: "Parking", icon: <Car className="w-5 h-5" /> },
      { name: "Swimming Pool", icon: <Waves className="w-5 h-5" /> },
      { name: "Gym Access", icon: <Dumbbell className="w-5 h-5" /> }
    ],
    highlights: [
      "Panoramic ocean and city views",
      "Private terrace with lounge area",
      "24/7 concierge service",
      "Premium furnishings and finishes",
      "Central location near restaurants and attractions"
    ]
  };
  
  // Calculate total price (simplified for demo)
  // const calculateTotal = () => {
  //   if (!checkInDate || !checkOutDate) return property.price;
    
  //   // In a real app, you would calculate based on actual dates
  //   const basePrice = parseInt(property.price.replace(/[^\d]/g, ""));
  //   const nights = 3; // Placeholder - would be calculated from actual dates
  //   const total = basePrice * nights;
    
  //   return `₦${total.toLocaleString()}`;
  // };
  
  // Placeholder gradients for demo
  const gradients = [
    "bg-gradient-to-br from-amber-100 to-amber-300",
    "bg-gradient-to-br from-blue-100 to-blue-300",
    "bg-gradient-to-br from-green-100 to-green-300",
    "bg-gradient-to-br from-purple-100 to-purple-300",
    "bg-gradient-to-br from-red-100 to-red-300"
  ];

  return (
    <section className="py-12 px-4 mx-auto max-w-7xl">
      {/* Property Title */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{property.name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500 mr-1" />
            <span className="font-medium">{property.rating}</span>
            <span className="mx-1 text-gray-400">·</span>
            <span className="text-gray-600">{property.reviews} reviews</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 text-gray-500 mr-1" />
            <span className="text-gray-600">{property.location}</span>
          </div>
        </div>
      </div>
      
      {/* Property Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Main Image (Larger) */}
        <div className="md:col-span-2 lg:col-span-2 row-span-2 aspect-square rounded-xl overflow-hidden">
          <div className={`w-full h-full ${gradients[0]} flex items-center justify-center`}>
            <span className="text-white font-medium">Main Property Image</span>
          </div>
        </div>
        
        {/* Additional Images */}
        {[1, 2, 3, 4].map((_, index) => (
          <div key={index} className="aspect-square rounded-xl overflow-hidden">
            <div className={`w-full h-full ${gradients[(index + 1) % gradients.length]} flex items-center justify-center`}>
              <span className="text-white font-medium">Image {index + 1}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mb-8">
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          onClick={() => {}}
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
        
        <button 
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
            isLiked ? 'border-red-300 text-red-500' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setIsLiked(!isLiked)}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
          <span>Save</span>
        </button>
      </div>
      
      {/* Property Details and Booking Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Property Details */}
        <div className="lg:col-span-2">
          {/* Property Overview */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Luxury Penthouse by MAR ABU Homes</h2>
            <div className="flex flex-wrap gap-6 mb-6">
              <div className="flex items-center gap-2">
                <Bed className="w-5 h-5 text-gray-700" />
                <span>{property.bedrooms} bedrooms</span>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="w-5 h-5 text-gray-700" />
                <span>{property.bathrooms} bathrooms</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-700" />
                <span>Up to {property.maxGuests} guests</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center text-gray-700">📏</span>
                <span>{property.size}</span>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed">{property.description}</p>
          </div>
          
          {/* Property Highlights */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Highlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {property.highlights.map((highlight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                    <Star className="w-4 h-4" />
                  </div>
                  <span className="text-gray-700">{highlight}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Amenities */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {property.amenities.map((amenity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="text-gray-700">
                    {amenity.icon}
                  </div>
                  <span className="text-gray-700">{amenity.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Location */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Location</h2>
            <div className="aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
              <span className="text-gray-500">Map would appear here</span>
            </div>
            <p className="mt-4 text-gray-600">
              Located in the heart of Victoria Island, Lagos, this property offers easy access to premium restaurants, 
              shopping centers, and business districts. The beach is just a 5-minute walk away.
            </p>
          </div>
        </div>
        
        {/* Right Column - Booking Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="p-6">
                {/* Price */}
                <div className="flex items-baseline mb-4">
                  <span className="text-2xl font-bold text-gray-900">{property.price}</span>
                  <span className="text-gray-600 ml-1">night</span>
                </div>
                
                {/* Date Selection */}
                <div className="mb-4">
                  <div className="grid grid-cols-2 border border-gray-300 rounded-t-lg overflow-hidden">
                    <div 
                      className="p-3 border-r border-gray-300 cursor-pointer hover:bg-gray-50"
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    >
                      <div className="text-xs font-bold text-gray-700">CHECK-IN</div>
                      <div className="text-sm text-gray-900">{checkInDate || "Add date"}</div>
                    </div>
                    <div 
                      className="p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    >
                      <div className="text-xs font-bold text-gray-700">CHECK-OUT</div>
                      <div className="text-sm text-gray-900">{checkOutDate || "Add date"}</div>
                    </div>
                  </div>
                  
                  {/* Calendar (simplified placeholder) */}
                  {isCalendarOpen && (
                    <div className="border border-t-0 border-gray-300 rounded-b-lg p-4 bg-white">
                      <div className="text-center py-8 text-gray-500">
                        Calendar would appear here
                      </div>
                      <div className="flex justify-end">
                        <button 
                          className="px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg"
                          onClick={() => {
                            // In a real app, these would be actual selected dates
                            setCheckInDate("Jul 25, 2025");
                            setCheckOutDate("Jul 28, 2025");
                            setIsCalendarOpen(false);
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Guest Selection */}
                <div className="mb-6">
                  <div 
                    className="p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 flex justify-between items-center"
                    onClick={() => setIsGuestSelectorOpen(!isGuestSelectorOpen)}
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-700">GUESTS</div>
                      <div className="text-sm text-gray-900">{guestCount} guest{guestCount !== 1 ? 's' : ''}</div>
                    </div>
                    {isGuestSelectorOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  </div>
                  
                  {/* Guest Selector */}
                  {isGuestSelectorOpen && (
                    <div className="border border-t-0 border-gray-300 rounded-b-lg p-4 bg-white">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <div className="font-medium">Adults</div>
                          <div className="text-sm text-gray-500">Age 13+</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 disabled:opacity-50"
                            disabled={guestCount <= 1}
                            onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                          >
                            -
                          </button>
                          <span className="w-5 text-center">{guestCount}</span>
                          <button 
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 disabled:opacity-50"
                            disabled={guestCount >= property.maxGuests}
                            onClick={() => setGuestCount(Math.min(property.maxGuests, guestCount + 1))}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        This property has a maximum of {property.maxGuests} guests.
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Book Button */}
                <button className="w-full py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors mb-4">
                  Reserve
                </button>
                
                {/* Price Breakdown */}
                {checkInDate && checkOutDate && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 underline">₦85,000 x 3 nights</span>
                      <span className="text-gray-900">₦255,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 underline">Cleaning fee</span>
                      <span className="text-gray-900">₦15,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 underline">Service fee</span>
                      <span className="text-gray-900">₦20,000</span>
                    </div>
                    <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between font-bold">
                      <span>Total</span>
                      <span>₦290,000</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedPropertyDetail;