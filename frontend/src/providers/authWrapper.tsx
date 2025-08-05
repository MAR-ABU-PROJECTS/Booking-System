// components/AuthWrapper.tsx
"use client";

import { ReactNode, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../lib/features/authSlice";
import { getSessionUser } from "../lib/action";
import { RootState } from "../lib/features/store";

type Props = {
	children: ReactNode;
};

export default function AuthWrapper({ children }: Props) {
	const user = useSelector((state: RootState) => state.auth.user);
	const dispatch = useDispatch();

	async function fetchSession() {
		// const user = await getSessionUser();
		// console.log("runnung on page change")
		// if (user?.isLoggedIn) {
		// 	dispatch(setUser(user));
		// } else {
		// 	dispatch(setUser(null));
		// }
	}

	useEffect(() => {
		if (user?.isLoggedIn) return;

		fetchSession();
	}, [dispatch]);

	return <>{children}</>;
}
