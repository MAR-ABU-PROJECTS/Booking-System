"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Star, ChevronLeft, ChevronRight } from "lucide-react";
import type { Property } from "@lib/type";
import { formatCurrency } from "@lib/utils";
import Link from "next/link";
import Image from "next/image";

const PropertyCard = ({
  id,
  name,
  location,
  price,
  rating,
  images,
  isSuperhost = false,
  isNew = false,
}: Property) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const formattedPrice = formatCurrency(price);

  const placeholderImages = [
    "bg-gradient-to-br from-gray-200 to-gray-300",
    "bg-gradient-to-br from-gray-300 to-gray-400",
    "bg-gradient-to-br from-gray-400 to-gray-500",
    "bg-gradient-to-br from-gray-200 to-gray-400",
  ];

  const total = images.length || placeholderImages.length;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % total);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + total) % total);
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  return (
    <motion.div
      className="group cursor-pointer"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {/* Image Slider */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3">
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

        {/* Navigation Arrows (show on hover) */}
        <div className="absolute inset-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between px-2">
          <motion.button
            className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md !cursor-pointer"
            onClick={prevImage}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </motion.button>

          <motion.button
            className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md !cursor-pointer"
            onClick={nextImage}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </motion.button>
        </div>

        {/* Like Button */}
        <motion.button
          className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md !cursor-pointer"
          onClick={toggleLike}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Heart
            className={`w-4 h-4 ${
              isLiked ? "text-red-500 fill-red-500" : "text-gray-700"
            }`}
          />
        </motion.button>

        {/* Superhost Badge */}
        {isSuperhost && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-lg text-xs font-medium text-gray-800 flex items-center">
            <span className="mr-1">⭐</span> Superhost
          </div>
        )}

        {/* New Property Badge */}
        {isNew && (
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-amber-500 rounded-lg text-xs font-medium text-white">
            New
          </div>
        )}

        {/* Dots */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
          {total > 1 &&
            Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(i);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentImageIndex ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
        </div>
      </div>

      {/* Content */}
      <Link href={`/property/${id}`}>
        <div className="space-y-1">
          {/* Title and Rating */}
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-gray-900 line-clamp-1">{name}</h3>
            <div className="flex items-center">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 mr-1" />
              <span className="text-sm font-medium">{rating}</span>
            </div>
          </div>

          {/* Location */}
          <p className="text-sm text-gray-600">{location}</p>

          {/* Price */}
          <p className="pt-1">
            <span className="font-semibold text-gray-900">
              {formattedPrice}/
            </span>
            <span className="text-gray-600 text-sm"> night</span>
          </p>
        </div>
      </Link>
    </motion.div>
  );
};

export default PropertyCard;
