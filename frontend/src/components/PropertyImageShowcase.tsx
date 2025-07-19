"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";

interface PropertyImage {
  id: number;
  src: string;
  alt: string;
  featured?: boolean;
  category: string;
}

const PropertyImageShowcase = () => {
  const [selectedImage, setSelectedImage] = useState<PropertyImage | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // MAR ABU HOMES property images from the provided photos
  const propertyImages: PropertyImage[] = [
    // All Spaces - Featured images
    { id: 1, src: "/images/mar-abu/game-room.jpg", alt: "Game Room with Foosball Table", featured: true, category: "all" },
    { id: 2, src: "/images/mar-abu/main-living.jpg", alt: "Main Living Area with Curved Seating", featured: true, category: "all" },
    { id: 3, src: "/images/mar-abu/dining-area.jpg", alt: "Elegant Dining Area", featured: true, category: "all" },
    { id: 4, src: "/images/mar-abu/modern-kitchen.jpg", alt: "Modern Kitchen with Purple Lighting", featured: true, category: "all" },

    // Living Areas
    { id: 5, src: "/images/mar-abu/main-living.jpg", alt: "Main Living Room with Curved Sectional", category: "living" },
    { id: 6, src: "/images/mar-abu/game-room.jpg", alt: "Entertainment Room with Game Table", category: "living" },
    { id: 7, src: "/images/mar-abu/dining-area.jpg", alt: "Dining Area with Modern Fixtures", category: "living" },
    { id: 8, src: "/images/mar-abu/pool-room.jpg", alt: "Pool Table Recreation Room", category: "living" },

    // Bedrooms
    { id: 9, src: "/images/mar-abu/game-room.jpg", alt: "Multi-purpose Room", category: "bedroom" },
    { id: 10, src: "/images/mar-abu/main-living.jpg", alt: "Open Living Space", category: "bedroom" },
    { id: 11, src: "/images/mar-abu/pool-room.jpg", alt: "Recreation Room", category: "bedroom" },
    { id: 12, src: "/images/mar-abu/dining-area.jpg", alt: "Elegant Interior Space", category: "bedroom" },

    // Bathrooms
    { id: 13, src: "/images/mar-abu/luxury-bathroom.jpg", alt: "Luxury Bathroom with Glass Shower", category: "bathroom" },
    { id: 14, src: "/images/mar-abu/main-living.jpg", alt: "Premium Interior Design", category: "bathroom" },
    { id: 15, src: "/images/mar-abu/modern-kitchen.jpg", alt: "Modern Fixtures and Lighting", category: "bathroom" },
    { id: 16, src: "/images/mar-abu/dining-area.jpg", alt: "Contemporary Design Elements", category: "bathroom" },

    // Kitchen
    { id: 17, src: "/images/mar-abu/modern-kitchen.jpg", alt: "Modern Kitchen with Purple LED Lighting", category: "kitchen" },
    { id: 18, src: "/images/mar-abu/luxury-kitchen.jpg", alt: "Luxury Kitchen with Island", category: "kitchen" },
    { id: 19, src: "/images/mar-abu/compact-kitchen.jpg", alt: "Compact Modern Kitchen", category: "kitchen" },
    { id: 20, src: "/images/mar-abu/dining-area.jpg", alt: "Kitchen and Dining Integration", category: "kitchen" },

    // Outdoor
    { id: 21, src: "/images/mar-abu/game-room.jpg", alt: "Indoor Entertainment Space", category: "outdoor" },
    { id: 22, src: "/images/mar-abu/main-living.jpg", alt: "Spacious Living Area", category: "outdoor" },
    { id: 23, src: "/images/mar-abu/pool-room.jpg", alt: "Recreation Area", category: "outdoor" },
    { id: 24, src: "/images/mar-abu/dining-area.jpg", alt: "Entertainment Dining Space", category: "outdoor" },

    // Amenities
    { id: 25, src: "/images/mar-abu/pool-room.jpg", alt: "Pool Table Recreation", category: "amenities" },
    { id: 26, src: "/images/mar-abu/game-room.jpg", alt: "Game Room with Foosball", category: "amenities" },
    { id: 27, src: "/images/mar-abu/luxury-bathroom.jpg", alt: "Spa-like Bathroom", category: "amenities" },
    { id: 28, src: "/images/mar-abu/modern-kitchen.jpg", alt: "Premium Kitchen Amenities", category: "amenities" }
  ];

  // Categories for filtering
  const categories = [
    { id: "all", name: "All Spaces" },
    { id: "living", name: "Living Areas" },
    { id: "bedroom", name: "Bedrooms" },
    { id: "bathroom", name: "Bathrooms" },
    { id: "kitchen", name: "Kitchen" },
    { id: "outdoor", name: "Outdoor" },
    { id: "amenities", name: "Amenities" }
  ];

  // Filter images based on active category and limit to 4 images per category
  const filteredImages = activeCategory === "all"
    ? propertyImages.filter(img => img.featured).slice(0, 4)
    : propertyImages.filter(img => img.category === activeCategory).slice(0, 4);

  // Featured images for the hero section
  const featuredImages = propertyImages.filter(img => img.featured);

  // Function to get specific image paths for each category from /banner/ folder
  const getImagePath = (category: string, index: number) => {
    const categoryImages = {
      "all": [
        "/banner/all-spaces.jpg", // All spaces overview
        "/banner/living-area.jpg", // Living area
        "/banner/kitchen.jpg", // Kitchen
        "/banner/bedroom.jpg"  // Bedroom
      ],
      "living": [
        "/banner/living-area.jpg", // Main living area
        "/banner/Living-Room.jpg", // Living room
        "/banner/indoor.jpg", // Indoor space
        "/banner/all-spaces.jpg"  // All spaces view
      ],
      "bedroom": [
        "/banner/bedroom.jpg", // Main bedroom
        "/banner/indoor.jpg", // Indoor bedroom space
        "/banner/living-area.jpg", // Bedroom living area
        "/banner/all-spaces.jpg"  // Bedroom in all spaces
      ],
      "bathroom": [
        "/banner/indoor.jpg", // Indoor bathroom space
        "/banner/all-spaces.jpg", // Bathroom in all spaces
        "/banner/living-area.jpg", // Bathroom area
        "/banner/amenities.jpg"  // Bathroom amenities
      ],
      "kitchen": [
        "/banner/kitchen.jpg", // Main kitchen
        "/banner/kitchen-cabinet.jpg", // Kitchen cabinets
        "/banner/indoor.jpg", // Indoor kitchen space
        "/banner/all-spaces.jpg"  // Kitchen in all spaces
      ],
      "outdoor": [
        "/banner/outdoor.jpg", // Main outdoor space
        "/banner/all-spaces.jpg", // Outdoor in all spaces
        "/banner/amenities.jpg", // Outdoor amenities
        "/banner/living-area.jpg"  // Outdoor living area
      ],
      "amenities": [
        "/banner/amenities.jpg", // Main amenities
        "/banner/outdoor.jpg", // Outdoor amenities
        "/banner/kitchen.jpg", // Kitchen amenities
        "/banner/indoor.jpg"  // Indoor amenities
      ]
    };

    return categoryImages[category as keyof typeof categoryImages]?.[index] || "/banner/indoor.jpg";
  };

  // Placeholder gradient backgrounds for demo
  const gradients = [
    "bg-gradient-to-br from-amber-100 to-amber-300",
    "bg-gradient-to-br from-blue-100 to-blue-300",
    "bg-gradient-to-br from-green-100 to-green-300",
    "bg-gradient-to-br from-purple-100 to-purple-300",
    "bg-gradient-to-br from-red-100 to-red-300",
    "bg-gradient-to-br from-gray-100 to-gray-300"
  ];

  return (
    <section className="py-12 px-4 mx-auto max-w-7xl">
      {/* Section Title */}
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Explore Our Luxury Spaces</h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Immerse yourself in the elegance and comfort of MAR ABU Homes&apos; premium accommodations
        </p>
      </div>

      {/* Featured Images Carousel */}
      <div className="mb-12">
        <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden">
          {/* Using the indoor banner image as hero */}
          <div className="w-full h-full bg-center bg-cover bg-[url('/banner/indoor.jpg')]">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <h3 className="text-2xl md:text-3xl font-bold mb-2">Luxury Living Redefined</h3>
                <p className="text-white/80 max-w-md mx-auto">
                  Experience the elegance of MAR ABU HOMES premium accommodations
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <div className="absolute inset-0 flex items-center justify-between px-4">
            <button className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md">
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md">
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Image Pagination Dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {featuredImages.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-8 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === category.id
              ? "bg-amber-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            onClick={() => setActiveCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredImages.map((image, index) => (
          <motion.div
            key={image.id}
            className="relative aspect-square rounded-xl overflow-hidden cursor-pointer"
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedImage(image)}
            layoutId={`image-${image.id}`}
          >
            {/* Using specific MAR ABU HOMES images based on category */}
            <div
              className="w-full h-full bg-center bg-cover"
              style={{ backgroundImage: `url('${getImagePath(image.category, index)}')` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-white text-sm font-medium">{image.alt}</span>
              </div>
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <button className="p-2 bg-white/80 backdrop-blur-sm rounded-full">
                <Maximize2 className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* View All Button */}
      <div className="text-center mt-10">
        <button className="px-6 py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors">
          View All Images
        </button>
      </div>

      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white"
              onClick={() => setSelectedImage(null)}
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div
              className="relative max-w-5xl max-h-[80vh] w-full"
              layoutId={`image-${selectedImage.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Full-size image from banner folder */}
              <div
                className="w-full h-[80vh] rounded-lg bg-center bg-contain bg-no-repeat"
                style={{
                  backgroundImage: `url('${getImagePath(selectedImage.category, filteredImages.findIndex(img => img.id === selectedImage.id))}')`,
                  backgroundColor: '#1a1a1a'
                }}
              >
                {/* Image title overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <h3 className="text-xl font-bold text-white mb-2">{selectedImage.alt}</h3>
                  <p className="text-white/80">MAR ABU HOMES Premium Accommodation</p>
                </div>
              </div>

              {/* Navigation Arrows */}
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4">
                <button
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
                    const prevIndex = (currentIndex - 1 + filteredImages.length) % filteredImages.length;
                    setSelectedImage(filteredImages[prevIndex]);
                  }}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
                    const nextIndex = (currentIndex + 1) % filteredImages.length;
                    setSelectedImage(filteredImages[nextIndex]);
                  }}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

export default PropertyImageShowcase;