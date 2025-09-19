import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
} from "@components/ui/sidebar";
import SideBarLinks from "./SidebarLinks";

export function AppSidebar() {
	
	return (
		<Sidebar>
			<SidebarHeader />
			<SidebarContent>
				<SidebarGroup />
				<SidebarGroup />
				<SidebarContent>
					<SideBarLinks />
				</SidebarContent>
			</SidebarContent>
			<SidebarFooter />
		</Sidebar>
	);
}
