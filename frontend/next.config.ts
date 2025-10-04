import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withAnalyzer = withBundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
	analyzerMode: "static",
	openAnalyzer: true,
});

const nextConfig: NextConfig = {
	reactStrictMode: true,
	compiler: {
		removeConsole:
			process.env.NODE_ENV === "production"
				? { exclude: ["error"] } // keep errors, remove logs/warns
				: false,
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
        hostname: new URL(process.env.NEXT_PUBLIC_BASE_URL!).hostname,
				pathname: "/uploads/**",
			},
		],
	},
};

export default withAnalyzer(nextConfig);
