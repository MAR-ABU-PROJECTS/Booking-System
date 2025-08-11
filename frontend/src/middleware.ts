// middleware.ts
import { NextResponse, NextRequest } from "next/server";
import { getSessionUser } from "@lib/action";

export async function middleware(request: NextRequest) {
	const { user, redirectTo } = await getSessionUser();

	if (!user?.isLoggedIn) {
		return NextResponse.redirect(
			new URL(redirectTo || "log-in", request.url)
		);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/wishlist", "/messages"],
};
