"use client";

import { removeSession } from "@lib/action";
import { apiService } from "@lib/apiService";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { setUser } from "@lib/features/authSlice";
import { Loader2, LogOut } from "lucide-react";

const LogoutBtn = () => {
	const router = useRouter();
	const dispatch = useDispatch();
	const LogOutMutation = useMutation({
		mutationFn: async () => {
			return apiService.post("/auth/logout", {});
		},
		onSuccess: async (res) => {
			if (res?.success) {
				await removeSession();
				dispatch(setUser(null));
				router.push("/admin/login");
			} else {
				const message =
					(res.message as string) || "Something went wrong";
				toast.error(`${message}`, {
					closeOnClick: false,
					progress: undefined,
				});
			}
		},
		onError: (error) => {
			if (isAxiosError(error)) {
				const message =
					(error.response?.data?.message as string) ||
					"Something went wrong";
				toast.error(`${message}`, {
					closeOnClick: false,
					progress: undefined,
				});
			} else {
				console.error("Non-Axios Error:", error);
			}
		},
	});

	return (
		<div>
			<button
				title="Log Out"
				className="!cursor-pointer w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
				onClick={() => LogOutMutation.mutate()}
				disabled={LogOutMutation.isPending}
			>
				{LogOutMutation.isPending ? (
					<Loader2 className="w-5 h-5 animate-spin" />
				) : (
					<LogOut className="w-5 h-5 rotate-180" />
				)}

				<span>Log Out</span>
			</button>
		</div>
	);
};


export default LogoutBtn
