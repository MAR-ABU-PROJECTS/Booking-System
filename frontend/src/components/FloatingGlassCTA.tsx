"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

const FloatingGlassCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Show the CTA after scrolling down a bit
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 800 && !isDismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    
    // Show after a delay even without scroll
    const timer = setTimeout(() => {
      if (!isDismissed) setIsVisible(true);
    }, 5000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-8 right-8 z-50 max-w-md w-full"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/30 shadow-2xl">
            {/* Glass Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-amber-500/5 pointer-events-none" />
            
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 bg-white/50 backdrop-blur-sm rounded-full border border-white/30 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="p-6 relative z-10">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Left Side - Icon */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🏠</span>
                  </div>
                </div>
                
                {/* Right Side - Content */}
                <div className="flex-grow text-center md:text-left">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Ready to experience luxury?</h3>
                  <p className="text-gray-600 text-sm mb-3">Book your stay now and enjoy exclusive benefits and amenities.</p>
                  
                  <motion.button
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 mx-auto md:mx-0"
                    whileHover={{ 
                      scale: 1.03,
                      boxShadow: "0 10px 25px rgba(246, 147, 27, 0.3)"
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Book Now
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingGlassCTA;