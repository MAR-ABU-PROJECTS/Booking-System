"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Search,
	Globe,
	Menu,
	User,
	X,
	Heart,
	MessageSquare,
	LogIn,
	HelpCircle,
} from "lucide-react";

const AirbnbStyleNavigation = () => {
	const pathname = usePathname();
	const [isScrolled, setIsScrolled] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isProfileOpen, setIsProfileOpen] = useState(false);

	// Handle scroll effect
	useEffect(() => {
		const handleScroll = () => {
			if (window.scrollY > 50) {
				setIsScrolled(true);
			} else {
				setIsScrolled(false);
			}
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
				isScrolled ? "bg-white shadow-md py-3" : "bg-transparent py-5"
			}`}
		>
			<div className="px-6 md:px-10 lg:px-20 mx-auto flex items-center justify-between">
				{/* Logo */}
				<Link href="/" className="flex items-center">
					<img
						src="/logo/logo.png"
						alt="MAR ABU HOMES"
						className="h-8 md:h-10"
					/>
				</Link>

				{/* Search Bar (Desktop) */}
				<div className="hidden md:flex items-center">
					<div className="bg-white rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center divide-x divide-gray-200">
						<button className="px-4 py-2 text-sm font-medium text-gray-800">
							Anywhere
						</button>
						<button className="px-4 py-2 text-sm font-medium text-gray-800">
							Any week
						</button>
						<button className="pl-4 pr-2 py-2 text-sm font-medium text-gray-500 flex items-center gap-2">
							Add guests
							<div className="p-2 bg-amber-500 rounded-full text-white">
								<Search className="w-4 h-4" />
							</div>
						</button>
					</div>
				</div>

				{/* Right Navigation */}
				<div className="flex items-center gap-1 md:gap-4">
					{/* Become a Host */}
					<Link href="/property"
						className={`hidden md:block px-4 py-2 rounded-full text-sm font-medium ${
							isScrolled
								? "text-gray-700 hover:bg-gray-100"
								: "text-white hover:bg-white/10"
						} transition-colors`}
					>
						Property
					</Link>

					{/* Language Selector */}
					<button
						className={`p-2 rounded-full ${
							isScrolled
								? "text-gray-700 hover:bg-gray-100"
								: "text-white hover:bg-white/10"
						} transition-colors`}
					>
						<Globe className="w-5 h-5" />
					</button>

					{/* Profile Menu */}
					<div className="relative">
						<button
							className="flex items-center gap-2 p-1 pl-3 border border-gray-300 rounded-full hover:shadow-md transition-shadow"
							onClick={() => setIsProfileOpen(!isProfileOpen)}
						>
							<Menu className="w-4 h-4 text-gray-700" />
							<div className="bg-gray-500 text-white rounded-full p-1">
								<User className="w-5 h-5" />
							</div>
						</button>

						{/* Profile Dropdown */}
						<AnimatePresence>
							{isProfileOpen && (
								<motion.div
									className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 10 }}
									transition={{ duration: 0.2 }}
								>
									<div className="py-2">
										<div className="font-medium border-b border-gray-100">
											<Link href="/sign-up" className="w-full block text-left px-4 py-3 hover:bg-gray-50 transition-colors">
												Sign up
											</Link>
											<Link href="/log-in" className="w-full block text-left px-4 py-3 hover:bg-gray-50 transition-colors">
												Log in
											</Link>
										</div>
										<div>
											<Link
												href="/wishlist"
												className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
											>
												<Heart className="w-5 h-5" />
												<span>Wishlist</span>
											</Link>
											<Link
												href="/messages"
												className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
											>
												<MessageSquare className="w-5 h-5" />
												<span>Messages</span>
											</Link>
											<Link
												href="/help-center"
												className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
											>
												<HelpCircle className="w-5 h-5" />
												<span>Help Center</span>
											</Link>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</div>

			{/* Mobile Search Bar */}
			<div className="md:hidden px-6 pt-4">
				<button className="w-full flex items-center gap-4 px-4 py-3 bg-white rounded-full border border-gray-200 shadow-sm">
					<Search className="w-4 h-4 text-gray-500" />
					<div className="text-left">
						<div className="text-sm font-medium text-gray-800">
							Anywhere
						</div>
						<div className="text-xs text-gray-500">
							Any week · Add guests
						</div>
					</div>
				</button>
			</div>
		</header>
	);
};

export default AirbnbStyleNavigation;
