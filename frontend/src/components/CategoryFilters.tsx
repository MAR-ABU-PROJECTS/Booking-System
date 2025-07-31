"use client";
import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: string;
}

const CategoryFilters = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>("all");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Categories similar to Airbnb's horizontal filters
  const categories: Category[] = [
    { id: "all", name: "All Properties", icon: "🏠" },
    { id: "trending", name: "Trending", icon: "🔥" },
    { id: "beachfront", name: "Beachfront", icon: "🏖️" },
    { id: "luxury", name: "Luxury", icon: "💎" },
    { id: "penthouse", name: "Penthouses", icon: "🏙️" },
    { id: "villa", name: "Villas", icon: "🏛️" },
    { id: "apartment", name: "Apartments", icon: "🏢" },
    { id: "mansion", name: "Mansions", icon: "🏰" },
    { id: "pool", name: "Amazing pools", icon: "🏊" },
    { id: "view", name: "Amazing views", icon: "🌅" },
    { id: "design", name: "Design", icon: "🎨" },
    { id: "business", name: "Business", icon: "💼" }
  ];

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = 320;
      
      if (direction === "left") {
        current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  return (
    <div className="relative py-6 px-4 mx-auto max-w-7xl mt-10">
      {/* Left Scroll Button */}
      <button 
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 shadow-md hidden md:flex items-center justify-center"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>
      
      {/* Categories Scroll Container */}
      <div 
        ref={scrollContainerRef}
        className="flex items-center gap-8 md:gap-14 lg:gap-20 overflow-x-auto scrollbar-hide pb-2 px-2 md:px-10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((category) => (
          <motion.button
            key={category.id}
            className={`flex flex-col items-center min-w-[80px] px-4 py-3 rounded-xl border transition-all duration-300 ${
              activeCategory === category.id 
                ? "border-amber-500 bg-amber-50/50 backdrop-blur-sm shadow-md" 
                : "border-gray-200 bg-white/70 backdrop-blur-sm hover:bg-white/90"
            }`}
            onClick={() => setActiveCategory(category.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-2xl mb-1">{category.icon}</span>
            <span className={`text-xs font-medium whitespace-nowrap ${
              activeCategory === category.id ? "text-amber-700" : "text-gray-700"
            }`}>
              {category.name}
            </span>
          </motion.button>
        ))}
      </div>
      
      {/* Right Scroll Button */}
      <button 
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 shadow-md hidden md:flex items-center justify-center"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>
      
      {/* Add custom CSS to hide scrollbar */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default CategoryFilters;