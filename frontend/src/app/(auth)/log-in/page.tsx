import React from "react";
import type { Metadata } from "next";
import LogIn from "@/components/Login";

export const metadata: Metadata = {
	title: "MAR ABU Homes | Log In",
	description:
		"Discover luxury apartments, executive short lets, and premium buildings in Nigeria's most prestigious locations",
	keywords:
		"luxury accommodations, premium properties, short lets, Nigeria, Lagos, Abuja, Port Harcourt",
};

const page = () => {
	return (
		<>
			<LogIn />
		</>
	);
};

export default page;
