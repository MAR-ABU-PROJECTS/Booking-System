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

const Navigation = () => {
  const pathname = usePathname();
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10 px-12 py-4 flex justify-between items-center transition-all duration-300">
        <img src="/logo/logo.png" alt="MAR ABU HOMES" />
        <div className="flex flex-row gap-4">
          {navItem.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={classNames(
                "text-gray-50 cursor-pointer transition-colors duration-200",
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

export default Navigation;

