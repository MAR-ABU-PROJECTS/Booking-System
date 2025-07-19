"use client";
import React, { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarMinus2 } from "lucide-react";

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
        <div className="bg-white/80 backdrop-blur-md border border-white/20 shadow-2xl rounded-3xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Find Your Perfect Stay
            </h2>
            <p className="text-gray-600 font-light">
              Discover luxury accommodations tailored to your preferences
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
            {/* Property Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Property</Label>
              <Select>
                <SelectTrigger className="h-12 border-gray-200 cursor-pointer focus:border-amber-500 focus:ring-amber-500/20 rounded-xl bg-white shadow-sm">
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
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Check-in</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="cursor-pointer h-12 w-full justify-between font-normal border-gray-200 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl bg-white shadow-sm hover:bg-gray-50"
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
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Check-out</Label>
              <Popover open={openSec} onOpenChange={setOpenSec}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="cursor-pointer h-12 w-full justify-between font-normal border-gray-200 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl bg-white shadow-sm hover:bg-gray-50"
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
            <div className="space-y-2 ">
              <Label className="text-sm font-medium text-gray-700">Guests</Label>
              <Select>
                <SelectTrigger className="h-12 border-gray-200 cursor-pointer focus:border-amber-500 focus:ring-amber-500/20 rounded-xl bg-white shadow-sm">
                  <SelectValue  placeholder="Number of guests" />
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
            <div className="lg:col-span-1 md:col-span-2">
              <Button className="h-12 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-0 cursor-pointer">
                Check Availability
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AvailabilitySearch;
