"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Building, Star, ArrowRight } from "lucide-react";

const LocationBasedProperties = () => {
  const [activeLocation, setActiveLocation] = useState("lagos");
  
  // Location data for MAR ABU HOMES properties
  const locations = [
    {
      id: "lagos",
      name: "Lagos",
      description: "Nigeria's vibrant commercial hub with premium waterfront and island properties",
      propertyCount: 12,
      areas: ["Victoria Island", "Ikoyi", "Lekki Phase 1", "Banana Island"],
      image: "lagos-bg"
    },
    {
      id: "abuja",
      name: "Abuja",
      description: "The capital city featuring elegant accommodations in prestigious neighborhoods",
      propertyCount: 8,
      areas: ["Maitama", "Asokoro", "Wuse II", "Jabi"],
      image: "abuja-bg"
    },
    {
      id: "port-harcourt",
      name: "Port Harcourt",
      description: "Luxury living in the heart of Nigeria's oil and gas capital",
      propertyCount: 5,
      areas: ["GRA", "Old GRA", "Trans Amadi", "Peter Odili Road"],
      image: "ph-bg"
    }
  ];
  
  // Properties for each location
  const locationProperties = {
    lagos: [
      {
        id: "vi-penthouse",
        name: "Victoria Island Penthouse",
        type: "Luxury Penthouse",
        area: "Victoria Island",
        price: "₦95,000/night",
        rating: 4.9,
        image: "vi-penthouse-bg"
      },
      {
        id: "ikoyi-executive",
        name: "Ikoyi Executive Suite",
        type: "Executive Apartment",
        area: "Ikoyi",
        price: "₦75,000/night",
        rating: 4.8,
        image: "ikoyi-exec-bg"
      },
      {
        id: "lekki-waterfront",
        name: "Lekki Waterfront Villa",
        type: "Waterfront Residence",
        area: "Lekki Phase 1",
        price: "₦120,000/night",
        rating: 5.0,
        image: "lekki-villa-bg"
      },
      {
        id: "banana-presidential",
        name: "Banana Island Presidential Suite",
        type: "Presidential Villa",
        area: "Banana Island",
        price: "₦150,000/night",
        rating: 4.9,
        image: "banana-suite-bg"
      }
    ],
    abuja: [
      {
        id: "maitama-luxury",
        name: "Maitama Luxury Apartment",
        type: "Luxury Apartment",
        area: "Maitama",
        price: "₦85,000/night",
        rating: 4.8,
        image: "maitama-apt-bg"
      },
      {
        id: "asokoro-villa",
        name: "Asokoro Executive Villa",
        type: "Executive Villa",
        area: "Asokoro",
        price: "₦110,000/night",
        rating: 4.9,
        image: "asokoro-villa-bg"
      },
      {
        id: "wuse-suite",
        name: "Wuse II Premium Suite",
        type: "Premium Suite",
        area: "Wuse II",
        price: "₦70,000/night",
        rating: 4.7,
        image: "wuse-suite-bg"
      }
    ],
    "port-harcourt": [
      {
        id: "gra-executive",
        name: "GRA Executive Apartment",
        type: "Executive Apartment",
        area: "GRA",
        price: "₦65,000/night",
        rating: 4.7,
        image: "gra-apt-bg"
      },
      {
        id: "old-gra-villa",
        name: "Old GRA Heritage Villa",
        type: "Heritage Villa",
        area: "Old GRA",
        price: "₦90,000/night",
        rating: 4.8,
        image: "old-gra-bg"
      }
    ]
  };
  
  // Get properties for active location
  const activeProperties = locationProperties[activeLocation as keyof typeof locationProperties] || [];
  const activeLocationData = locations.find(loc => loc.id === activeLocation);
  
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
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Browse by Location</h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Discover MAR ABU HOMES premium properties across Nigeria&apos;s most prestigious locations
        </p>
      </div>

      {/* Location Tabs */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex bg-gray-100 rounded-full p-1">
          {locations.map((location) => (
            <button
              key={location.id}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                activeLocation === location.id 
                  ? "bg-amber-500 text-white" 
                  : "text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => setActiveLocation(location.id)}
            >
              {location.name}
            </button>
          ))}
        </div>
      </div>

      {/* Location Overview */}
      {activeLocationData && (
        <div className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Location Image */}
            <div className="md:col-span-1 h-64 rounded-2xl overflow-hidden relative">
              {/* Placeholder gradient for demo */}
              <div className={`absolute inset-0 ${gradients[locations.findIndex(l => l.id === activeLocation) % gradients.length]}`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <h3 className="text-3xl font-bold text-white mb-2">{activeLocationData.name}</h3>
                <div className="flex items-center gap-1 text-white/90">
                  <Building className="w-4 h-4" />
                  <span>{activeLocationData.propertyCount} properties</span>
                </div>
              </div>
            </div>
            
            {/* Location Details */}
            <div className="md:col-span-2">
              <p className="text-gray-700 mb-6 text-lg">{activeLocationData.description}</p>
              
              <h4 className="font-bold text-gray-900 mb-3">Popular areas in {activeLocationData.name}:</h4>
              <div className="flex flex-wrap gap-2 mb-6">
                {activeLocationData.areas.map((area) => (
                  <div key={area} className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                    <MapPin className="w-3 h-3 text-amber-500" />
                    <span>{area}</span>
                  </div>
                ))}
              </div>
              
              <button className="px-5 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2">
                View All {activeLocationData.name} Properties
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Properties Grid */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Featured Properties in {activeLocationData?.name}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeProperties.map((property, index) => (
            <motion.div
              key={property.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {/* Property Image */}
              <div className="h-48 relative">
                {/* Placeholder gradient for demo */}
                <div className={`absolute inset-0 ${gradients[index % gradients.length]}`} />
                
                {/* Property Type Badge */}
                <div className="absolute top-3 left-3 px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-xs font-medium text-gray-800">
                  {property.type}
                </div>
              </div>
              
              {/* Property Details */}
              <div className="p-4">
                <h4 className="font-bold text-gray-900 mb-1 truncate">{property.name}</h4>
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>{property.area}</span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-medium text-sm">{property.rating}</span>
                  </div>
                  <span className="text-amber-600 font-medium">{property.price}</span>
                </div>
                
                <button className="w-full py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                  View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LocationBasedProperties;