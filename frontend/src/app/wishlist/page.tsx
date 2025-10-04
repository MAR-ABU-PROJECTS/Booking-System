import React from "react";
import AuthGuard from "@components/AuthGuard";
import WishList from "@components/WishList";

const page = () => {
	return (
		<>
			<AuthGuard>
				<WishList />
			</AuthGuard>
		</>
	);
};

export default page;
