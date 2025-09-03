"use client";
import ProfileForm from "./ProfileForm";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@lib/apiService";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import ProfileSummary from "./ProfileSummary";
import { QueryStateHandler } from "./QueryStateHandler";
import { UserProfile } from "@lib/type";
import ProfileSkeleton from "./ProfileSkeleton";

const ProfileGrid = () => {
	const getProfile = useQuery({
		queryKey: ["profile"],
		queryFn: async () => {
			try {
				const response = await apiService.get(`/users/profile`);
				return response;
			} catch (error) {
				let errorMessage = "An unexpected error occurred";
				if (isAxiosError(error)) {
					errorMessage = error.response
						? error.response.data.message
						: error.message;
				} else if (error instanceof Error) {
					errorMessage = error.message;
				}
				toast.error(errorMessage, {
					closeOnClick: true,
					progress: undefined,
				});

				throw new Error(errorMessage);
			}
		},
		retry: true,
	});

	console.log(getProfile.data)

	return (
		<div className="mt-[150px] lg:mt-[130px] px-4 mx-auto max-w-7xl mb-10">
			<h2 className="text-2xl font-bold text-gray-900 mb-5">Profile</h2>

			<QueryStateHandler
				query={getProfile}
				emptyMessage="No profile found"
				getItems={(res) => res.data}
				loadingComponent={<ProfileSkeleton />}
				render={(res) => {
					const data = res.data;
					return (
						<div className="grid grid-cols-1 sm:grid-cols-[280px_auto] gap-5 md:gap-7 lg:grid-cols-[400px_auto]">
							<ProfileSummary data={data as UserProfile} />
							<ProfileForm data={data as UserProfile} />
						</div>
					);
				}}
			/>
		</div>
	);
};

export default ProfileGrid;
