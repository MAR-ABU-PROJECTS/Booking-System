import AuthGuard from "@components/AuthGuard";
import AuditLogs from "@components/admin/AuditLogs";

const page = () => {
	return (
		<div>
			<AuthGuard>
				<AuditLogs />
			</AuthGuard>
		</div>
	);
};

export default page;
