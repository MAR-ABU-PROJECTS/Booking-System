"use client";

import Link from "next/link";

const Footer = () => {
  return (
    <footer className="relative bg-gradient-to-b from-gray-900 to-black">
      {/* Main Footer Content */}
      <div className="px-4 mx-auto max-w-7xl py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-white gilda-display tracking-wide">
                MAR ABU HOMES
              </h1>
              <div className="w-16 h-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"></div>
            </div>
            <p className="text-gray-300 leading-relaxed max-w-md font-light text-base">
              Nigeria's premier luxury accommodation provider, offering
              exceptional short-term rentals and premium properties across the
              nation's most prestigious locations.
            </p>
            {/* Contact Info */}
            <div className="space-y-3 text-gray-400">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm">+234 (0) 123 456 7890</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm">info@marabuhomes.com</span>
              </div>
            </div>
          </div>

          {/* Properties Column */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Properties</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Luxury Apartments
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Executive Short Lets
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Premium Buildings
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Serviced Apartments
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Corporate Housing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Partnerships
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Press & Media
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Guest Safety
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-amber-400 transition-colors duration-300 text-sm font-medium">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-gray-800">
        <div className="px-4 mx-auto max-w-7xl py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
              <p className="text-sm text-gray-400 font-light">
                © 2024 MAR ABU PROJECTS SERVICES LTD. All rights reserved.
              </p>
            </div>
            
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400 font-medium">Follow Us:</span>
              <div className="flex gap-3">
                <Link href="/" className="w-8 h-8 bg-gray-800 hover:bg-amber-600 rounded-full flex items-center justify-center transition-colors duration-300 group">
                  <span className="text-gray-400 group-hover:text-white text-sm">f</span>
                </Link>
                <Link href="/" className="w-8 h-8 bg-gray-800 hover:bg-amber-600 rounded-full flex items-center justify-center transition-colors duration-300 group">
                  <span className="text-gray-400 group-hover:text-white text-sm">t</span>
                </Link>
                <Link href="/" className="w-8 h-8 bg-gray-800 hover:bg-amber-600 rounded-full flex items-center justify-center transition-colors duration-300 group">
                  <span className="text-gray-400 group-hover:text-white text-sm">in</span>
                </Link>
                <Link href="/" className="w-8 h-8 bg-gray-800 hover:bg-amber-600 rounded-full flex items-center justify-center transition-colors duration-300 group">
                  <span className="text-gray-400 group-hover:text-white text-sm">ig</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
