import React from "react";
import type { Metadata } from "next";
import ForgotPassword from "@components/ForgotPassword";

export const metadata: Metadata = {
	title: "MAR ABU Homes | Forgot Password",
	description:
		"Discover luxury apartments, executive short lets, and premium buildings in Nigeria's most prestigious locations",
	keywords:
		"luxury accommodations, premium properties, short lets, Nigeria, Lagos, Abuja, Port Harcourt",
};

const page = async () => {
	return (
		<>
			<ForgotPassword />
		</>
	);
};

export default page;
