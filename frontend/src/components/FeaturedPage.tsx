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

const FeaturedPage = () => {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [openSec, setOpenSec] = useState(false);
  const [secDate, setSecDate] = useState<Date | undefined>(undefined);
  return (
    <>
      <div className="flex max-w-screen bg-white py-[60px] justify-center items-center gap-[20px]">
        <div className="border-2 border-[#F4A857] py-[20px] px-[25px] rounded-2xl shadow-2xl">
          <div className="flex flex-col gap-[20px] items-center py-[10px]">
            <p className="text-[24px] font-bold">Find Your Perfect Stay</p>
            <div className="flex xl:flex-row flex-col gap-[20px]">
              <div className="flex flex-col gap-1">
                <Label className="px-1">Property</Label>
                <Select>
                  <SelectTrigger
                    className="text-[14px] lg:w-[200px] w-[150px] font-medium text-black  focus:outline-none 
               focus:ring-2 focus:ring-[#F4A857] 
               focus:border-[#F4A857] border-[#F4A857]"
                  >
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VI">
                      <div>
                        <p className="text-[16px] text-black font-semibold">
                          MAR Luxury Penthouse - Victoria Island
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="Ikoyi">
                      <div>
                        <p className="text-[16px] text-black font-semibold">
                          MAR Executive Suites - Ikoyi Heights
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="lekki">
                      <div>
                        <p className="text-[16px] text-black font-semibold">
                          MAR Waterfront Residences - Lekki Phase 1
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="banana-island">
                      <div>
                        <p className="text-[16px] text-black font-semibold">
                          MAR Presidential Villa - Banana Island
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="wuse">
                      <div>
                        <p className="text-[16px] text-black font-semibold">
                          MAR Corporate Towers - Wuse 2, Abuja
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="maitama">
                      <div>
                        <p className="text-[16px] text-black font-semibold">
                          MAR Garden Court - Maitama, Abuja
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="port-harcourt">
                      <div>
                        <p className="text-[16px] text-black font-semibold">
                          MAR Skyline Apartments - GRA, Port Harcourt
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="asokoro">
                      <div>
                        <p className="text-[16px] text-black font-semibold">
                          MAR Heritage Mansion - Asokoro, Abuja
                        </p>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="date" className="px-1 text-black ">
                  Check- In
                </Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="date"
                      className="w-48 justify-between font-normal border-[#F4A857]"
                    >
                      {date ? date.toLocaleDateString() : "Select date"}
                      <CalendarMinus2 />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={date}
                      captionLayout="dropdown"
                      onSelect={(date) => {
                        setDate(date);
                        setOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="date" className="px-1 text-black ">
                  Check-Out
                </Label>
                <Popover open={openSec} onOpenChange={setOpenSec}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="date"
                      className="w-48 justify-between font-normal border-[#F4A857]"
                    >
                      {secDate ? secDate.toLocaleDateString() : "Select date"}
                      <CalendarMinus2 />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={secDate}
                      captionLayout="dropdown"
                      onSelect={(secDate) => {
                        setSecDate(secDate);
                        setOpenSec(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="px-1">Guest</Label>
                <Select>
                  <SelectTrigger
                    className="lg:w-[200px] w-[150px] text-[14px] font-medium text-black 
               focus:outline-none 
               focus:ring-2 focus:ring-[#F4A857] 
               focus:border-[#F4A857] border-[#F4A857]"
                  >
                    <SelectValue placeholder="No Of Guest" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1guest">1 guest</SelectItem>
                    <SelectItem value="2guest">2 guest</SelectItem>
                    <SelectItem value="3guest">3 guest</SelectItem>
                    <SelectItem value="4+guest">4+ guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col mt-[15px]">
                <Button className="font-medium text-white bg-black cursor-pointer">
                  Check Availability
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FeaturedPage;
