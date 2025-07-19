"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Calendar, Users, X } from "lucide-react";

const AirbnbStyleSearch = () => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("");
  
  const handleTabClick = (tab: string) => {
    setActiveTab(activeTab === tab ? null : tab);
  };
  
  const handleClose = () => {
    setActiveTab(null);
  };
  
  // MAR ABU HOMES current apartments
  const marAbuApartments = [
    {
      name: "WHITE-STONE",
      location: "Victoria Island, Lagos",
      type: "Luxury Apartment",
      price: "₦85,000/night"
    },
    {
      name: "ABIKE PENTHOUSE",
      location: "Ikoyi, Lagos", 
      type: "Premium Penthouse",
      price: "₦120,000/night"
    },
    {
      name: "OBUDU VILLA",
      location: "Lekki Phase 1, Lagos",
      type: "Executive Villa",
      price: "₦95,000/night"
    },
    {
      name: "ZIRCON",
      location: "Banana Island, Lagos",
      type: "Luxury Suite",
      price: "₦110,000/night"
    }
  ];

  return (
    <div className="relative z-20 px-4 mx-auto max-w-7xl -mt-24">
      <motion.div 
        className="bg-white rounded-full shadow-xl border border-gray-100 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Main Search Bar */}
        <div className="flex flex-col md:flex-row">
          {/* Where */}
          <div 
            className={`relative flex-1 border-b md:border-b-0 md:border-r border-gray-200 ${activeTab === 'where' ? 'bg-gray-50' : ''}`}
            onClick={() => handleTabClick('where')}
          >
            <div className="px-6 py-4 cursor-pointer">
              <div className="text-xs font-bold text-gray-900 mb-1">Where</div>
              <div className="text-sm text-gray-500">
                {location || "Search destinations"}
              </div>
            </div>
          </div>
          
          {/* Check-in */}
          <div 
            className={`relative flex-1 border-b md:border-b-0 md:border-r border-gray-200 ${activeTab === 'checkin' ? 'bg-gray-50' : ''}`}
            onClick={() => handleTabClick('checkin')}
          >
            <div className="px-6 py-4 cursor-pointer">
              <div className="text-xs font-bold text-gray-900 mb-1">Check in</div>
              <div className="text-sm text-gray-500">
                {checkIn || "Add dates"}
              </div>
            </div>
          </div>
          
          {/* Check-out */}
          <div 
            className={`relative flex-1 border-b md:border-b-0 md:border-r border-gray-200 ${activeTab === 'checkout' ? 'bg-gray-50' : ''}`}
            onClick={() => handleTabClick('checkout')}
          >
            <div className="px-6 py-4 cursor-pointer">
              <div className="text-xs font-bold text-gray-900 mb-1">Check out</div>
              <div className="text-sm text-gray-500">
                {checkOut || "Add dates"}
              </div>
            </div>
          </div>
          
          {/* Who */}
          <div 
            className={`relative flex-1 flex items-center ${activeTab === 'who' ? 'bg-gray-50' : ''}`}
            onClick={() => handleTabClick('who')}
          >
            <div className="px-6 py-4 flex-grow cursor-pointer">
              <div className="text-xs font-bold text-gray-900 mb-1">Who</div>
              <div className="text-sm text-gray-500">
                {guests || "Add guests"}
              </div>
            </div>
            
            <div className="pr-2">
              <button className="p-3 bg-amber-500 rounded-full text-white hover:bg-amber-600 transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Expanded Search Panels */}
        <AnimatePresence>
          {activeTab && (
            <motion.div
              className="absolute left-0 right-0 bg-white shadow-2xl rounded-3xl mt-2 border border-gray-200 overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Close Button */}
              <button 
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100"
                onClick={handleClose}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
              
              {/* Where Panel */}
              {activeTab === 'where' && (
                <div className="p-4">
                  <h3 className="text-base font-semibold mb-3">Choose Your Apartment</h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {marAbuApartments.map((apartment, index) => (
                      <button
                        key={index}
                        className="flex items-center gap-2 p-2 border border-gray-100 rounded-lg hover:bg-amber-50 hover:border-amber-200 text-left transition-all duration-200"
                        onClick={() => {
                          setLocation(apartment.name);
                          setActiveTab('checkin');
                        }}
                      >
                        <div className="w-6 h-6 bg-amber-100 rounded-md flex items-center justify-center flex-shrink-0">
                          <span className="text-amber-600 font-medium text-xs">
                            {apartment.name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 text-xs truncate">{apartment.name}</div>
                          <div className="text-xs text-gray-500 truncate">{apartment.location.split(',')[0]}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Check-in Panel */}
              {activeTab === 'checkin' && (
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-4">When's your trip?</h3>
                  <div className="bg-gray-100 p-4 rounded-lg text-center mb-4">
                    <p className="text-sm text-gray-600">Calendar placeholder</p>
                    <p className="text-xs text-gray-500 mt-2">Select check-in date</p>
                  </div>
                  <div className="flex gap-2">
                    {["Jul 20", "Jul 21", "Jul 22", "Jul 23", "Jul 24"].map((date, index) => (
                      <button
                        key={index}
                        className="flex-1 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
                        onClick={() => {
                          setCheckIn(date);
                          setActiveTab('checkout');
                        }}
                      >
                        <span className="block text-xs text-gray-500">Fri</span>
                        <span className="block text-sm font-medium">{date.split(" ")[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Check-out Panel */}
              {activeTab === 'checkout' && (
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-4">When will you leave?</h3>
                  <div className="bg-gray-100 p-4 rounded-lg text-center mb-4">
                    <p className="text-sm text-gray-600">Calendar placeholder</p>
                    <p className="text-xs text-gray-500 mt-2">Select check-out date</p>
                  </div>
                  <div className="flex gap-2">
                    {["Jul 25", "Jul 26", "Jul 27", "Jul 28", "Jul 29"].map((date, index) => (
                      <button
                        key={index}
                        className="flex-1 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
                        onClick={() => {
                          setCheckOut(date);
                          setActiveTab('who');
                        }}
                      >
                        <span className="block text-xs text-gray-500">Mon</span>
                        <span className="block text-sm font-medium">{date.split(" ")[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Who Panel */}
              {activeTab === 'who' && (
                <div className="p-6">
                  <h3 className="text-lg font-bold mb-4">Who's coming?</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Adults</p>
                        <p className="text-sm text-gray-500">Ages 13 or above</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">-</button>
                        <span className="w-6 text-center">1</span>
                        <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">+</button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Children</p>
                        <p className="text-sm text-gray-500">Ages 2-12</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">-</button>
                        <span className="w-6 text-center">0</span>
                        <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">+</button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Infants</p>
                        <p className="text-sm text-gray-500">Under 2</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">-</button>
                        <span className="w-6 text-center">0</span>
                        <button className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center">+</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-between items-center">
                    <button 
                      className="text-sm font-medium underline"
                      onClick={() => {
                        setGuests("");
                        handleClose();
                      }}
                    >
                      Clear
                    </button>
                    
                    <button 
                      className="px-6 py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
                      onClick={() => {
                        setGuests("1 adult");
                        handleClose();
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AirbnbStyleSearch;