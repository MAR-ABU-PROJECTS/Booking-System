import VerifyEmailId from "@components/VerifyEmailID";

type Props = {
	params: Promise<{ id: string }>;
};

const page = async ({ params }: Props) => {
	const { id } = await params;
	return (
		<>
			<VerifyEmailId id={id} />
		</>
	);
};

export default page;
