"use client";
import { apiService } from "@lib/apiService";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect } from "react";
import { toast } from "react-toastify";

type Props = {
	id: string;
};
const SingleUser = ({ id }: Props) => {
	const getUser = useQuery({
		queryKey: ["user", id],
		queryFn: async () => {
			const response = await apiService.get(`/admin/users/${id}`);
			return response;
		},
	});

	useEffect(() => {
		if (getUser.error) {
			const err = getUser.error;
			if (isAxiosError(err)) {
				toast.error(
					err.response?.data?.message || "An error occurred",
					{ progress: undefined }
				);
			} else {
				toast.error("Unexpected error", { progress: undefined });
			}
		}
	}, [getUser.error]);


  console.log(getUser.data)

	return <div></div>;
};

export default SingleUser;
