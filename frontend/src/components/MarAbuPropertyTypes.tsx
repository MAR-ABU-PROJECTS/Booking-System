"use client";
import React from "react";
import { motion } from "framer-motion";
import { Building, Home, Clock, MapPin, Users, Calendar, ArrowRight } from "lucide-react";

const MarAbuPropertyTypes = () => {
  // Property type categories specific to MAR ABU HOMES
  const propertyTypes = [
    {
      id: "short-lets",
      title: "Short Let Apartments",
      description: "Fully furnished luxury apartments for short-term stays",
      icon: <Home className="w-6 h-6" />,
      features: [
        "Flexible booking periods (1-30 days)",
        "Fully furnished with premium amenities",
        "Housekeeping services included",
        "Ideal for business travelers and tourists"
      ],
      cta: "View Short Let Options",
      image: "short-let-bg",
      color: "amber"
    },
    {
      id: "executive-apartments",
      title: "Executive Apartments",
      description: "Premium living spaces for discerning professionals",
      icon: <Building className="w-6 h-6" />,
      features: [
        "Spacious floor plans with luxury finishes",
        "Dedicated workspace and high-speed internet",
        "Premium building amenities",
        "24/7 concierge and security"
      ],
      cta: "Explore Executive Living",
      image: "executive-bg",
      color: "blue"
    },
    {
      id: "serviced-apartments",
      title: "Serviced Apartments",
      description: "Hotel-style services with the comfort of home",
      icon: <Clock className="w-6 h-6" />,
      features: [
        "Daily housekeeping and maintenance",
        "On-demand dining options",
        "Laundry and dry cleaning services",
        "Personalized concierge assistance"
      ],
      cta: "Discover Serviced Options",
      image: "serviced-bg",
      color: "green"
    }
  ];

  // Featured MAR ABU HOMES apartments
  const featuredApartments = [
    {
      id: "white-stone",
      name: "WHITE-STONE",
      type: "Short Let",
      location: "Victoria Island, Lagos",
      description: "Elegant luxury apartment with modern curved seating and premium finishes",
      amenities: ["Premium furnishing", "Smart TV", "Modern lighting", "Spacious living area"],
      price: "₦85,000/night",
      rating: 4.9,
      reviews: 127,
      image: "white-stone-bg"
    },
    {
      id: "abike-penthouse",
      name: "ABIKE PENTHOUSE",
      type: "Short Let",
      location: "Ikoyi, Lagos",
      description: "Sophisticated penthouse with contemporary design and premium amenities",
      amenities: ["Ocean view", "Premium seating", "Modern entertainment", "Luxury finishes"],
      price: "₦120,000/night",
      rating: 5.0,
      reviews: 89,
      image: "abike-penthouse-bg"
    },
    {
      id: "obudu-villa",
      name: "OBUDU VILLA",
      type: "Short Let",
      location: "Lekki Phase 1, Lagos",
      description: "Spacious villa with elegant living spaces and modern comfort",
      amenities: ["Spacious layout", "Premium furniture", "Entertainment center", "Luxury amenities"],
      price: "₦95,000/night",
      rating: 4.8,
      reviews: 156,
      image: "obudu-villa-bg"
    },
    {
      id: "zircon",
      name: "ZIRCON",
      type: "Short Let",
      location: "Banana Island, Lagos",
      description: "Premium apartment with sophisticated design and luxury comfort",
      amenities: ["Designer furniture", "Modern lighting", "Premium finishes", "Elegant decor"],
      price: "₦110,000/night",
      rating: 4.9,
      reviews: 203,
      image: "zircon-bg"
    }
  ];

  // Placeholder gradients for demo
  const getGradient = (color: string) => {
    const gradients = {
      "amber": "bg-gradient-to-br from-amber-100 to-amber-300",
      "blue": "bg-gradient-to-br from-blue-100 to-blue-300",
      "green": "bg-gradient-to-br from-green-100 to-green-300"
    };
    return gradients[color as keyof typeof gradients] || gradients.amber;
  };

  return (
    <section className="py-16 px-4 mx-auto max-w-7xl">
      {/* Section Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">MAR ABU HOMES Accommodations</h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Discover our range of premium short-term and executive accommodations across Nigeria's most prestigious locations
        </p>
      </div>

      {/* Property Types */}
      <div className="mb-20">
        <h3 className="text-2xl font-bold text-gray-900 mb-8">Our Accommodation Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {propertyTypes.map((type) => (
            <motion.div
              key={type.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {/* Property Type Header */}
              <div className={`${getGradient(type.color)} p-6`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white">
                    {type.icon}
                  </div>
                  <h4 className="text-xl font-bold text-white">{type.title}</h4>
                </div>
                <p className="text-white/90">{type.description}</p>
              </div>

              {/* Property Type Features */}
              <div className="p-6">
                <ul className="space-y-3 mb-6">
                  {type.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className="flex items-center gap-2 text-amber-600 font-medium hover:text-amber-700 transition-colors">
                  {type.cta}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Featured Apartments */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-8">Featured Apartments</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredApartments.map((apartment, index) => (
            <motion.div
              key={apartment.id}
              className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {/* Apartment Image */}
              <div className="relative h-48">
                {/* Using indoor.jpg as background for all apartments */}
                <div className="absolute inset-0 bg-center bg-cover bg-[url('/banner/indoor.jpg')]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                
                {/* Property Type Badge */}
                <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-800">
                  {apartment.type}
                </div>
                
                {/* Rating Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs">
                  <span className="text-amber-500">★</span>
                  <span className="font-medium">{apartment.rating}</span>
                </div>
              </div>
              
              {/* Apartment Details */}
              <div className="p-4">
                <h4 className="text-lg font-bold text-gray-900 mb-1">{apartment.name}</h4>
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>{apartment.location}</span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{apartment.description}</p>
                
                {/* Amenities */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {apartment.amenities.slice(0, 2).map((amenity, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                      {amenity}
                    </span>
                  ))}
                  {apartment.amenities.length > 2 && (
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
                      +{apartment.amenities.length - 2} more
                    </span>
                  )}
                </div>
                
                {/* Price and Reviews */}
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="text-lg font-bold text-amber-600">{apartment.price}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {apartment.reviews} reviews
                  </div>
                </div>
                
                {/* Book Button */}
                <button className="w-full py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium">
                  Book Now
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Booking Process */}
      <div className="mt-20">
        <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Simple Booking Process</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              icon: <Calendar className="w-6 h-6" />,
              title: "Select Dates",
              description: "Choose your check-in and check-out dates from our availability calendar"
            },
            {
              icon: <Building className="w-6 h-6" />,
              title: "Choose Property",
              description: "Browse our premium properties and select the one that suits your needs"
            },
            {
              icon: <Users className="w-6 h-6" />,
              title: "Guest Details",
              description: "Enter your information and any special requirements for your stay"
            },
            {
              icon: <ArrowRight className="w-6 h-6" />,
              title: "Confirm & Pay",
              description: "Secure your booking with our simple payment process"
            }
          ].map((step, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative">
              {/* Step Number */}
              <div className="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                {index + 1}
              </div>
              
              {/* Step Content */}
              <div className="pt-2">
                <div className="p-3 bg-amber-50 rounded-lg inline-flex mb-4 text-amber-600">
                  {step.icon}
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h4>
                <p className="text-gray-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Banner */}
      <div className="mt-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Ready to experience luxury living?</h3>
            <p className="text-white/90 max-w-xl">
              Book your premium accommodation with MAR ABU HOMES today and enjoy unparalleled comfort and service.
            </p>
          </div>
          <button className="px-6 py-3 bg-white text-amber-600 font-medium rounded-xl hover:bg-amber-50 transition-colors whitespace-nowrap">
            Browse Available Properties
          </button>
        </div>
      </div>
    </section>
  );
};

export default MarAbuPropertyTypes;