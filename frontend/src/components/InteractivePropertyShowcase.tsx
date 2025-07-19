"use client";
import React, { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Users,
  Bed,
  Bath,
  Wifi,
  Car,
  Utensils,
  Dumbbell,
  Eye,
  Heart,
  Star,
  ArrowRight
} from "lucide-react";

interface Property {
  id: number;
  title: string;
  location: string;
  price: string;
  rating: number;
  reviews: number;
  images: string[];
  bedrooms: number;
  bathrooms: number;
  guests: number;
  amenities: string[];
  description: string;
  featured: boolean;
  availability: "available" | "limited" | "booked";
}

const InteractivePropertyShowcase = () => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [likedProperties, setLikedProperties] = useState<Set<number>>(new Set());
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Sample property data
  const properties: Property[] = [
    {
      id: 1,
      title: "MAR Luxury Penthouse",
      location: "Victoria Island, Lagos",
      price: "₦85,000/night",
      rating: 4.9,
      reviews: 127,
      images: ["/properties/penthouse1.jpg", "/properties/penthouse2.jpg"],
      bedrooms: 3,
      bathrooms: 2,
      guests: 6,
      amenities: ["Wifi", "Pool", "Gym", "Parking"],
      description: "Stunning penthouse with panoramic city views and luxury amenities.",
      featured: true,
      availability: "available"
    },
    {
      id: 2,
      title: "MAR Executive Suites",
      location: "Ikoyi Heights, Lagos",
      price: "₦65,000/night",
      rating: 4.8,
      reviews: 89,
      images: ["/properties/suite1.jpg", "/properties/suite2.jpg"],
      bedrooms: 2,
      bathrooms: 2,
      guests: 4,
      amenities: ["Wifi", "Kitchen", "Balcony", "Security"],
      description: "Modern executive suite perfect for business travelers.",
      featured: true,
      availability: "limited"
    },
    {
      id: 3,
      title: "MAR Waterfront Residences",
      location: "Lekki Phase 1, Lagos",
      price: "₦95,000/night",
      rating: 5.0,
      reviews: 156,
      images: ["/properties/waterfront1.jpg", "/properties/waterfront2.jpg"],
      bedrooms: 4,
      bathrooms: 3,
      guests: 8,
      amenities: ["Wifi", "Pool", "Beach Access", "Spa"],
      description: "Exclusive waterfront property with private beach access.",
      featured: true,
      availability: "available"
    },
    {
      id: 4,
      title: "MAR Presidential Villa",
      location: "Banana Island, Lagos",
      price: "₦150,000/night",
      rating: 4.9,
      reviews: 203,
      images: ["/properties/villa1.jpg", "/properties/villa2.jpg"],
      bedrooms: 5,
      bathrooms: 4,
      guests: 10,
      amenities: ["Wifi", "Pool", "Chef", "Butler"],
      description: "Presidential villa with world-class service and amenities.",
      featured: true,
      availability: "available"
    }
  ];
  const toggleLike = (propertyId: number) => {
    const newLiked = new Set(likedProperties);
    if (newLiked.has(propertyId)) {
      newLiked.delete(propertyId);
    } else {
      newLiked.add(propertyId);
    }
    setLikedProperties(newLiked);
  };

  const getAmenityIcon = (amenity: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      "Wifi": <Wifi className="w-4 h-4" />,
      "Pool": <span className="text-sm">🏊</span>,
      "Gym": <Dumbbell className="w-4 h-4" />,
      "Parking": <Car className="w-4 h-4" />,
      "Kitchen": <Utensils className="w-4 h-4" />,
      "Balcony": <span className="text-sm">🏢</span>,
      "Security": <span className="text-sm">🔒</span>
    };
    return icons[amenity] || <span className="text-sm">✨</span>;
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "available": return "bg-green-500";
      case "limited": return "bg-yellow-500";
      case "booked": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <section ref={ref} className="relative py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 px-4 mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <motion.h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 gilda-display"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Interactive Property Showcase
          </motion.h2>
          <motion.p
            className="text-lg text-gray-600 font-light max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Experience our premium properties through immersive 3D previews and interactive features
          </motion.p>
        </motion.div>
        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {properties.map((property, index) => (
            <motion.div
              key={property.id}
              className="group relative"
              initial={{ opacity: 0, y: 50, rotateY: -15 }}
              animate={isInView ? { opacity: 1, y: 0, rotateY: 0 } : {}}
              transition={{
                duration: 0.8,
                delay: 0.6 + index * 0.1,
                type: "spring",
                stiffness: 100
              }}
              onMouseEnter={() => setHoveredCard(property.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* 3D Card Container */}
              <motion.div
                className="relative bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20 shadow-2xl cursor-pointer"
                whileHover={{
                  scale: 1.02,
                  rotateY: 5,
                  rotateX: 5,
                  z: 50
                }}
                transition={{ duration: 0.3 }}
                style={{
                  transformStyle: "preserve-3d",
                  perspective: "1000px"
                }}
              >
                {/* Glass Overlay Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />

                {/* Availability Indicator */}
                <div className="absolute top-4 left-4 z-20">
                  <div className={`w-3 h-3 rounded-full ${getAvailabilityColor(property.availability)} shadow-lg`} />
                </div>

                {/* Like Button */}
                <motion.button
                  className="absolute top-4 right-4 z-20 p-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30"
                  onClick={() => toggleLike(property.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Heart
                    className={`w-4 h-4 ${likedProperties.has(property.id) ? 'text-red-500 fill-red-500' : 'text-white'}`}
                  />
                </motion.button>

                {/* Property Image */}
                <div className="relative h-48 overflow-hidden">
                  <motion.div
                    className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="text-gray-500 text-sm">Property Image</span>
                  </motion.div>

                  {/* Hover Overlay */}
                  <motion.div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                  >
                    <motion.button
                      className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 text-white font-medium flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setSelectedProperty(property)}
                    >
                      <Eye className="w-4 h-4" />
                      Virtual Tour
                    </motion.button>
                  </motion.div>
                </div>
                {/* Property Details */}
                <div className="p-6 space-y-4">
                  {/* Title and Location */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-amber-600 transition-colors duration-300">
                      {property.title}
                    </h3>
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      {property.location}
                    </div>
                  </div>

                  {/* Rating and Reviews */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
                      <span className="text-sm font-medium text-gray-900">{property.rating}</span>
                      <span className="text-sm text-gray-500 ml-1">({property.reviews})</span>
                    </div>
                    <div className="text-lg font-bold text-amber-600">{property.price}</div>
                  </div>

                  {/* Property Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 mr-1" />
                      {property.bedrooms}
                    </div>
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 mr-1" />
                      {property.bathrooms}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {property.guests}
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.slice(0, 4).map((amenity, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100/80 backdrop-blur-sm rounded-lg text-xs text-gray-700"
                      >
                        {getAmenityIcon(amenity)}
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <motion.button
                    className="w-full py-3 bg-gradient-to-r from-amber-500/20 to-amber-600/20 backdrop-blur-sm border border-amber-500/30 rounded-xl text-amber-700 font-medium hover:from-amber-500/30 hover:to-amber-600/30 transition-all duration-300 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Book Now
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* 3D Depth Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 pointer-events-none" />
              </motion.div>

              {/* Floating Elements */}
              <AnimatePresence>
                {hoveredCard === property.id && (
                  <motion.div
                    className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full shadow-lg"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
        {/* View All Properties Button */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <motion.button
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 mx-auto"
            whileHover={{
              scale: 1.05,
              boxShadow: "0 20px 40px rgba(246, 147, 27, 0.3)"
            }}
            whileTap={{ scale: 0.95 }}
          >
            View All Properties
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>

      {/* Enhanced Property Modal/Preview with Glass UI */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProperty(null)}
          >
            <motion.div
              className="relative bg-white/80 backdrop-blur-xl rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-white/30 shadow-2xl"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glass Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-amber-500/5 pointer-events-none" />

              {/* Close Button */}
              <motion.button
                className="absolute top-4 right-4 z-20 p-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-gray-700"
                onClick={() => setSelectedProperty(null)}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </motion.button>

              <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                {/* Image Gallery Side */}
                <div className="relative h-64 md:h-full bg-gradient-to-br from-gray-200 to-gray-300">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-500">Property Image Gallery</span>
                  </div>

                  {/* Image Navigation Dots */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {[0, 1].map((_, i) => (
                      <motion.div
                        key={i}
                        className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-white/50'}`}
                        whileHover={{ scale: 1.2 }}
                      />
                    ))}
                  </div>
                </div>

                {/* Content Side */}
                <div className="p-8 overflow-y-auto">
                  {/* Property Title */}
                  <motion.h3
                    className="text-3xl font-bold mb-2 text-gray-900 gilda-display"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {selectedProperty.title}
                  </motion.h3>

                  {/* Location */}
                  <motion.div
                    className="flex items-center text-gray-600 mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    {selectedProperty.location}
                  </motion.div>

                  {/* Description */}
                  <motion.p
                    className="text-gray-600 mb-6 leading-relaxed"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    {selectedProperty.description}
                  </motion.p>

                  {/* Stats */}
                  <motion.div
                    className="grid grid-cols-3 gap-4 mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="flex flex-col items-center p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-white/30">
                      <Bed className="w-5 h-5 text-amber-500 mb-1" />
                      <span className="text-sm text-gray-900 font-medium">{selectedProperty.bedrooms} Bedrooms</span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-white/30">
                      <Bath className="w-5 h-5 text-amber-500 mb-1" />
                      <span className="text-sm text-gray-900 font-medium">{selectedProperty.bathrooms} Bathrooms</span>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-white/30">
                      <Users className="w-5 h-5 text-amber-500 mb-1" />
                      <span className="text-sm text-gray-900 font-medium">Up to {selectedProperty.guests}</span>
                    </div>
                  </motion.div>

                  {/* Amenities */}
                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <h4 className="text-lg font-semibold mb-3 text-gray-900">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1 px-3 py-2 bg-white/50 backdrop-blur-sm rounded-lg text-sm text-gray-700 border border-white/30"
                        >
                          {getAmenityIcon(amenity)}
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Price and Booking */}
                  <motion.div
                    className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="text-center md:text-left">
                      <span className="block text-sm text-gray-500">Price</span>
                      <span className="text-2xl font-bold text-amber-600">{selectedProperty.price}</span>
                    </div>
                    <motion.button
                      className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                      whileHover={{
                        scale: 1.03,
                        boxShadow: "0 10px 25px rgba(246, 147, 27, 0.3)"
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Book Now
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default InteractivePropertyShowcase;