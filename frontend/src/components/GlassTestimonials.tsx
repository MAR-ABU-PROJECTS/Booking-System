"use client";
import React, { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  location: string;
  image: string;
  rating: number;
  text: string;
  property: string;
  date: string;
}

const GlassTestimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Sample testimonial data
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Sarah Johnson",
      location: "London, UK",
      image: "/testimonials/person1.jpg",
      rating: 5,
      text: "Our stay at the MAR Luxury Penthouse exceeded all expectations. The panoramic views of Lagos were breathtaking, and the attention to detail in the design and amenities was impeccable. The staff went above and beyond to ensure our comfort.",
      property: "MAR Luxury Penthouse",
      date: "March 2025"
    },
    {
      id: 2,
      name: "Michael Chen",
      location: "Singapore",
      image: "/testimonials/person2.jpg",
      rating: 5,
      text: "As a frequent business traveler to Nigeria, I've stayed in many accommodations, but MAR Executive Suites stands out for its perfect blend of luxury and functionality. The location is ideal, and the service is consistently excellent.",
      property: "MAR Executive Suites",
      date: "February 2025"
    },
    {
      id: 3,
      name: "Amara Okafor",
      location: "Lagos, Nigeria",
      image: "/testimonials/person3.jpg",
      rating: 5,
      text: "The MAR Waterfront Residences provided the perfect setting for our family vacation. The private beach access was a highlight, and the spacious layout accommodated our entire family comfortably. We'll definitely be returning!",
      property: "MAR Waterfront Residences",
      date: "January 2025"
    }
  ];

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section ref={ref} className="relative py-20 overflow-hidden bg-gradient-to-b from-white to-gray-50">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-20 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-60 right-40 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
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
            Guest Experiences
          </motion.h2>
          <motion.p 
            className="text-lg text-gray-600 font-light max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Hear what our guests have to say about their stay with MAR ABU Homes
          </motion.p>
        </motion.div>

        {/* Testimonial Carousel */}
        <div className="relative max-w-5xl mx-auto">
          {/* Large Quote Icon */}
          <motion.div 
            className="absolute -top-10 -left-10 text-amber-500/10 z-0"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Quote size={120} />
          </motion.div>

          {/* Glass Card Container */}
          <motion.div
            className="relative bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/30 shadow-2xl p-8 md:p-12"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {/* Glass Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-amber-500/5 pointer-events-none" />

            {/* Testimonial Content */}
            <div className="relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={testimonials[activeIndex].id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center"
                >
                  {/* Left Column - Person Info */}
                  <div className="flex flex-col items-center md:items-start">
                    {/* Profile Image Placeholder */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 mb-4 overflow-hidden flex items-center justify-center border-4 border-white shadow-lg">
                      <span className="text-gray-400">Photo</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{testimonials[activeIndex].name}</h3>
                    <p className="text-gray-600 mb-2">{testimonials[activeIndex].location}</p>
                    
                    {/* Rating */}
                    <div className="flex items-center mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < testimonials[activeIndex].rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    
                    {/* Property & Date */}
                    <div className="text-sm text-gray-500">
                      <p className="font-medium text-amber-600">{testimonials[activeIndex].property}</p>
                      <p>{testimonials[activeIndex].date}</p>
                    </div>
                  </div>
                  
                  {/* Right Column - Testimonial Text */}
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Quote className="absolute top-0 left-0 w-8 h-8 text-amber-500/30 -translate-x-4 -translate-y-2" />
                      <p className="text-lg md:text-xl text-gray-700 leading-relaxed italic">
                        {testimonials[activeIndex].text}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-8 right-8 flex items-center gap-2">
              <motion.button
                className="p-2 bg-white/50 backdrop-blur-sm rounded-full border border-white/30 text-gray-700 hover:bg-white/80 transition-colors"
                onClick={prevTestimonial}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              
              <div className="flex items-center gap-1 px-2">
                {testimonials.map((_, idx) => (
                  <motion.div
                    key={idx}
                    className={`w-2 h-2 rounded-full ${idx === activeIndex ? 'bg-amber-500' : 'bg-gray-300'}`}
                    whileHover={{ scale: 1.2 }}
                    onClick={() => setActiveIndex(idx)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </div>
              
              <motion.button
                className="p-2 bg-white/50 backdrop-blur-sm rounded-full border border-white/30 text-gray-700 hover:bg-white/80 transition-colors"
                onClick={nextTestimonial}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default GlassTestimonials;