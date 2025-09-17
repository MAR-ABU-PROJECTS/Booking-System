import { SidebarProvider, SidebarTrigger } from "@components/ui/sidebar";
import { AppSidebar } from "@components/admin/app-sidebar";
import AdminGuard from "@components/admin/AdminGuard";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<AdminGuard>
			<SidebarProvider>
				<AppSidebar />
				<main className="flex flex-col w-full">
					<div className="w-full">
						<SidebarTrigger />
					</div>
					<div className="px-4 md:px-6 h-full w-full">{children}</div>
				</main>
			</SidebarProvider>
		</AdminGuard>
	);
}
