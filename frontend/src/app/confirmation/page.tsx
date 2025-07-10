"use client";
import Lottie from "lottie-react";
import Checks from "../../../public/animations/check.json";
const page = () => {
  return (
    <>
      <div className="flex flex-col bg-[#F1F1F1] gap-[20px]">
        <div className="flex flex-col justify-center items-center gap-[10px]">
          <div className="w-[100px] h-[100px]">
            <Lottie animationData={Checks} loop={true} />
          </div>
          <div className="flex flex-col justify-center items-center">
            <p className="text-[20px] font-bold text-[#12b76a]">
              Booking Confirmed!
            </p>
            <p className="text-[16px] text-[#667085] text-center">
              Your MAR ABU luxury experience is secured
            </p>
          </div>
          <div className="py-[3px] px-[7px] bg-[#FEF9F3] rounded-md border-1 border-[#f7d5b0]">
            <p className="text-[#F4A857] text-[18px] font-[500px]">Booking Reference: #MAR2024-001241</p>
          </div>
        </div>
        <div className="grid md:grid-cols-[60%_35%] justify-between gap-[20px] lg:gap-[40px] px-[20px] lg:px-12 py-[30px] ">
          <div className="flex flex-col w-full h-full py-[40px] px-[20px] bg-white rounded-xl border-2 border-[#f7d5b0]"></div>
        </div>
      </div>
    </>
  );
};

export default page;
