// components/AuthWrapper.tsx
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

	async function fetchSession() {
		const user = await getSessionUser();
		console.log(user.user);
		console.log("run on page change");
		if (user?.user?.isLoggedIn) {
			console.log(user.user);
			dispatch(setUser(user.user));
		} else {
			dispatch(setUser(null));
		}
	}

	useEffect(() => {
		if (user?.isLoggedIn) return;

		fetchSession();
	}, [dispatch, user?.isLoggedIn]);

	return <>{children}</>;
}
