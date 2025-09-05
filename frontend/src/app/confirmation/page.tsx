import ConfirmationPage from "@components/ConfirmationPage";

type SearchParams = {
	[key: string]: string | string[] | undefined;
};

const Page = async ({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) => {
	const query = await searchParams;
	const bookingId = query?.bookingId as string;

	return <ConfirmationPage bookingId={bookingId} />;
};

export default Page;
