"use client";
import { apiService } from "@lib/apiService";
import { useQuery } from "@tanstack/react-query";

const Cancellations = () => {
	const getCancellation = useQuery({
		queryKey: ["admin-cancellations"],
		queryFn: async () => {
			const response = await apiService.get(
				`/admin/scheduler/upcoming-cancellations`
			);
			return response;
		},
	});

	console.log(getCancellation.data);

	return <div>cancellations</div>;
};

export default Cancellations;
