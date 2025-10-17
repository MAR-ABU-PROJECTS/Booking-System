import ResetPassword from "@components/ResetPassword";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "MAR ABU Homes | Reset Password",
	description:
		"Discover luxury apartments, executive short lets, and premium buildings in Nigeria's most prestigious locations",
	keywords:
		"luxury accommodations, premium properties, short lets, Nigeria, Lagos, Abuja, Port Harcourt",
};
type SearchParams = { [key: string]: string | string[] | undefined };
const page = async ({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) => {
	const query = await searchParams;
	const token = query.token as string;
	return <ResetPassword token={token} />;
};

export default page;
