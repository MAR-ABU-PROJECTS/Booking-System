import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
} from "@components/ui/sidebar";
import SideBarLinks from "./SidebarLinks";
import Image from "next/image";
import LogoutBtn from "./logout";

export function AppSidebar() {
	return (
		<Sidebar>
			<SidebarHeader />
			<SidebarContent>
				<Image
					src="/logo/black-logo.png"
					alt="MAR ABU HOMES"
					height={32}
					width={135}
					className="h-8 md:h-10"
				/>
				<SidebarGroup />

				<SidebarContent className="flex justify-between flex-col">
					<SideBarLinks />
					<LogoutBtn />
				</SidebarContent>
			</SidebarContent>
			<SidebarFooter />
		</Sidebar>
	);
}
