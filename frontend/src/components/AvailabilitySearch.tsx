"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarMinus2, Search, MapPin, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const AvailabilitySearch = () => {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [openSec, setOpenSec] = useState(false);
  const [secDate, setSecDate] = useState<Date | undefined>(undefined);
  return (
    <>
      <div className="relative -mt-32 z-20 px-4 mx-auto max-w-7xl">
        <motion.div 
          className="bg-white/80 backdrop-blur-md border border-white/20 shadow-2xl rounded-3xl p-8 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          {/* Glass Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-amber-500/5 pointer-events-none" />
          
          {/* Decorative Elements */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 text-center mb-8">
            <motion.h2 
              className="text-2xl md:text-3xl font-bold text-gray-900 mb-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              Find Your Perfect Stay
            </motion.h2>
            <motion.p 
              className="text-gray-600 font-light"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              Discover luxury accommodations tailored to your preferences
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end relative z-10">
            {/* Property Selection */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-500" />
                Property
              </Label>
              <Select>
                <SelectTrigger className="h-12 border-gray-200 cursor-pointer focus:border-amber-500 focus:ring-amber-500/20 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white/70 transition-colors">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200 shadow-xl">
                  <SelectItem value="VI" className="py-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900">MAR Luxury Penthouse</p>
                      <p className="text-xs text-gray-500">Victoria Island, Lagos</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="Ikoyi" className="py-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900">MAR Executive Suites</p>
                      <p className="text-xs text-gray-500">Ikoyi Heights, Lagos</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="lekki" className="py-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900">MAR Waterfront Residences</p>
                      <p className="text-xs text-gray-500">Lekki Phase 1, Lagos</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="banana-island" className="py-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900">MAR Presidential Villa</p>
                      <p className="text-xs text-gray-500">Banana Island, Lagos</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="wuse" className="py-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900">MAR Corporate Towers</p>
                      <p className="text-xs text-gray-500">Wuse 2, Abuja</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="maitama" className="py-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900">MAR Garden Court</p>
                      <p className="text-xs text-gray-500">Maitama, Abuja</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="port-harcourt" className="py-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900">MAR Skyline Apartments</p>
                      <p className="text-xs text-gray-500">GRA, Port Harcourt</p>
                    </div>
                  </SelectItem>
                  <SelectItem value="asokoro" className="py-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900">MAR Heritage Mansion</p>
                      <p className="text-xs text-gray-500">Asokoro, Abuja</p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Check-in Date */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            >
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <CalendarMinus2 className="w-3 h-3 text-amber-500" />
                Check-in
              </Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="cursor-pointer h-12 w-full justify-between font-normal border-gray-200 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white/70 transition-colors"
                  >
                    <span className="text-gray-900">
                      {date ? date.toLocaleDateString() : "Select date"}
                    </span>
                    <CalendarMinus2 className="h-4 w-4 text-gray-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl border-gray-200 shadow-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      setDate(date);
                      setOpen(false);
                    }}
                    className="rounded-xl"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Check-out Date */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
            >
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <CalendarMinus2 className="w-3 h-3 text-amber-500" />
                Check-out
              </Label>
              <Popover open={openSec} onOpenChange={setOpenSec}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="cursor-pointer h-12 w-full justify-between font-normal border-gray-200 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white/70 transition-colors"
                  >
                    <span className="text-gray-900">
                      {secDate ? secDate.toLocaleDateString() : "Select date"}
                    </span>
                    <CalendarMinus2 className="h-4 w-4 text-gray-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl border-gray-200 shadow-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={secDate}
                    captionLayout="dropdown"
                    onSelect={(secDate) => {
                      setSecDate(secDate);
                      setOpenSec(false);
                    }}
                    className="rounded-xl"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Guest Selection */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-500" />
                Guests
              </Label>
              <Select>
                <SelectTrigger className="h-12 border-gray-200 cursor-pointer focus:border-amber-500 focus:ring-amber-500/20 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white/70 transition-colors">
                  <SelectValue placeholder="Number of guests" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200 shadow-xl">
                  <SelectItem value="1guest" className="py-2 cursor-pointer">1 guest</SelectItem>
                  <SelectItem value="2guest" className="py-2 cursor-pointer">2 guests</SelectItem>
                  <SelectItem value="3guest" className="py-2 cursor-pointer">3 guests</SelectItem>
                  <SelectItem value="4guest" className="py-2 cursor-pointer">4 guests</SelectItem>
                  <SelectItem value="5+guest" className="py-2 cursor-pointer">5+ guests</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <motion.div 
              className="lg:col-span-1 md:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.3 }}
            >
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button className="h-12 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-0 cursor-pointer flex items-center justify-center gap-2">
                  <Search className="w-4 h-4" />
                  Check Availability
                </Button>
              </motion.div>
              <div className="absolute -z-10 inset-0 blur-xl bg-amber-500/20 rounded-full opacity-50 w-1/3 h-1/3 mx-auto bottom-0 animate-pulse" />
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AvailabilitySearch;
