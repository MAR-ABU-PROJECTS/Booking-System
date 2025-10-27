"use client";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@components/ui/sidebar";
import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@lib/utils";

const SideBarLinks = () => {
	const pathName = usePathname();
	const splittedPath = pathName.split("/");

	const links = useMemo(() => {
		return [
			{
				title: "Dashboard",
				href: "/dashboard",
				isActive: splittedPath[1] === "dashboard",
			},
			{
				title: "Bookings",
				href: "/bookings",
				isActive: splittedPath[1] === "bookings",
			},
			{
				title: "User Management",
				href: "/user-management",
				isActive: splittedPath[1] === "user-management",
			},
			{
				title: "Manual Payments",
				href: "/manual-payments",
				isActive: splittedPath[1] === "manual-payments",
			},
			{
				title: "Properties",
				href: "/admin-properties",
				isActive: splittedPath[1] === "admin-properties",
			},
			{
				title: "Audits",
				href: "/audit-logs",
				isActive: splittedPath[1] === "audit-logs",
			},
		];
	}, [splittedPath]);

	return (
		<SidebarMenu className="px-2">
			{links.map((item) => (
				<SidebarMenuItem key={item.title}>
					<SidebarMenuButton
						tooltip={item.title}
						className={cn(
							"h-[40px] hover:bg-amber-400",
							item.isActive
								? "bg-amber-400 text-black hover:bg-amber-400"
								: "text-gray-700"
						)}
					>
						<Link
							href={item.href}
							className="w-full font-medium text-base"
						>
							{item.title}
						</Link>
					</SidebarMenuButton>
				</SidebarMenuItem>
			))}
		</SidebarMenu>
	);
};

export default SideBarLinks;
