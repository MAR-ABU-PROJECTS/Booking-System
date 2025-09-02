import React from "react";
import AuthGuard from "@components/AuthGuard";
import Profile from "@components/Profile";

const page = () => {
	return (
		<AuthGuard>
			<Profile />
		</AuthGuard>
	);
};

export default page;
