/* eslint-disable react-hooks/rules-of-hooks */
"use client"
import {useState} from "react";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { CalendarMinus2, CalendarRange, CreditCard, FileText, MessageSquareMore, Minus, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

const page = () => {
   const [open, setOpen] = useState(false);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [openSec, setOpenSec] = useState(false);
    const [secDate, setSecDate] = useState<Date | undefined>(undefined);

    const [fileName, setFileName] = useState("No file chosen");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setFileName(file ? file.name : "");
    };
  return (
    <>
      <div className="grid grid-cols-[60%_40%] gap-[20px] px-12 py-[30px] bg-[#F1F1F1]">
        <div className="flex flex-col w-full h-full p-[20px] bg-white rounded-xl border-2 border-[#F4A857]">
          <div className="flex flex-col justify-center items-center">
            <h1 className="text-[20px] font-bold">Complete Your MAR Booking</h1>
            <p className="text-[16px] text-[#667085]">
              Secure your premium accommodation experience
            </p>
          </div>
          <hr className="h-px my-[20px] bg-[#F4A857] border-0" />
          <div className="flex flex-col gap-[20px]">
            <div className="flex flex-col gap-[5px]">
              <div className="flex gap-[5px] items-center">
                <div className="p-[3px] bg-[#FEF9F3] rounded-md">
                  <CalendarRange size={"18px"} />
                </div>
                <p className="text-[18px] font-semibold">Booking Details</p>
              </div>
              <div className="flex flex-col gap-[20px]">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
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
                          className="w-[350px] justify-between font-normal border-[#F4A857]"
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
                          className="w-[350px] justify-between font-normal border-[#F4A857]"
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
                <div className="flex flex-col gap-[10px] bg-[#FEF9F3] w-full h-full p-[10px] rounded-xl border-2 border-[#F4A857]">
                  <p className="text-[16px] font-bold capitalize">
                    Number of guest
                  </p>
                  <div className="flex justify-between items-center gap-[20px]">
                    <div className="flex bg-white w-full h-full p-[10px] rounded-xl border-1 border-[#F4A857] justify-between items-center gap-[10px]">
                      <div className="flex flex-col">
                        <p className="text-[16px] font-bold">Adults</p>
                        <p className="text-[14px] text-[#667085]">Age 18+</p>
                      </div>
                      <div className="flex justify-center items-center gap-[15px]">
                        <div className="p-[3px] rounded-lg bg-[#F4A857] cursor-pointer">
                          <Minus color="#FFF" />
                        </div>
                        <p className="text-[16px] font-bold">2</p>
                        <div className="p-[3px] rounded-lg bg-[#F4A857] cursor-pointer">
                          <Plus color="#FFF" />
                        </div>
                      </div>
                    </div>
                    <div className="flex bg-white w-full h-full p-[10px] rounded-xl border-1 border-[#F4A857] justify-between items-center gap-[10px]">
                      <div className="flex flex-col">
                        <p className="text-[16px] font-bold">Children</p>
                        <p className="text-[14px] text-[#667085]">Age 0 - 17</p>
                      </div>
                      <div className="flex justify-center items-center gap-[15px]">
                        <div className="p-[3px] rounded-lg bg-[#F4A857] cursor-pointer">
                          <Minus color="#FFF" />
                        </div>
                        <p className="text-[16px] font-bold">0</p>
                        <div className="p-[3px] rounded-lg bg-[#F4A857] cursor-pointer">
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
                    />
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1">
                    <Label>
                      Number<span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="number"
                      id="number"
                      placeholder="+234 xxx xxxx xxx"
                    />
                  </div>
                </div>
                <div className="flex flex-col w-full gap-1">
                  <Label>Address</Label>
                  <Textarea placeholder="Complete Address for billing purpose" />
                </div>
                <div className="flex justify-between items-center gap-[20px]">
                  <div className="grid w-full max-w-sm items-center gap-1">
                    <Label>
                      ID Type<span className="text-red-600">*</span>
                    </Label>
                    <Select>
                      <SelectTrigger className="w-[full]">
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
                          <SelectItem value="drivers-license">
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
                    />
                  </div>
                </div>
                <div className="flex flex-col w-full gap-1">
                  <Label>Emergency Contact</Label>
                  <Textarea placeholder="Emergency contact and phone number" />
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
                    <SelectTrigger className="w-full">
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
                    className="h-[150px] w-full bg-[#fef9f3] flex flex-col justify-center items-center mx-auto border-2 border-[#F4A857] border-dashed cursor-pointer rounded-xl"
                  >
                    <div>
                      <FileText />
                    </div>
                    <p className="font-medium text-center">
                      Click or drag file to upload
                    </p>
                    <p className="text-[12px] text-[#667085]">
                      Supported formats: JPG, PNG, PDF (Max 5MB){" "}
                    </p>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <p className="text-[12px] text-[#667085]">{fileName}</p>
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
                  <Textarea placeholder="Any special requests, dietary requirement, accessibility needs or comments..." />
                </div>
                <div className="flex justify-between items-center gap-[20px]">
                  <div className="grid w-full max-w-sm items-center gap-1">
                    <Label htmlFor="time-picker">
                      Number<span className="text-red-600">*</span>
                    </Label>
                    <Input
                      type="time"
                      id="time-picker"
                      defaultValue={"Pick Time"}
                      className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1">
                    <Label>
                      Email Address<span className="text-red-600">*</span>
                    </Label>
                    <Select>
                      <SelectTrigger className="w-[full]">
                        <SelectValue placeholder="Select Purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="passport">Business</SelectItem>
                          <SelectItem value="drivers-license">
                            Leisure
                          </SelectItem>
                          <SelectItem value="drivers-license">
                            Family Visit
                          </SelectItem>
                          <SelectItem value="drivers-license">
                            Conference/Event
                          </SelectItem>
                          <SelectItem value="drivers-license">
                            Other
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>days</div>
      </div>
    </>
  );
};

export default page;
