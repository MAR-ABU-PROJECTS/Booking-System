"use client";

import Link from "next/link";

const Footer = () => {
  return (
    <footer className="flex flex-col bg-black py-[30px]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-[20px] px-12 justify-center items-center">
        <div className="md:col-span-2 flex flex-col gap-[5px] justify-center items-center">
          <div>
            <h1 className="text-lg font-bold text-[white]">MAR ABU HOMES</h1>
          </div>
          <div className="flex md:w-[450px]">
            <p className="text-[#667085]">
              Nigeria&apos;s premier luxury accommodation provider, offering
              exceptional short-term rentals and premium properties across the
              nation&apos;s most prestigious locations.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-[5px] justify-center items-center">
          <div>
            <p className="text-[18px] font-bold text-[white]">Properties</p>
          </div>
          <div>
            <ul className="flex flex-col gap-[5px]">
              <li className="text-[#667085]">
                <Link href={"/"}>Luxury Apartment</Link>
              </li>
              <li className="text-[#667085]">
                <Link href={"/"}>Short Lets</Link>
              </li>
              <li className="text-[#667085]">
                <Link href={"/"}>Executive Buildings</Link>
              </li>
              <li className="text-[#667085]">
                <Link href={"/"}>Serviced Apartments</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-[5px] justify-center items-center">
          <div>
            <p className="text-[18px] font-bold text-[white]">Company</p>
          </div>
          <div className="flex justify-center items-center">
            <ul className="flex flex-col gap-[5px]">
              <li className="text-[#667085]">
                <Link href={"/"}>About Us</Link>
              </li>
              <li className="text-[#667085]">
                <Link href={"/"}>Careers</Link>
              </li>
              <li className="text-[#667085]">
                <Link href={"/"}>Press</Link>
              </li>
              <li className="text-[#667085]">
                <Link href={"/"}>Partnership</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-[5px] justify-center items-center">
          <div>
            <p className="text-[18px] font-bold text-[white]">Support</p>
          </div>
          <div className="flex justify-center items-center">
            <ul className="flex flex-col gap-[5px]">
              <li className="text-[#667085]">
                <Link href={"/"}>Help Center</Link>
              </li>
              <li className="text-[#667085]">
                <Link href={"/"}>Contact Us</Link>
              </li>
              <li className="text-[#667085]">
                <Link href={"/"}>Safety</Link>
              </li>
              <li className="text-[#667085]">
                <Link href={"/"}>Terms & Privacy</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <hr className="h-px my-[30px] bg-[#667085] border-0" />
      <p className="text-[14px] text-center font-normal text-[#667085]">
        © 2024 MAR ABU PROJECTS SERVICES LTD. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
