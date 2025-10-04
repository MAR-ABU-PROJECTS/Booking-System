import SingleUser from "@components/admin/SingleUser";

type Props = {
	params: Promise<{ id: string }>;
};
const page = async ({ params }: Props) => {
	const { id } = await params;
	return (
		<div>
			<SingleUser id={id} />
		</div>
	);
};

export default page;
