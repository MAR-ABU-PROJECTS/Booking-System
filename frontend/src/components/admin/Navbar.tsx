"use client";
import { SidebarTrigger } from "@components/ui/sidebar";
import { usePathname } from "next/navigation";
import { Routes } from "./routes";

const Navbar = () => {
	const pathName = usePathname();
	const pathParts = pathName.split("/").filter(Boolean);
	const firstSegment = pathParts[0] || "dashboard";
	const secondSegment = pathParts[1] || firstSegment;

	let routeConfig = Routes[firstSegment]?.[secondSegment];

	if (!routeConfig) {
		const fallbackKey = Object.keys(Routes[firstSegment] || {}).find(
			(key) => Routes[firstSegment]?.[key]?.dynamic
		);
		if (fallbackKey) {
			routeConfig = Routes[firstSegment]?.[fallbackKey];
		}
	}

	const name = routeConfig?.name || "Page";
	const desc = routeConfig?.desc || "";
	return (
		<header className="w-full px-4 md:px-6 h-[85px] border-b-1 flex items-center justify-between">
			<div>
				<h1 className="font-semibold text-[19px] lg:text-[24px]">
					{name}
				</h1>
				<p className="text-gray-500 text-[14px] lg:text-[15px]">
					{desc}
				</p>
			</div>
			<SidebarTrigger className="block lg:hidden" />
		</header>
	);
};

export default Navbar;
