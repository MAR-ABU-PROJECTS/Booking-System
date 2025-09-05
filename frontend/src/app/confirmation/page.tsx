import ConfirmationPage from "@components/ConfirmationPage";

type Props = {
	searchParams: {
		[key: string]: string | string[] | undefined;
	};
};

const Page = async ({ searchParams }: Props) => {
	const query = await searchParams;
	const bookingId = query?.bookingId as string;

	return <ConfirmationPage bookingId={bookingId} />;
};

export default Page;
