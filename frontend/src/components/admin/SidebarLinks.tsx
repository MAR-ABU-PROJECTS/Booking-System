"use client";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@components/ui/sidebar";
import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

const SideBarLinks = () => {
	const pathName = usePathname();
	const splittedPath = pathName.split("/");

	const links = useMemo(() => {
		return [
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
		];
	}, [pathName]);


	return (
		<SidebarMenu className="px-2">
			{links.map((item) => (
				<SidebarMenuItem key={item.title}>
					<SidebarMenuButton tooltip={item.title}>
						<Link href={item.href} className="w-full">
							{item.title}
						</Link>
						{/* {item.icon && <item.icon />} */}
						{/* <span>{item.title}</span> */}
					</SidebarMenuButton>
				</SidebarMenuItem>
			))}
		</SidebarMenu>
	);
};

export default SideBarLinks;
