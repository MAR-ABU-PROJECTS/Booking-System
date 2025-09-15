import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { AppSidebar } from "@components/admin/app-sidebar";
import AdminGuard from "@components/admin/AdminGuard";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<AdminGuard>
			<SidebarProvider>
				<AppSidebar />
				<main>
					<SidebarTrigger />
					{children}
				</main>
			</SidebarProvider>
		</AdminGuard>
	);
}
