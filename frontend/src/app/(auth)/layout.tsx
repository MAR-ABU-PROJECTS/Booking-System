import type { Metadata } from "next";
import AuthBanner from "@components/AuthBanner";

export const metadata: Metadata = {
	title: "MAR ABU Homes | Pre",
	description:
		"Discover luxury apartments, executive short lets, and premium buildings in Nigeria's most prestigious locations",
	keywords:
		"luxury accommodations, premium properties, short lets, Nigeria, Lagos, Abuja, Port Harcourt",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="w-full h-svh flex">
			<AuthBanner />
			<div className=" w-full h-full p-4 flex justify-center items-start bg-white overflow-x-hidden overflow-y-scroll">{children}</div>
		</div>
	);
}
