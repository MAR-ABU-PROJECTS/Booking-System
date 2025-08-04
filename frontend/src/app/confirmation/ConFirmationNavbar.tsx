"use client";
import { Button } from '../../components/ui/button';
import { useRouter } from 'next/navigation';
import React from 'react';

const ConFirmationNavbar = () => {
    const router = useRouter();
  return (
    <>
      <nav className="sticky top-0 left-0 z-1000 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.05)] lg:px-12 px-[20px] py-[10px] flex justify-between items-center ">
        <div className="flex items-center gap-1">
          <div className="w-[30px] h-[30px] bg-[#F4A857] rounded-md flex items-center justify-center mt-[2px]">
            <p className="text-white font-semibold text-[13px] leading-none">
              🏠
            </p>
          </div>
          <h1 className="text-lg font-bold text-gray-900 ">
            MAR ABU PROJECTS SERVICES LLC
          </h1>
        </div>
        <div className="flex gap-[20px]">
          <Button className="bg-white text-black font-[600] hover:bg-[#F4A857] cursor-pointer">
            🖨️ Print
          </Button>
          <Button onClick={() => router.push("/")} className="bg-white text-black font-[600] hover:bg-[#F4A857] cursor-pointer">
            🏠 Book Again
          </Button>
        </div>
      </nav>
    </>
  );
}

export default ConFirmationNavbar;
