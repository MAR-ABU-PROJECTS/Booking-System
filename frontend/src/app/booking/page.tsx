/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  CalendarMinus2,
  CalendarRange,
  CircleCheckBig,
  CreditCard,
  FileText,
  MapPin,
  MessageSquareMore,
  Minus,
  Plus,
  ShieldHalf,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import { toast, ToastContainer } from "react-toastify";

const page = () => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [openSec, setOpenSec] = useState(false);
  const [secDate, setSecDate] = useState<Date | undefined>(undefined);
  const [adultCount, setAdultCount] = useState(2);
  const [childCount, setChildCount] = useState(0);

  const [fileName, setFileName] = useState("No file chosen");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : "");
  };

  useEffect(() => {
    toast("Welcome to MAR ABU luxury booking experience!", {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
      style: {
        background: "#3b82f6",
        color: "#ffffff",
        fontFamily: "Sora, sans-serif",
        fontSize: "14px",
        fontWeight: "600",
        borderRadius: "8px",
        textTransform: "capitalize",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        padding: "16px",
      },
    });
  }, []);

  const handleAdultIncrement = () => {
    const newAdultCount = adultCount + 1;
    setAdultCount(newAdultCount);
    toast(`Updated Adult: ${newAdultCount}`, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
      style: {
        background: "#12B76A",
        color: "#ffffff",
        fontFamily: "Sora, sans-serif",
        fontSize: "14px",
        fontWeight: "600",
        borderRadius: "8px",
        textTransform: "capitalize",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        padding: "16px",
      },
    });
  };

  const handleAdultDecrement = () => {
    const newAdultDecrement = Math.max(0, adultCount - 1);
    setAdultCount(newAdultDecrement);
    toast(`Updated Adult: ${newAdultDecrement}`, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
      style: {
        background: "#12B76A",
        color: "#ffffff",
        fontFamily: "Sora, sans-serif",
        fontSize: "14px",
        fontWeight: "600",
        borderRadius: "8px",
        textTransform: "capitalize",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        padding: "16px",
      },
    });
  };

  const handleChildIncrement = () => {
    const newChildCount = childCount + 1;
    setChildCount(newChildCount);
    toast(`Updated children: ${newChildCount}`, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
      style: {
        background: "#12B76A",
        color: "#ffffff",
        fontFamily: "Sora, sans-serif",
        fontSize: "18px",
        fontWeight: "600",
        borderRadius: "8px",
        textTransform: "capitalize",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        padding: "16px",
      },
    });
  };

  const handleChildDecrement = () => {
    const newChildDecrement = Math.max(0, childCount - 1);
    setChildCount(newChildDecrement);
    toast(`Updated children: ${newChildDecrement}`, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
      style: {
        background: "#12B76A",
        color: "#ffffff",
        fontFamily: "Sora, sans-serif",
        fontSize: "18px",
        fontWeight: "600",
        borderRadius: "8px",
        textTransform: "capitalize",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        padding: "16px",
      },
    });
  };

  return (
    <>
      <ToastContainer />
      <div className="grid md:grid-cols-[60%_35%] justify-between gap-[20px] lg:gap-[40px] px-[20px] lg:px-12 py-[30px] bg-[#F1F1F1]">
        <div className="flex flex-col w-full h-full py-[40px] px-[20px] bg-white rounded-xl border-2 border-[#f7d5b0]">
          <div className="flex flex-col justify-center items-center">
            <h1 className="text-[20px] font-bold">Complete Your MAR Booking</h1>
            <p className="text-[16px] text-[#667085] text-center">
              Secure your premium accommodation experience
            </p>
          </div>
          <hr className="h-px my-[20px] bg-[#f7d5b0] border-0" />
          <div className="flex flex-col gap-[20px]">
            <div className="flex flex-col gap-[5px]">
              <div className="flex gap-[5px] items-center">
                <div className="p-[3px] bg-[#FEF9F3] rounded-md">
                  <CalendarRange size={"18px"} />
                </div>
                <p className="text-[18px] font-semibold">Booking Details</p>
              </div>
              <div className="flex flex-col gap-[30px]">
                <div className="flex w-full items-center gap-[10px]">
                  <div className="flex flex-col w-full gap-1">
                    <Label
                      htmlFor="date"
                      className="px-1 text-[16px] text-black "
                    >
                      Check- In
                    </Label>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id="date"
                          className="w-full justify-between font-normal border-[#f7d5b0]"
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
                  <div className="flex flex-col w-full gap-1">
                    <Label
                      htmlFor="date"
                      className="px-1 text-[16px] text-black "
                    >
                      Check-Out
                    </Label>
                    <Popover open={openSec} onOpenChange={setOpenSec}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id="date"
                          className="w-full justify-between font-normal border-[#f7d5b0]"
                        >
                          {secDate
                            ? secDate.toLocaleDateString()
                            : "Select date"}
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
                </div>
                <div className="flex flex-col gap-[10px] bg-[#FEF9F3] w-full h-full p-[10px] rounded-xl border-2 border-[#f7d5b0]">
                  <p className="text-[16px] font-bold capitalize">
                    Number of guest
                  </p>
                  <div className="flex flex-col lg:flex-row justify-between items-center gap-[20px]">
                    <div className="flex bg-white w-full h-full p-[10px] rounded-xl border-1 border-[#f7d5b0] justify-between items-center gap-[10px]">
                      <div className="flex flex-col">
                        <p className="text-[16px] font-bold">Adults</p>
                        <p className="text-[14px] text-[#667085]">Age 18+</p>
                      </div>
                      <div className="flex justify-center items-center gap-[15px]">
                        <div
                          className="p-[3px] rounded-lg bg-[#F4A857] cursor-pointer"
                          onClick={handleAdultDecrement}
                        >
                          <Minus color="#FFF" />
                        </div>
                        <p className="text-[16px] font-bold">{adultCount}</p>
                        <div
                          className="p-[3px] rounded-lg bg-[#F4A857] cursor-pointer"
                          onClick={handleAdultIncrement}
                        >
                          <Plus color="#FFF" />
                        </div>
                      </div>
                    </div>
                    <div className="flex bg-white w-full h-full p-[10px] rounded-xl border-1 border-[#f7d5b0] justify-between items-center gap-[10px]">
                      <div className="flex flex-col">
                        <p className="text-[16px] font-bold">Children</p>
                        <p className="text-[14px] text-[#667085]">Age 0 - 17</p>
                      </div>
                      <div className="flex justify-center items-center gap-[15px]">
                        <div
                          className="p-[3px] rounded-lg bg-[#F4A857] cursor-pointer"
                          onClick={handleChildDecrement}
                        >
                          <Minus color="#FFF" />
                        </div>
                        <p className="text-[16px] font-bold">{childCount}</p>
                        <div
                          className="p-[3px] rounded-lg bg-[#F4A857] cursor-pointer"
                          onClick={handleChildIncrement}
                        >
                          <Plus color="#FFF" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-[20px]">
              <div className="flex gap-[5px] items-center">
                <div className="p-[3px] bg-[#FEF9F3] rounded-md">
                  <UserRound size={"18px"} />
                </div>
                <p className="text-[18px] font-semibold">Guest Information</p>
              </div>
              <div className="flex flex-col gap-[20px]">
                <div className="flex justify-between items-center gap-[20px]">
                  <div className="grid w-full max-w-sm items-center gap-1">
                    <Label>
                      First Name<span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="firstname"
                      placeholder="Enter First Name"
                      className="border-2 border-[#f7d5b0]"
                    />
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1">
                    <Label>
                      Last Name<span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="lastname"
                      placeholder="Enter Last Name"
                      className="border-2 border-[#f7d5b0]"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center gap-[20px]">
                  <div className="grid w-full max-w-sm items-center gap-1">
                    <Label>
                      Email Address<span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      placeholder="youremail@example.com"
                      className="border-2 border-[#f7d5b0]"
                    />
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1">
                    <Label>
                      Number<span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="number"
                      id="number"
                      placeholder="+234 XXX XXXX XXX"
                      className="border-2 border-[#f7d5b0]"
                    />
                  </div>
                </div>
                <div className="flex flex-col w-full gap-1">
                  <Label>Address</Label>
                  <Input
                    type="text"
                    placeholder="Complete Address for billing purpose"
                    className="border-2 border-[#f7d5b0]"
                  />
                </div>
                <div className="flex justify-between items-center gap-[20px]">
                  <div className="grid w-full max-w-sm items-center gap-1">
                    <Label>
                      ID Type<span className="text-red-600">*</span>
                    </Label>
                    <Select>
                      <SelectTrigger className="w-[full] border-2 border-[#f7d5b0]">
                        <SelectValue placeholder="Select ID Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="nin">National ID</SelectItem>
                          <SelectItem value="passport">
                            International Passport
                          </SelectItem>
                          <SelectItem value="drivers-license">
                            Driver&lsquo;s License
                          </SelectItem>
                          <SelectItem value="voters-card">
                            Voter&lsquo;s Card
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1">
                    <Label>
                      ID Number<span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="number"
                      id="number"
                      placeholder="Enter ID Number"
                      className="border-2 border-[#f7d5b0]"
                    />
                  </div>
                </div>
                <div className="flex flex-col w-full gap-1">
                  <Label>Emergency Contact</Label>
                  <Input
                    type="text"
                    placeholder="Emergency contact and phone number"
                    className="border-2 border-[#f7d5b0]"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col w-full gap-[20px]">
              <div className="flex gap-[5px] items-center">
                <div className="p-[3px] bg-[#FEF9F3] rounded-md">
                  <CreditCard size={"18px"} />
                </div>
                <p className="text-[18px] font-semibold">Payment Information</p>
              </div>
              <div className="flex flex-col w-full gap-[20px]">
                <div className="w-full grid items-center gap-1">
                  <Label>
                    Preferred Payment Method
                    <span className="text-red-600">*</span>
                  </Label>
                  <Select>
                    <SelectTrigger className="w-full border-2 border-[#f7d5b0]">
                      <SelectValue placeholder="Select Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Select Payment Method</SelectLabel>
                        <SelectItem value="bank-transfer">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="credit-card">Credit Card</SelectItem>
                        <SelectItem value="mobile-money">
                          Mobile Money
                        </SelectItem>
                        <SelectItem value="cash-on-arrival">
                          Cash On Arrival
                        </SelectItem>
                        <SelectItem value="corporate-account">
                          Corporate Account
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full grid items-center gap-1">
                  <Label htmlFor="file-upload">Upload Payment Receipt</Label>

                  <label
                    htmlFor="file-upload"
                    className={`h-[150px] w-full flex flex-col justify-center items-center mx-auto border-2 border-dashed cursor-pointer rounded-xl
                        ${
                          fileName !== "No file chosen"
                            ? "bg-green-100 border-green-500 text-green-700"
                            : "bg-[#fef9f3] border-[#f7d5b0] text-[#667085] hover:border-[#F4A857]"
                        }`}
                  >
                    <div>
                      {fileName !== "No file chosen" ? (
                        <CircleCheckBig className="text-green-600" />
                      ) : (
                        <FileText className="text-[#F4A857]" />
                      )}
                    </div>

                    <p
                      className={`font-medium text-center ${fileName !== "No file chosen" ? "text-green-700" : ""}`}
                    >
                      {fileName !== "No file chosen"
                        ? "File uploaded successfully!"
                        : "Click or drag file to upload"}
                    </p>

                    <p className="text-[12px] text-[#667085]">
                      Supported formats: JPG, PNG, PDF (Max 5MB)
                    </p>

                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <p
                      className={`text-[12px] mt-1 ${fileName !== "No file chosen" ? "text-green-700 font-semibold" : "text-[#667085]"}`}
                    >
                      {fileName}
                    </p>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex flex-col w-full gap-[20px]">
              <div className="flex gap-[5px] items-center">
                <div className="p-[3px] bg-[#FEF9F3] rounded-md">
                  <MessageSquareMore size={"18px"} />
                </div>
                <p className="text-[18px] font-semibold">
                  Additional Information
                </p>
              </div>
              <div className="flex flex-col gap-[20px]">
                <div className="flex flex-col w-full gap-1">
                  <Label>Special Requests or Comments</Label>
                  <Textarea
                    placeholder="Any special requests, dietary requirement, accessibility needs or comments..."
                    className="border-2 border-[#f7d5b0]"
                  />
                </div>
                <div className="flex justify-between items-center gap-[20px]">
                  <div className="grid w-full max-w-sm items-center gap-1">
                    <Label htmlFor="time-picker">Estimated Arrival Time</Label>
                    <Input
                      type="time"
                      id="time-picker"
                      defaultValue={"Pick Time"}
                      className="bg-background border-2 border-[#f7d5b0] appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1">
                    <Label>Purpose of Visit</Label>
                    <Select>
                      <SelectTrigger className="w-[full] border-2 border-[#f7d5b0]">
                        <SelectValue placeholder="Select Purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="passport">Business</SelectItem>
                          <SelectItem value="leisure">Leisure</SelectItem>
                          <SelectItem value="family-visit">
                            Family Visit
                          </SelectItem>
                          <SelectItem value="event">
                            Conference/Event
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="w-full h-full p-[10px] bg-[#fef9f3] border-2 border-[#f7d5b0] rounded-xl">
                  <div className="flex items-start md:items-center gap-[10px]">
                    <Checkbox
                      id="terms"
                      className="bg-white border-1 border-black"
                    />
                    <Label
                      htmlFor="terms"
                      className="text-[12px] md:text-[14px] text-start"
                    >
                      <div>
                        I agree to the{" "}
                        <span className="text-[#F4A857] cursor-pointer hover:underline">
                          Terms and Conditions
                        </span>{" "}
                        and{" "}
                        <span className="text-[#F4A857] cursor-pointer hover:underline">
                          Privacy Policy
                        </span>{" "}
                        of MAR ABU PROJECTS SERVICES LLC *
                      </div>
                    </Label>
                  </div>
                </div>
                <div className="w-full h-full p-[10px] bg-[#fef9f3] border-2 border-[#f7d5b0] rounded-xl">
                  <div className="flex items-start md:items-center gap-[10px]">
                    <Checkbox
                      id="subscribe"
                      className="bg-white border-1 border-black"
                    />
                    <Label
                      htmlFor="subscribe"
                      className="text-[12px] md:text-[14px] capitalize"
                    >
                      <div>
                        Subscribe to our newsletter for exclusive offers and
                        premium property updates
                      </div>
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <hr className="h-px my-[10px] bg-[#f7d5b0] border-0" />
            <Button className="hover:bg-[#F4A857] py-[15px] text-[16px] items-center transition-transform duration-300 transform hover:-translate-y-1 hover:shadow-2xl">
              🔒 Complete Secure Booking
            </Button>
          </div>
        </div>
        <div className="flex flex-col w-full h-[890px] md:h-[970px] lg:h-[890px] xl:h-[870px] py-[40px] px-[20px] bg-white rounded-xl border-2 border-[#f7d5b0] static">
          <div className="flex flex-col gap-[5px]">
            <div className="flex w-full h-[200px] justify-center items-center bg-[#F4A857] rounded-xl">
              🏠
            </div>
            <div className="flex justify-center items-center">
              <p className="text-[18px] font-semibold">MAR Executive Suite</p>
            </div>
            <div className="flex justify-center items-center gap-[5px]">
              <MapPin color="red" fontSize={"10px"} />
              <p className="text-[16px] text-[#667085]">
                Victoria Island, Lagos, Nigeria
              </p>
            </div>
          </div>
          <hr className="h-px my-[20px] bg-[#fae7d1] border-0" />
          <div className="flex flex-col">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[14px] text-[#667085]">Check-in:</p>
              </div>
              <div>
                <p className="text-[14px] font-[500]">Sun, Jun 29</p>
              </div>
            </div>
            <hr className="h-px my-[10px] bg-[#fae7d1] border-0" />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[14px] text-[#667085]">Check-Out:</p>
              </div>
              <div>
                <p className="text-[14px] font-[500]">Mon, Jun 30</p>
              </div>
            </div>
            <hr className="h-px my-[10px] bg-[#fae7d1] border-0" />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[14px] text-[#667085]">Duration:</p>
              </div>
              <div>
                <p className="text-[14px] font-[500]">1 Night</p>
              </div>
            </div>
            <hr className="h-px my-[10px] bg-[#fae7d1] border-0" />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[14px] text-[#667085]">Guests:</p>
              </div>
              <div>
                <p className="text-[14px] font-[500]">
                  {adultCount} Adult{adultCount !== 1 && "s"}, {childCount}{" "}
                  Child{childCount !== 1 && "ren"}
                </p>
              </div>
            </div>
            <hr className="h-px my-[10px] bg-[#fae7d1] border-0" />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[14px] text-[#667085]">Rate per night:</p>
              </div>
              <div>
                <p className="text-[14px] font-[500]">₦195,000</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col bg-[#fae7d1] border-2 border-[#f7d5b0] py-[15px] px-[10px] rounded-xl gap-[10px] my-[15px]">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[14px] text-[#667085]">Subtotal:</p>
              </div>
              <div>
                <p className="text-[14px] font-[500]">₦195,000</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[14px] text-[#667085]">Service Fee (5%):</p>
              </div>
              <div>
                <p className="text-[14px] font-[500]">₦9,750</p>
              </div>
            </div>
            <hr className="h-px my-[10px] bg-[#F4A857] border-0" />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[16px] font-[400]">Total Amount:</p>
              </div>
              <div>
                <p className="text-[16px] text-[#F4A857] font-[600]">
                  ₦204,750
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col bg-[#e7f8f0] border-2 border-[#a6e4c8] py-[15px] px-[10px] rounded-xl gap-[10px]">
            <div className="flex gap-[10px]">
              <div className="flex w-[40px] h-[30px] p-[10px] justify-center items-center bg-[#12b76a] rounded-full">
                <ShieldHalf color="red" />
              </div>
              <div className="flex flex-col gap-[5px]">
                <p className="text-[15px] text-[#12B76A] font-[400]">
                  Secure Booking Guarantee
                </p>
                <p className="text-[12px] text-[#667085]">
                  Your personal and payment information is protected with
                  bank-grade 256-bit SSL encryption and verified by MAR ABU
                  security protocols.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default page;
