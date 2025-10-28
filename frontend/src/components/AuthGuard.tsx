import React from "react";
import { getSessionUser } from "@lib/action";
import { redirect } from "next/navigation";

type Props = {
	children: React.ReactNode;
};
const AuthGuard = async ({ children }: Props) => {
	const session = await getSessionUser();

	if (!session?.user?.isLoggedIn) {
		return redirect("/admin/login");
	}

	return <>{children}</>;
};

export default AuthGuard;
