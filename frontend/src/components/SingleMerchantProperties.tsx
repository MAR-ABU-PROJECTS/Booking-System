"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Star, MapPin, Calendar, Check, Award, Shield, Clock } from "lucide-react";

const SingleMerchantProperties = () => {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Merchant information
  const merchant = {
    name: "MAR ABU Homes",
    rating: 4.9,
    reviews: 487,
    description: "MAR ABU Homes offers premium accommodations across Nigeria's most prestigious locations. With a focus on luxury, comfort, and exceptional service, we provide an unparalleled hospitality experience for both short and long-term stays.",
    joinedDate: "January 2018",
    responseRate: "99%",
    responseTime: "within an hour",
    isSuperhost: true
  };
  
  // Property types offered by the merchant
  const propertyTypes = [
    {
      type: "Luxury Penthouses",
      description: "Stunning top-floor accommodations with panoramic views",
      priceRange: "₦85,000 - ₦150,000 / night",
      features: ["Panoramic views", "Private terraces", "Premium furnishings", "Concierge service"],
      locations: ["Victoria Island, Lagos", "Ikoyi, Lagos", "Banana Island, Lagos"],
      image: "penthouse" // This would be a real image path in production
    },
    {
      type: "Executive Suites",
      description: "Modern accommodations perfect for business travelers",
      priceRange: "₦65,000 - ₦95,000 / night",
      features: ["Dedicated workspace", "High-speed internet", "Meeting facilities", "Business center access"],
      locations: ["Ikoyi Heights, Lagos", "Wuse 2, Abuja", "GRA, Port Harcourt"],
      image: "executive-suite"
    },
    {
      type: "Waterfront Residences",
      description: "Exclusive properties with private beach or water access",
      priceRange: "₦95,000 - ₦180,000 / night",
      features: ["Water views", "Private beach access", "Outdoor entertainment areas", "Water sports equipment"],
      locations: ["Lekki Phase 1, Lagos", "Banana Island, Lagos"],
      image: "waterfront"
    },
    {
      type: "Presidential Villas",
      description: "Ultra-luxury standalone properties with premium amenities",
      priceRange: "₦150,000 - ₦250,000 / night",
      features: ["Private pool", "Personal chef", "Butler service", "Security detail", "Chauffeur service"],
      locations: ["Banana Island, Lagos", "Maitama, Abuja", "Asokoro, Abuja"],
      image: "villa"
    }
  ];
  
  // Placeholder gradients for demo
  const gradients = [
    "bg-gradient-to-br from-amber-100 to-amber-300",
    "bg-gradient-to-br from-blue-100 to-blue-300",
    "bg-gradient-to-br from-green-100 to-green-300",
    "bg-gradient-to-br from-purple-100 to-purple-300"
  ];

  return (
    <section className="py-12 px-4 mx-auto max-w-7xl">
      {/* Merchant Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10">
        {/* Logo/Avatar */}
        <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center text-white text-2xl font-bold">
          MAR
        </div>
        
        {/* Merchant Info */}
        <div className="flex-grow">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
            <h2 className="text-3xl font-bold text-gray-900">{merchant.name}</h2>
            <div className="flex items-center">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="ml-1 font-medium">{merchant.rating}</span>
              <span className="mx-1 text-gray-400">·</span>
              <span className="text-gray-600">{merchant.reviews} reviews</span>
            </div>
            {merchant.isSuperhost && (
              <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">Superhost</span>
              </div>
            )}
          </div>
          <p className="text-gray-600 max-w-3xl">{merchant.description}</p>
        </div>
      </div>
      
      {/* Merchant Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            <h3 className="font-medium text-gray-900">Member Since</h3>
          </div>
          <p className="text-gray-600">{merchant.joinedDate}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-5 h-5 text-amber-500" />
            <h3 className="font-medium text-gray-900">Locations</h3>
          </div>
          <p className="text-gray-600">Lagos, Abuja, Port Harcourt</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h3 className="font-medium text-gray-900">Response Time</h3>
          </div>
          <p className="text-gray-600">{merchant.responseTime}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-amber-500" />
            <h3 className="font-medium text-gray-900">Response Rate</h3>
          </div>
          <p className="text-gray-600">{merchant.responseRate}</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex overflow-x-auto scrollbar-hide">
          {["overview", "properties", "amenities", "reviews", "policies"].map((tab) => (
            <button
              key={tab}
              className={`px-6 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab 
                  ? "border-amber-500 text-amber-600" 
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="mb-12">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">About MAR ABU Homes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-gray-600 mb-4">
                  MAR ABU Homes specializes in providing premium accommodations across Nigeria&apos;s most prestigious locations. 
                  With properties in Lagos, Abuja, and Port Harcourt, we cater to discerning guests who seek luxury, comfort, 
                  and exceptional service.
                </p>
                <p className="text-gray-600 mb-4">
                  Our portfolio includes luxury penthouses, executive suites, waterfront residences, and presidential villas, 
                  all meticulously designed and maintained to the highest standards. Each property features premium amenities 
                  and is supported by our dedicated hospitality team.
                </p>
                <p className="text-gray-600">
                  Whether you&apos;re traveling for business or leisure, MAR ABU Homes offers an unparalleled hospitality experience 
                  that combines the privacy and comfort of a home with the services and amenities of a luxury hotel.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-3">What we offer:</h4>
                <ul className="space-y-2">
                  {[
                    "Luxury accommodations in premium locations",
                    "24/7 concierge and support services",
                    "Fully furnished and equipped properties",
                    "Premium amenities and facilities",
                    "Flexible booking options",
                    "Corporate and long-term stay packages",
                    "Airport transfers and transportation services",
                    "Personalized guest experiences"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Properties Tab */}
        {activeTab === "properties" && (
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Our Property Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {propertyTypes.map((property, index) => (
                <motion.div 
                  key={property.type}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Property Image */}
                  <div className={`h-48 ${gradients[index % gradients.length]} flex items-center justify-center`}>
                    <span className="text-white font-medium">{property.type} Image</span>
                  </div>
                  
                  {/* Property Details */}
                  <div className="p-6">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{property.type}</h4>
                    <p className="text-gray-600 mb-4">{property.description}</p>
                    
                    <div className="flex items-center text-amber-600 font-medium mb-4">
                      {property.priceRange}
                    </div>
                    
                    <h5 className="font-medium text-gray-900 mb-2">Key Features:</h5>
                    <ul className="mb-4">
                      {property.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 mb-1">
                          <Check className="w-4 h-4 text-amber-500" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <h5 className="font-medium text-gray-900 mb-2">Available Locations:</h5>
                    <div className="flex flex-wrap gap-2">
                      {property.locations.map((location, i) => (
                        <div key={i} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                          {location}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        
        {/* Placeholder for other tabs */}
        {activeTab === "amenities" && (
          <div className="text-center py-12 text-gray-500">
            Amenities content would appear here
          </div>
        )}
        
        {activeTab === "reviews" && (
          <div className="text-center py-12 text-gray-500">
            Reviews content would appear here
          </div>
        )}
        
        {activeTab === "policies" && (
          <div className="text-center py-12 text-gray-500">
            Policies content would appear here
          </div>
        )}
      </div>
      
      {/* CTA Section */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Ready to experience luxury?</h3>
            <p className="text-white/90 max-w-xl">
              Book your stay with MAR ABU Homes today and enjoy premium accommodations in Nigeria&apos;s most prestigious locations.
            </p>
          </div>
          <button className="px-6 py-3 bg-white text-amber-600 font-medium rounded-xl hover:bg-amber-50 transition-colors whitespace-nowrap">
            Browse Properties
          </button>
        </div>
      </div>
      
      {/* Add custom CSS to hide scrollbar */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
};

export default SingleMerchantProperties;