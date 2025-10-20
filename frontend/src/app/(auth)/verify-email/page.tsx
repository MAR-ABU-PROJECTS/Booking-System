import React from "react";
import type { Metadata } from "next";
import VerifyEmail from "@components/VerifyEmail";
import { getSessionUser } from "@lib/action";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
	title: "MAR ABU Homes | Verify Email",
	description:
		"Discover luxury apartments, executive short lets, and premium buildings in Nigeria's most prestigious locations",
	keywords:
		"luxury accommodations, premium properties, short lets, Nigeria, Lagos, Abuja, Port Harcourt",
};

const page = async () => {
	// const session = await getSessionUser();

	// if (!session?.user?.isLoggedIn) {
	// 	redirect("/");
	// }

	return (
		<>
			<VerifyEmail email={''} />
		</>
	);
};

export default page;
