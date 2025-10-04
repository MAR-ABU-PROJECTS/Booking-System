import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
} from "@components/ui/sidebar";
import SideBarLinks from "./SidebarLinks";
import Image from "next/image";

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

				<SidebarContent>
					<SideBarLinks />
				</SidebarContent>
			</SidebarContent>
			<SidebarFooter />
		</Sidebar>
	);
}
