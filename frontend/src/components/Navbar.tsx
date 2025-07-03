"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import classNames from "classnames";

const navItem = [
  { label: "Home", href: "/" },
  { label: "Booking", href: "/booking" },
  { label: "Property", href: "/property" },
];

const Navbar = () => {
  const pathname = usePathname();
  return (
    <>
      <nav className="sticky top-0 left-0 z-10 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.05)] px-12 py-[10px] flex justify-between items-center">
        <h1 className="text-lg font-bold text-gray-900">MAR ABU HOMES</h1>
        <div className="flex flex-row gap-4">
          {navItem.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={classNames(
                "text-gray-800 hover:text-primary transition-colors duration-200",
                pathname === href && "text-primary font-semibold"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
};

export default Navbar;

