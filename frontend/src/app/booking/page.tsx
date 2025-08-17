import Booking from "@components/Booking";

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const params = await searchParams;
	const id = params.id as string;

	return <Booking propertyId={id} />;
}
