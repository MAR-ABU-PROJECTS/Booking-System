"use client";
import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Shield, Clock, Award, Star, Sparkles } from "lucide-react";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const GlassFeatureHighlights = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const features: Feature[] = [
    {
      icon: <Shield className="w-6 h-6 text-amber-500" />,
      title: "Secure Booking",
      description: "Advanced encryption and secure payment processing for worry-free reservations"
    },
    {
      icon: <Clock className="w-6 h-6 text-amber-500" />,
      title: "24/7 Support",
      description: "Round-the-clock customer service to assist with any inquiries or needs"
    },
    {
      icon: <Award className="w-6 h-6 text-amber-500" />,
      title: "Premium Locations",
      description: "Handpicked properties in Nigeria's most prestigious neighborhoods"
    },
    {
      icon: <Star className="w-6 h-6 text-amber-500" />,
      title: "Luxury Amenities",
      description: "World-class facilities and services for an unparalleled stay experience"
    }
  ];

  return (
    <section ref={ref} className="relative py-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 px-4 mx-auto max-w-7xl">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="inline-block mb-4"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="p-3 bg-amber-500/10 backdrop-blur-sm rounded-2xl">
              <Sparkles className="w-8 h-8 text-amber-500" />
            </div>
          </motion.div>
          
          <motion.h2 
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 gilda-display"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Why Choose MAR ABU Homes
          </motion.h2>
          
          <motion.p 
            className="text-lg text-gray-600 font-light max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Experience the perfect blend of luxury, comfort, and convenience
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="relative"
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
            >
              {/* Glass Card */}
              <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/30 shadow-xl p-6 h-full hover:shadow-2xl transition-shadow duration-300 group">
                {/* Glass Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-amber-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Icon */}
                <motion.div 
                  className="p-3 bg-amber-500/10 backdrop-blur-sm rounded-xl inline-flex mb-4"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {feature.icon}
                </motion.div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
                
                {/* Decorative Element */}
                <div className="absolute bottom-0 right-0 w-16 h-16 bg-amber-500/5 rounded-tl-full" />
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Bottom CTA */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          <motion.a
            href="#properties"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500/20 to-amber-600/20 backdrop-blur-xl border border-amber-500/30 rounded-xl text-amber-700 font-medium hover:from-amber-500/30 hover:to-amber-600/30 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Explore Our Properties
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default GlassFeatureHighlights;