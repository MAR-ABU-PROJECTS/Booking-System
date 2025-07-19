"use client";
import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const Header = () => {
  const { scrollY } = useScroll();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Parallax transforms
  const y1 = useTransform(scrollY, [0, 300], [0, -50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -100]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  const homeCard = [
    {
      no: 500,
      desc: "Premium Properties",
      icon: "🏢"
    },
    {
      no: "15,000",
      desc: "Satisfied Guests",
      icon: "⭐"
    },
    {
      no: 25,
      desc: "Prime Locations",
      icon: "📍"
    },
    {
      no: "99%",
      desc: "Guest Satisfaction",
      icon: "💎"
    },
  ];

  // Mouse tracking for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      <section className="relative min-h-screen overflow-hidden">
        {/* Dynamic Background Layers */}
        <motion.div 
          className="absolute inset-0 bg-center bg-no-repeat bg-[url('/banner/indoor.jpg')] bg-cover"
          style={{ y: y1 }}
        />
        
        {/* Interactive Gradient Overlay */}
        <motion.div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
              rgba(246, 147, 27, 0.15) 0%, 
              rgba(0, 0, 0, 0.7) 40%, 
              rgba(0, 0, 0, 0.9) 100%)`,
            opacity
          }}
        />
        
        {/* Floating Glass Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-white/10 to-amber-500/20 backdrop-blur-sm border border-white/20"
              initial={{ 
                x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : Math.random() * 1200,
                y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : Math.random() * 800,
                scale: 0
              }}
              animate={{ 
                x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : Math.random() * 1200,
                y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : Math.random() * 800,
                scale: [0, 1, 0.8, 1],
                rotate: 360
              }}
              transition={{ 
                duration: 20 + i * 5,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                left: `${10 + i * 15}%`,
                top: `${20 + i * 10}%`,
              }}
            />
          ))}
        </div>

        {/* Content container */}
        <motion.div 
          className="relative z-10 px-4 mx-auto max-w-7xl text-center py-20"
          style={{ y: y2 }}
        >
          {/* Main heading */}
          <div className="flex flex-col items-center pt-5">
            <motion.h1 
              className="text-white text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-tight mb-6 gilda-display"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
              <motion.span
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                Premium Accommodations
              </motion.span>
              <motion.span 
                className="block bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                Across Nigeria
              </motion.span>
            </motion.h1>

            <motion.p 
              className="text-white/90 text-base md:text-lg lg:text-xl font-light max-w-3xl mx-auto mb-8 md:mb-12 lg:mb-16 leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
              Discover luxury apartments, executive short lets, and premium
              buildings in Nigeria's most prestigious locations
            </motion.p>

            {/* Enhanced Stats with Glass Morphism */}
            <motion.div 
              className="w-full"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.1 }}
            >
              <div className="relative">
                {/* Glass Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-white/20 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl" />
                
                {/* Stats Grid - Reduced Height & No Interactions */}
                <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 py-4 md:py-5 px-6 md:px-8 max-w-4xl mx-auto">
                  {homeCard.map((card, index) => (
                    <motion.div
                      key={index}
                      className="flex flex-col justify-center items-center"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 1.3 + index * 0.1 }}
                    >
                      {/* Icon */}
                      <div className="text-lg mb-1">
                        {card.icon}
                      </div>
                      
                      {/* Number */}
                      <motion.h3 
                        className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 1.5 + index * 0.1 }}
                      >
                        {card.no}+
                      </motion.h3>
                      
                      {/* Description */}
                      <p className="text-xs md:text-sm font-medium text-white/80 text-center">
                        {card.desc}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Floating CTA Button */}
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.8 }}
            >
              <motion.button
                className="relative px-8 py-4 bg-gradient-to-r from-amber-500/20 to-amber-600/20 backdrop-blur-xl border border-amber-500/30 rounded-2xl text-white font-medium hover:from-amber-500/30 hover:to-amber-600/30 transition-all duration-300 shadow-lg hover:shadow-amber-500/25"
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 20px 40px rgba(246, 147, 27, 0.3)"
                }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10">Explore Properties</span>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl opacity-0 hover:opacity-20 transition-opacity duration-300" />
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </>
  );
};

export default Header;
