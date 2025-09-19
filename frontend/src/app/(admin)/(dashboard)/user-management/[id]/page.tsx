type Props = {
	params: Promise<{ id: string }>;
};
const page = async  ({ params }: Props) => {
	const { id } = await params;
	return <></>;
};

export default page;
