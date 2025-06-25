"use client";

import Link from "next/link";

const Footer = () => {
  return (
    <footer className="flex flex-col bg-black py-[30px]">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-[20px] px-12 justify-center items-center lg:items-start lg:justify-start">
        <div className="lg:col-span-2 flex flex-col gap-[5px] justify-center items-center lg:items-start lg:justify-start">
          <div>
            <h1 className="text-lg font-bold text-[white]">MAR ABU HOMES</h1>
          </div>
          <div className="flex lg:w-[350px] justify-center lg:justify-start items-center lg:items-start ">
            <p className="text-[#667085] text-center lg:text-start">
              Nigeria&apos;s premier luxury accommodation provider, offering
              exceptional short-term rentals and premium properties across the
              nation&apos;s most prestigious locations.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-[5px] justify-center items-center lg:items-start lg:justify-start">
          <div>
            <p className="text-[18px] font-bold text-[white]">Properties</p>
          </div>
          <div>
            <ul className="flex flex-col gap-[5px]">
              <li className="text-[#667085] text-center lg:text-start">
                <Link href={"/"}>Luxury Apartment</Link>
              </li>
              <li className="text-[#667085] text-center lg:text-start">
                <Link href={"/"}>Short Lets</Link>
              </li>
              <li className="text-[#667085] text-center lg:text-start">
                <Link href={"/"}>Executive Buildings</Link>
              </li>
              <li className="text-[#667085] text-center lg:text-start">
                <Link href={"/"}>Serviced Apartments</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-[5px] justify-center items-center lg:items-start lg:justify-start">
          <div>
            <p className="text-[18px] font-bold text-[white] text-center lg:text-start">
              Company
            </p>
          </div>
          <div className="flex">
            <ul className="flex flex-col gap-[5px] justify-center items-center lg:items-start lg:justify-start">
              <li className="text-[#667085] text-center lg:text-start">
                <Link href={"/"}>About Us</Link>
              </li>
              <li className="text-[#667085] text-center lg:text-start">
                <Link href={"/"}>Careers</Link>
              </li>
              <li className="text-[#667085] text-center lg:text-start">
                <Link href={"/"}>Press</Link>
              </li>
              <li className="text-[#667085] text-center lg:text-start">
                <Link href={"/"}>Partnership</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-[5px] justify-center items-center lg:items-start lg:justify-start">
          <div>
            <p className="text-[18px] font-bold text-[white] text-center lg:text-start">
              Support
            </p>
          </div>
          <div className="flex justify-center items-center">
            <ul className="flex flex-col gap-[5px]">
              <li className="text-[#667085] text-center lg:text-start">
                <Link href={"/"}>Help Center</Link>
              </li>
              <li className="text-[#667085] text-center lg:text-start">
                <Link href={"/"}>Contact Us</Link>
              </li>
              <li className="text-[#667085] text-center lg:text-start">
                <Link href={"/"}>Safety</Link>
              </li>
              <li className="text-[#667085] text-center lg:text-start">
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
