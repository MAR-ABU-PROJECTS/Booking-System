"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, Info } from "lucide-react";

interface VirtualTourViewerProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName: string;
}

const VirtualTourViewer: React.FC<VirtualTourViewerProps> = ({
  isOpen,
  onClose,
  propertyName,
}) => {
  const [currentView, setCurrentView] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const panoramicViews = [
    {
      id: 1,
      name: "Living Room",
      description: "Spacious living area with panoramic ocean views",
      gradient: "bg-gradient-to-r from-amber-300 to-amber-500",
    },
    {
      id: 2,
      name: "Master Bedroom",
      description: "Luxurious master suite with king-size bed and en-suite bathroom",
      gradient: "bg-gradient-to-r from-blue-300 to-blue-500",
    },
    {
      id: 3,
      name: "Kitchen",
      description: "Fully equipped gourmet kitchen with premium appliances",
      gradient: "bg-gradient-to-r from-green-300 to-green-500",
    },
    {
      id: 4,
      name: "Terrace",
      description: "Private terrace with lounge area and stunning city views",
      gradient: "bg-gradient-to-r from-purple-300 to-purple-500",
    },
  ];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowLeft":
          setCurrentView((prev) => (prev - 1 + panoramicViews.length) % panoramicViews.length);
          break;
        case "ArrowRight":
          setCurrentView((prev) => (prev + 1) % panoramicViews.length);
          break;
        case "Escape":
          if (!document.fullscreenElement) {
            onClose();
          }
          break;
        case "f":
          toggleFullscreen();
          break;
        case "i":
          setShowInfo((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, panoramicViews.length]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        ref={containerRef}
      >
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          className="absolute top-4 right-16 z-10 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
        </button>

        {/* Info Toggle */}
        <button
          className="absolute top-4 right-28 z-10 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
          onClick={() => setShowInfo(!showInfo)}
        >
          <Info className="w-6 h-6" />
        </button>

        {/* Property Name */}
        <div className="absolute top-4 left-4 z-10">
          <h2 className="text-white text-xl font-bold">{propertyName}</h2>
        </div>

        {/* Panoramic View */}
        <div className="w-full h-full relative">
          <div
            className={`w-full h-full ${panoramicViews[currentView].gradient} flex items-center justify-center`}
          >
            <div className="text-center text-white">
              <h3 className="text-2xl font-bold mb-2">360° Virtual Tour</h3>
              <p className="text-lg mb-4">Move your mouse to look around</p>
              <p className="text-sm opacity-70">
                (In a real implementation, this would be an interactive 360° panorama)
              </p>
              {showInfo && (
                <div className="mt-4">
                  <h4 className="text-xl font-semibold">{panoramicViews[currentView].name}</h4>
                  <p className="text-sm">{panoramicViews[currentView].description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4">
            <button
              className="p-3 bg-black/30 backdrop-blur-sm rounded-full text-white hover:bg-black/50 transition-colors"
              onClick={() =>
                setCurrentView((currentView - 1 + panoramicViews.length) % panoramicViews.length)
              }
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              className="p-3 bg-black/30 backdrop-blur-sm rounded-full text-white hover:bg-black/50 transition-colors"
              onClick={() => setCurrentView((currentView + 1) % panoramicViews.length)}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VirtualTourViewer;
