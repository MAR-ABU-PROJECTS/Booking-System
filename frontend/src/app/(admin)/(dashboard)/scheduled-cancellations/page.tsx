import AuthGuard from "@components/AuthGuard";
import Cancellations from "@components/admin/Cancellations";

const page = () => {
	return (
		<AuthGuard>
			<Cancellations />
		</AuthGuard>
	);
};

export default page;
