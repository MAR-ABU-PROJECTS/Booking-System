import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@components/ui/sidebar";
import SideBarLinks from "./SidebarLinks";

export function AppSidebar() {
	const links = [
		{
			name: "User Management",
			href: "/user-management",
		},
		{
			name: "Manual Payments",
			href: "/manual-payments",
		},
	];
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
