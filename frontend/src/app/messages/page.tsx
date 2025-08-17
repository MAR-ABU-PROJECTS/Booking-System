import React from "react";
import AuthGuard from "@components/AuthGuard";
import Messages from "@components/Messages";

const page = () => {
	return (
		<AuthGuard>
			<Messages />
		</AuthGuard>
	);
};

export default page;
