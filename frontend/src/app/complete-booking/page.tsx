import AuthGuard from "@components/AuthGuard";
import CompleteBooking from "@components/CompleteBooking";

type SearchParams = { [key: string]: string | string[] | undefined };

const page = async ({ searchParams }: { searchParams: Promise<SearchParams> }) => {
	const query = await searchParams;
	const bookingId = query.id as string;
	const apartmentId = query.apartmentId as string;
	return (
		<AuthGuard>
			<CompleteBooking bookingId={bookingId} apartmentId={apartmentId} />
		</AuthGuard>
	);
};

export default page;
