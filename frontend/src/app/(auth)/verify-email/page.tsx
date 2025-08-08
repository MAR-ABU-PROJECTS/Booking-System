import React from "react";
import type { Metadata } from "next";
import VerifyEmail from "../../../components/VerifyEmail";

export const metadata: Metadata = {
	title: "MAR ABU Homes | Verify Email",
	description:
		"Discover luxury apartments, executive short lets, and premium buildings in Nigeria's most prestigious locations",
	keywords:
		"luxury accommodations, premium properties, short lets, Nigeria, Lagos, Abuja, Port Harcourt",
};

const page = () => {
	return (
		<>
			<VerifyEmail />
		</>
	);
};

export default page;
