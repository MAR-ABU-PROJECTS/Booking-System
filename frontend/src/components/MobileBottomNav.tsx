"use client";
import React from "react";
import { motion } from "framer-motion";
import { Search, Heart, MessageSquare, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MobileBottomNav = () => {
  const pathname = usePathname();
  
  const navItems = [
    { icon: <Search className="w-6 h-6" />, label: "Explore", href: "/" },
    { icon: <Heart className="w-6 h-6" />, label: "Wishlist", href: "/wishlist" },
    { icon: <MessageSquare className="w-6 h-6" />, label: "Messages", href: "/messages" },
    { icon: <User className="w-6 h-6" />, label: "Profile", href: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <motion.div 
        className="bg-white border-t border-gray-200 shadow-lg"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <div className="flex items-center justify-around">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href;
            
            return (
              <Link 
                key={index} 
                href={item.href}
                className="flex flex-col items-center py-3 px-2"
              >
                <div className={`mb-1 ${isActive ? 'text-amber-500' : 'text-gray-500'}`}>
                  {item.icon}
                </div>
                <span className={`text-xs ${isActive ? 'text-amber-500 font-medium' : 'text-gray-500'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div 
                    className="absolute bottom-0 w-10 h-0.5 bg-amber-500 rounded-full"
                    layoutId="bottomNavIndicator"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default MobileBottomNav;