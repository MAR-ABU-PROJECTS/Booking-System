import React from "react";
import { getSessionUser } from "@lib/action";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

type Props = {
	children: React.ReactNode;
};
const AuthGuard = async ({ children }: Props) => {
	const session = await getSessionUser();
	const headersList = await headers();
	const currentPath = headersList.get("x-current-path") || "";
	console.log({ currentPath });

	if (!session?.user?.isLoggedIn) {
		return redirect("/admin/login?redirect=");
	}

	return <>{children}</>;
};

export default AuthGuard;
