"use client";

import { ReactNode, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "@lib/features/authSlice";
import { getSessionUser } from "@lib/action";
import { RootState } from "@lib/features/store";

type Props = {
	children: ReactNode;
};

export default function AuthWrapper({ children }: Props) {
	const user = useSelector((state: RootState) => state.auth.user);
	const dispatch = useDispatch();

	useEffect(() => {
		if (user?.isLoggedIn) return;

		(async () => {
			const user = await getSessionUser();
			console.log(user.user);
			console.log("run on page change");
			if (user?.user?.isLoggedIn) {
				dispatch(setUser(user.user));
			} else {
				dispatch(setUser(null));
			}
		})();
	}, [dispatch, user?.isLoggedIn]);

	return <>{children}</>;
}
