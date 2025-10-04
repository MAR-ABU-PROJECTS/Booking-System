"use client";
import { MouseEvent, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

type Props = {
  images: string[];
};

const PropertyCarousel = ({ images }: Props) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const placeholderImages = [
    "bg-gradient-to-br from-gray-200 to-gray-300",
    "bg-gradient-to-br from-gray-300 to-gray-400",
    "bg-gradient-to-br from-gray-400 to-gray-500",
    "bg-gradient-to-br from-gray-200 to-gray-400",
  ];

  const total = images.length || placeholderImages.length;

  const nextImage = (e: MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % total);
  };

  const prevImage = (e: MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + total) % total);
  };

  return (
    <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 group no-scrollbar">
      {/* Slider Row */}
      <motion.div
        className="flex w-full h-full"
        animate={{ x: `-${currentImageIndex * 100}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
      >
        {(images.length ? images : placeholderImages).map((src, i) => (
          <div key={i} className="relative flex-shrink-0 w-full h-full">
            {images.length ? (
              <Image
                src={src}
                alt={`Property image ${i + 1}`}
                className="w-full h-full object-cover"
                fill
              />
            ) : (
              <div className={`w-full h-full ${src}`} />
            )}
          </div>
        ))}
      </motion.div>

      {/* Navigation Arrows */}
      <div className="absolute inset-0 flex items-center justify-between px-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
        <motion.button
          className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md !cursor-pointer"
          type="button"
          onClick={prevImage}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="w-4 h-4 text-gray-700" />
        </motion.button>

        <motion.button
          type="button"
          className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md !cursor-pointer"
          onClick={nextImage}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronRight className="w-4 h-4 text-gray-700" />
        </motion.button>
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
        {total > 1 &&
          Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentImageIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === currentImageIndex ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
      </div>
    </div>
  );
};

export default PropertyCarousel;
