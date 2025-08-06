"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import classNames from "classnames";
import { Menu, X } from "lucide-react";
import Image from "next/image"

const navItem = [
  { label: "Home", href: "/" },
  { label: "Booking", href: "/booking" },
  { label: "Property", href: "/property" },
];

const Navigation = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10 px-4 md:px-12 py-4 flex justify-between items-center transition-all duration-300">
        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/logo/logo.png" 
            alt="MAR ABU HOMES" 
            className="h-8 md:h-10"
            height={32}
            width={130}
          />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-row gap-8">
          {navItem.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={classNames(
                "text-white hover:text-amber-400 cursor-pointer transition-colors duration-300 font-medium",
                pathname === href && "text-amber-400 font-semibold"
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden text-white hover:text-amber-400 transition-colors duration-300 p-2"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-black/95 backdrop-blur-lg border-b border-white/10 md:hidden">
            <div className="flex flex-col py-4 px-4 space-y-4">
              {navItem.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setIsMenuOpen(false)}
                  className={classNames(
                    "text-white hover:text-amber-400 cursor-pointer transition-colors duration-300 font-medium py-2 px-4 rounded-lg hover:bg-white/10",
                    pathname === href && "text-amber-400 font-semibold bg-white/5"
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navigation;

