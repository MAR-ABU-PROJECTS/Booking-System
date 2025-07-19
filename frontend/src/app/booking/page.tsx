"use client";
import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import Navbar from "@/components/Navigation";
import BookingForm from "@/components/bookingComponents/BookingForm";
import BookingSummary from "@/components/bookingComponents/BookingSummary";

const Page = () => {
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
        fontSize: "16px",
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
        fontSize: "16px",
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
        fontSize: "16px",
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
        fontSize: "16px",
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
      <Navbar />
      <div className="grid md:grid-cols-[60%_35%] justify-between gap-[20px] lg:gap-[40px] px-[20px] lg:px-12 py-[30px] bg-[#F1F1F1]">
        <BookingForm
          date={date}
          setDate={setDate}
          open={open}
          setOpen={setOpen}
          secDate={secDate}
          setSecDate={setSecDate}
          openSec={openSec}
          setOpenSec={setOpenSec}
          adultCount={adultCount}
          childCount={childCount}
          handleAdultIncrement={handleAdultIncrement}
          handleAdultDecrement={handleAdultDecrement}
          handleChildIncrement={handleChildIncrement}
          handleChildDecrement={handleChildDecrement}
          fileName={fileName}
          handleFileChange={handleFileChange}
        />
        <BookingSummary adultCount={adultCount} childCount={childCount} />
      </div>
    </>
  );
};

export default Page;
