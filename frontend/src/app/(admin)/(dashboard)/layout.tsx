import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { AppSidebar } from "@components/admin/app-sidebar";
import AdminGuard from "@components/admin/AdminGuard";
import Navbar from "@components/admin/Navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<AdminGuard>
			<SidebarProvider>
				<AppSidebar />
				<main className="flex flex-col w-full">
					<Navbar />
					<div className="px-4 md:px-6 h-full w-full pt-6">{children}</div>
				</main>
			</SidebarProvider>
		</AdminGuard>
	);
}
