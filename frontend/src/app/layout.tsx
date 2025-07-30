import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import ReduxProvider from "../providers/reduxprovider";

export const metadata: Metadata = {
	title: "MAR ABU Homes | Premium Accommodations Across Nigeria",
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
		<html lang="en" className="scroll-smooth">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Gilda+Display&display=swap"
					rel="stylesheet"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..800&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body className="antialiased">
				<ReduxProvider>{children}</ReduxProvider>
			</body>
		</html>
	);
}
