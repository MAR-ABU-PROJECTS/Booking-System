"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Users, Clock, Star, ChevronRight, ChevronLeft } from "lucide-react";

const ShortLetShowcase = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  
  // Short let property data
  const shortLets = [
    {
      id: 1,
      name: "Luxury Penthouse Suite",
      location: "Victoria Island, Lagos",
      price: "₦85,000",
      period: "per night",
      minStay: "2 nights",
      maxGuests: 4,
      bedrooms: 2,
      rating: 4.9,
      reviews: 127,
      amenities: ["Ocean view", "Private terrace", "Fully equipped kitchen", "Smart home features"],
      image: "penthouse-bg"
    },
    {
      id: 2,
      name: "Executive Apartment",
      location: "Ikoyi, Lagos",
      price: "₦65,000",
      period: "per night",
      minStay: "3 nights",
      maxGuests: 2,
      bedrooms: 1,
      rating: 4.8,
      reviews: 95,
      amenities: ["Business center access", "Gym access", "Daily housekeeping", "High-speed internet"],
      image: "executive-bg"
    },
    {
      id: 3,
      name: "Waterfront Villa",
      location: "Lekki Phase 1, Lagos",
      price: "₦120,000",
      period: "per night",
      minStay: "2 nights",
      maxGuests: 6,
      bedrooms: 3,
      rating: 5.0,
      reviews: 84,
      amenities: ["Private pool", "Beach access", "Outdoor dining area", "BBQ facilities"],
      image: "waterfront-bg"
    }
  ];

  // Navigate through slides
  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % shortLets.length);
  };

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + shortLets.length) % shortLets.length);
  };

  // Placeholder gradients for demo
  const gradients = [
    "bg-gradient-to-br from-amber-100 to-amber-300",
    "bg-gradient-to-br from-blue-100 to-blue-300",
    "bg-gradient-to-br from-green-100 to-green-300"
  ];

  return (
    <section className="py-16 px-4 mx-auto max-w-7xl">
      {/* Section Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Premium Short Let Apartments</h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Experience the perfect blend of hotel luxury and home comfort with our curated selection of short-term accommodations
        </p>
      </div>

      {/* Featured Short Let Carousel */}
      <div className="relative mb-16">
        {/* Carousel Container */}
        <div className="overflow-hidden rounded-3xl">
          <div 
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {shortLets.map((property, index) => (
              <div key={property.id} className="w-full flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                  {/* Image Side */}
                  <div className="relative h-64 md:h-auto">
                    {/* Placeholder gradient for demo */}
                    <div className={`absolute inset-0 ${gradients[index % gradients.length]}`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
                    </div>
                    
                    {/* Property Details Overlay */}
                    <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                        <span className="font-medium">{property.rating}</span>
                        <span className="text-sm text-white/80">({property.reviews} reviews)</span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-2">{property.name}</h3>
                      <div className="flex items-center gap-1 mb-4">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{property.location}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content Side */}
                  <div className="bg-white p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="text-2xl font-bold text-gray-900">{property.price}</span>
                          <span className="text-gray-600"> {property.period}</span>
                        </div>
                        <button className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                          Book Now
                        </button>
                      </div>
                      
                      {/* Property Features */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-amber-500" />
                          <span className="text-gray-700">Min stay: {property.minStay}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-amber-500" />
                          <span className="text-gray-700">Up to {property.maxGuests} guests</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-amber-500" />
                          <span className="text-gray-700">Instant booking</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 flex items-center justify-center text-amber-500">🛏️</span>
                          <span className="text-gray-700">{property.bedrooms} bedroom{property.bedrooms > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      
                      {/* Amenities */}
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-3">Top amenities</h4>
                        <div className="flex flex-wrap gap-2">
                          {property.amenities.map((amenity, idx) => (
                            <span key={idx} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">ID: MAR-SL-{property.id}</span>
                      <button className="text-amber-600 font-medium hover:text-amber-700 transition-colors flex items-center gap-1">
                        View details
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Navigation Arrows */}
        <button 
          className="absolute top-1/2 left-4 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md z-10"
          onClick={prevSlide}
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <button 
          className="absolute top-1/2 right-4 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md z-10"
          onClick={nextSlide}
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
        
        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 mt-4">
          {shortLets.map((_, index) => (
            <button
              key={index}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                index === activeSlide ? 'bg-amber-500' : 'bg-gray-300'
              }`}
              onClick={() => setActiveSlide(index)}
            />
          ))}
        </div>
      </div>

      {/* Short Let Benefits */}
      <div className="mb-16">
        <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Why Choose Our Short Let Apartments</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Flexibility & Convenience",
              description: "Enjoy the freedom to book for exactly the duration you need, from a few days to several weeks, with simple check-in and check-out processes.",
              icon: "🗓️"
            },
            {
              title: "Home Comforts & Privacy",
              description: "Experience all the comforts of home with fully equipped kitchens, separate living spaces, and private facilities not typically found in hotels.",
              icon: "🏠"
            },
            {
              title: "Premium Locations",
              description: "Stay in Nigeria's most prestigious neighborhoods with easy access to business districts, shopping centers, restaurants, and attractions.",
              icon: "📍"
            }
          ].map((benefit, index) => (
            <motion.div
              key={index}
              className="bg-white p-8 rounded-xl shadow-sm border border-gray-100"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-3xl mb-4">{benefit.icon}</div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h4>
              <p className="text-gray-600">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Booking CTA */}
      <div className="text-center">
        <button className="px-8 py-4 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors inline-flex items-center gap-2">
          View All Short Let Options
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};

export default ShortLetShowcase;